import { useAccount, useConnect, useDisconnect } from "wagmi";
import ReactJsonView from "react-json-view";
import { useEffect, useState } from "react";

export default function ConnectWalletCard() {
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();

  const [connectedChainID, setConnectedChainID] = useState(0);
  useEffect(() => {
    if (connector)
      connector.getChainId().then((chainID) => {
        setConnectedChainID(chainID);
      });
  }, [connector]);

  if (isConnected) {
    return (
      <div>
        <p>
          WALLET CONNECTED
          <br />
          Address: {address}
          <br />
          Connected via {connector?.name} to chainID: {connectedChainID}
        </p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button disabled={!connector.ready} key={connector.id} onClick={() => connect({ connector })}>
          {connector.name}
          {!connector.ready && " (unsupported)"}
          {isLoading && connector.id === pendingConnector?.id && " (connecting)"}
        </button>
      ))}

      {error && <div>{error.message}</div>}
    </div>
  );
}
