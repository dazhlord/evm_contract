// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {IOracleAdapter, OracleAdapterSnapshot} from "./oracle/IOracleAdapter.sol";

/// @title A flexible deritivative market model
/// @author giacomo@vyperprotocol.io
/// @dev This is the abstract contract, derived contracts are payoff specific
abstract contract Market is Pausable, ReentrancyGuard, AccessControl {
    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // EVENTS

    event OfferOpened(
        uint256 indexed offerID, address sender, bool buyerSideTaken, uint256[2] requiredAmounts, uint256 settleTime
    );
    event OfferCancelled(uint256 indexed offerID, address sender);
    event OfferMatched(uint256 indexed offerID, address sender, bool buyerSideTaken);
    event OfferSettled(uint256 indexed offerID, uint256[2] claimableAmounts, uint256 collectableFees);
    event OfferClaimed(uint256 indexed offerID, address sender, uint256 amount);
    event CollectedFees(uint256 amount);

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // ERRORS

    error UnknownUser();

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // MODIFIERS

    modifier onlyWithOfferOnState(uint256 offerID, OfferState state) {
        require(tradeOffers[offerID].state == state, "offer on wrong state");
        _;
    }

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // CONSTANTS

    bytes32 public constant SECURITY_STAFF_ROLE = keccak256("SECURITY_STAFF_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");

    uint8 LONG_SIDE = 0;
    uint8 SHORT_SIDE = 1;

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // ENUMS

    // possible flows:
    // 1. Open > Cancelled
    // 2. Open > Matched > Settled
    enum OfferState {
        Open,
        Cancelled,
        Matched,
        Settled
    }

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STRUCTS

    struct TradeOffer {
        uint256[2] requiredAmounts;
        uint256[2] claimableAmounts;
        OracleAdapterSnapshot oracleSnapshotOnSettlement;
        uint256 collectableFees;
        address[2] sides;
        OfferState state;
        uint256 settleTime;
    }

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STATE

    /// @notice list of offers on this market
    TradeOffer[] public tradeOffers;

    /// @notice oracle provider
    IOracleAdapter public oracle;

    /// @notice ERC20 token used as collateral
    address public collateral;

    /// @notice coefficient used to calculate fees on settlement, used same decimals as collateral
    uint256 public feesPercentage = 0;

    /// @notice amount of collateral collectable as fees
    uint256 public collectableFees = 0;

    /// @notice threshold used to check that oracle answer is not stale, default 1d (86400s)
    uint256 public staleOracleThreshold = 86400;

    /// @notice address that receives collected fees
    address public feesReceiver;

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // METHODS

    /// @notice create a new market
    /// @dev collateral and oracle need the same decimals amount
    /// @param _collateral ERC20 token used for collateral
    /// @param _oracle oracle adapter providing the source of truth
    constructor(address _collateral, IOracleAdapter _oracle) {
        // check that collateral and oracle have the same decimals amount
        require(
            ERC20(_collateral).decimals() == _oracle.getLatestPrice().decimals,
            "collateral and oracle have different decimals"
        );

        collateral = _collateral;
        oracle = _oracle;
        feesReceiver = msg.sender;
    }

    /// @notice create a new open offer
    /// @param _longAmount amount required by the buyer
    /// @param _shortAmount amount required by the seller
    /// @param _isBuyer flag enabled if msg.sender is the buyer, false if seller
    /// @param _settleTime settle time compared with block.timestamp. offer have to be funded by both sides before this time and settle after
    /// @param _payoffData encoded payoff parameters
    function createOffer(
        uint256 _longAmount,
        uint256 _shortAmount,
        bool _isBuyer,
        uint256 _settleTime,
        bytes calldata _payoffData
    ) public whenNotPaused nonReentrant {
        require(tx.origin == msg.sender, "EOA only");

        IERC20(collateral).transferFrom(msg.sender, address(this), _isBuyer ? _longAmount : _shortAmount);

        TradeOffer memory newOffer = TradeOffer({
            requiredAmounts: [_longAmount, _shortAmount],
            claimableAmounts: [uint256(0), 0],
            collectableFees: 0,
            oracleSnapshotOnSettlement: OracleAdapterSnapshot({price: 0, decimals: 0, updatedAt: 0}),
            sides: _isBuyer ? [msg.sender, address(0)] : [address(0), msg.sender],
            state: OfferState.Open,
            settleTime: _settleTime
        });

        tradeOffers.push(newOffer);

        uint256 offerID = tradeOffers.length - 1;

        // create payoff
        _createPayoff(offerID, _payoffData);

        // emit event
        emit OfferOpened(offerID, msg.sender, _isBuyer, [_longAmount, _shortAmount], _settleTime);
    }

    /// @notice wallet cancels an owned open (single funded) offer
    /// @param _offerId the offer id to claim
    function cancelOffer(uint256 _offerId)
        public
        whenNotPaused
        nonReentrant
        onlyWithOfferOnState(_offerId, OfferState.Open)
    {
        require(tx.origin == msg.sender, "EOA only");

        TradeOffer storage offer = tradeOffers[_offerId];

        // get current user side
        uint8 userSide = _getAddressSide(offer.sides, msg.sender);

        // transfer back collateral for this offer
        IERC20(collateral).transfer(msg.sender, offer.requiredAmounts[userSide]);

        // set offer new state: "Cancelled"
        offer.state = OfferState.Cancelled;

        // emit event
        emit OfferCancelled(_offerId, msg.sender);
    }

    /// @notice EOA wallet takes the free side on an offer and deposits the required collateral
    /// @param _offerId the offer id to claim
    function matchOffer(uint256 _offerId)
        public
        whenNotPaused
        nonReentrant
        onlyWithOfferOnState(_offerId, OfferState.Open)
    {
        require(tx.origin == msg.sender, "EOA only");

        TradeOffer storage offer = tradeOffers[_offerId];

        // check if settlement is in the future
        require(block.timestamp < offer.settleTime, "this offer can only be canceled");

        // retrieve the free side
        uint8 takerSide = offer.sides[0] == address(0) ? LONG_SIDE : SHORT_SIDE;

        // set new the address side
        offer.sides[takerSide] = msg.sender;

        // transfer collateral
        IERC20(collateral).transferFrom(msg.sender, address(this), offer.requiredAmounts[takerSide]);

        // set offer new state: "Matched"
        offer.state = OfferState.Matched;

        // emit event
        emit OfferMatched(_offerId, msg.sender, takerSide == LONG_SIDE);
    }

    /// @notice settle offer using the selected payoff
    /// @param _offerId the offer id to claim
    function settleOffer(uint256 _offerId)
        public
        whenNotPaused
        nonReentrant
        onlyWithOfferOnState(_offerId, OfferState.Matched)
    {
        require(tx.origin == msg.sender, "EOA only");

        TradeOffer storage offer = tradeOffers[_offerId];

        // check if settlement is available
        require(block.timestamp > offer.settleTime, "settle not available yet");

        // read oracle price
        OracleAdapterSnapshot memory oracleSnapshot = oracle.getLatestPrice();

        // check that oracle answer is not stale
        require((block.timestamp - oracleSnapshot.updatedAt) < staleOracleThreshold, "stale oracle answer");

        uint256[2] memory payoffAmounts = _executePayoff(_offerId, oracleSnapshot, offer.requiredAmounts);

        // calculate fees
        uint256 buyerFees = payoffAmounts[0] * feesPercentage;
        uint256 sellerFees = payoffAmounts[1] * feesPercentage;
        offer.claimableAmounts = [payoffAmounts[0] - buyerFees, payoffAmounts[1] - sellerFees];
        offer.collectableFees = buyerFees + sellerFees;

        collectableFees += offer.collectableFees;

        // set offer new state: "Matched"
        offer.state = OfferState.Matched;

        // emit event
        emit OfferSettled(_offerId, offer.claimableAmounts, offer.collectableFees);
    }

    /// @notice user claims his side
    /// @param _offerId the offer id to claim
    function claimOffer(uint256 _offerId)
        public
        whenNotPaused
        nonReentrant
        onlyWithOfferOnState(_offerId, OfferState.Settled)
    {
        TradeOffer storage offer = tradeOffers[_offerId];

        // get current user side
        uint8 userSide = _getAddressSide(offer.sides, msg.sender);

        if (offer.claimableAmounts[userSide] > 0) {
            // user claims collateral
            IERC20(collateral).transfer(msg.sender, offer.claimableAmounts[userSide]);

            // emit event
            emit OfferClaimed(_offerId, msg.sender, offer.claimableAmounts[userSide]);

            // reset claimable amount
            offer.claimableAmounts[userSide] = 0;
        }
    }

    /// @notice collect all fees available
    /// @dev require FEE_COLLECTOR_ROLE role
    function collectFees() public whenNotPaused nonReentrant onlyRole(FEE_COLLECTOR_ROLE) {
        uint256 amount = collectableFees;

        // transfer fees
        IERC20(collateral).transfer(feesReceiver, amount);

        // reset collectable fees
        collectableFees = 0;

        // emit event
        emit CollectedFees(amount);
    }

    /// @notice set a new fees percentage
    /// @dev require SECURITY_STAFF role
    function setFeesPercentage(uint256 _newFeesPercentage) public nonReentrant onlyRole(SECURITY_STAFF_ROLE) {
        feesPercentage = _newFeesPercentage;
    }

    /// @notice set a new fees receiver address
    /// @dev require SECURITY_STAFF role
    function setFeesReceiver(address _newFeesReceiver) public nonReentrant onlyRole(SECURITY_STAFF_ROLE) {
        feesReceiver = _newFeesReceiver;
    }

    /// @notice set a new staleOracleThreshold
    /// @dev require SECURITY_STAFF role
    function setStaleOracleThreshold(uint256 _staleOracleThreshold) public onlyRole(SECURITY_STAFF_ROLE) {
        staleOracleThreshold = _staleOracleThreshold;
    }

    /// @notice pause market
    /// @dev require SECURITY_STAFF role
    function pause() public onlyRole(SECURITY_STAFF_ROLE) {
        _pause();
    }

    /// @notice unpause market
    /// @dev require SECURITY_STAFF role
    function unpause() public onlyRole(SECURITY_STAFF_ROLE) {
        _unpause();
    }

    function _getAddressSide(address[2] memory sides, address sender) internal view returns (uint8) {
        if (sides[0] == sender) return LONG_SIDE;
        if (sides[1] == sender) return SHORT_SIDE;

        revert UnknownUser();
    }

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // VIRTUAL METHODS

    /// @notice create payoff parameters linked to _offerId with parameter abi.encoded in _payoffData
    /// @param _offerId id of offer linked to the payoff data created
    /// @param _payoffData payoff data abi.encoded
    function _createPayoff(uint256 _offerId, bytes calldata _payoffData) public virtual;

    /// @notice execute payoff to calculate PnLs
    /// @param _offerId id of the offer
    /// @param _oracleAdapterSnapshot oracle snapshot informations
    /// @param _depositAmounts collateral deposited
    /// @return payoffAmounts collateral amounts redistributed
    function _executePayoff(
        uint256 _offerId,
        OracleAdapterSnapshot memory _oracleAdapterSnapshot,
        uint256[2] memory _depositAmounts
    ) internal virtual returns (uint256[2] memory payoffAmounts);
}
