export const rpc = (chain) => {
  let http = "";
  switch (chain.id) {
    case 97:
      http = process.env.REACT_APP_RPC_BSC_TESTNET!;
      break;
    case 5:
      http = process.env.REACT_APP_RPC_GOERLI!;
      break;
  }
  return {
    http,
  };
};
