import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { useSelectedChain } from "../hooks/useSelectedChain";

export default function ConnectWalletCard() {
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();

  const { setSelectedChainID } = useAppStore();
  const chainMetadata = useSelectedChain();

  useEffect(() => {
    try {
      if (connector)
        connector.getChainId().then((chainID) => {
          setSelectedChainID(chainID);
        });
    } catch (error) {
      console.error(error);
    }
  }, [connector, setSelectedChainID]);

  if (isConnected) {
    return (
      <div>
        <p>
          WALLET CONNECTED
          <br />
          Address: {address}
          <br />
          Connected via {connector?.name} ({connector?.id}) to chainID: {chainMetadata?.chainID} (
          {chainMetadata?.description})
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
