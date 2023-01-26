export const rpc = (
  chain
): {
  http: string;
  webSocket?: string | undefined;
} | null => {
  let http = "";
  let webSocket = "";
  switch (chain.id) {
    case 97:
      http = process.env.REACT_APP_RPC_BSC_TESTNET!;
      webSocket = process.env.REACT_APP_RPC_WS_BSC_TESTNET!;
      break;
    case 5:
      http = process.env.REACT_APP_RPC_GOERLI!;
      webSocket = process.env.REACT_APP_RPC_WS_GOERLI!;
      break;
  }
  return {
    http,
    webSocket,
  };
};
