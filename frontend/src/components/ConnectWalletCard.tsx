import { Button, Typography } from "@mui/material";
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
        <Typography>WALLET CONNECTED</Typography>
        <Typography>Address: {address}</Typography>
        <Typography>
          Connected via {connector?.name} to chainID: {connectedChainID}
        </Typography>
        <Button variant="outlined" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <Button
          variant="outlined"
          sx={{ mx: 1 }}
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {!connector.ready && " (unsupported)"}
          {isLoading && connector.id === pendingConnector?.id && " (connecting)"}
        </Button>
      ))}

      {error && <div>{error.message}</div>}
    </div>
  );
}
