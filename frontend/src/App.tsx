import ConnectWalletCard from "./components/ConnectWalletCard";
import RouteMain from "./routes";
import { WagmiConfig, createClient, configureChains, goerli, useAccount, useContractEvent } from "wagmi";
import { bscTestnet } from "@wagmi/core/chains";

import { publicProvider } from "wagmi/providers/public";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { rpc } from "./utils/rpcHelper";
import { useSelectedChain } from "./hooks/useSelectedChain";
import { ChainlinkAdapter__factory, DigitalPayoffPool__factory, TradePool__factory } from "./config/typechain-types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const { chains, provider, webSocketProvider } = configureChains(
  [bscTestnet, goerli],
  [
    jsonRpcProvider({
      rpc,
    }),
    publicProvider(),
  ]
);

const client = createClient({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains })],
  provider,
  webSocketProvider,
});

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  const { isConnected } = useAccount();
  const chainMetadata = useSelectedChain();

  useContractEvent({
    address: `0x${chainMetadata?.programs.chainlinkAdapter}`,
    abi: ChainlinkAdapter__factory.abi,
    eventName: "OracleCreated",
    listener(idx) {
      toast("new oracle created, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });
  useContractEvent({
    address: `0x${chainMetadata?.programs.digitalPayoffPool}`,
    abi: DigitalPayoffPool__factory.abi,
    eventName: "PayoffCreated",
    listener(idx) {
      toast("new payoff created, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });
  useContractEvent({
    address: `0x${chainMetadata?.programs.tradePool}`,
    abi: TradePool__factory.abi,
    eventName: "TradeCreated",
    listener(idx) {
      toast("new trade created, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });
  useContractEvent({
    address: `0x${chainMetadata?.programs.tradePool}`,
    abi: TradePool__factory.abi,
    eventName: "TradeFunded",
    listener(idx) {
      toast("trade funded, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });
  useContractEvent({
    address: `0x${chainMetadata?.programs.tradePool}`,
    abi: TradePool__factory.abi,
    eventName: "TradeSettled",
    listener(idx) {
      toast("trade settled, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });
  useContractEvent({
    address: `0x${chainMetadata?.programs.tradePool}`,
    abi: TradePool__factory.abi,
    eventName: "TradeClaimed",
    listener(idx) {
      toast("trade claimed, id: " + idx.toNumber(), {
        closeOnClick: true,
      });
    },
  });

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <WagmiConfig client={client}>
        <ToastContainer theme="dark" position="bottom-right" autoClose={false} closeOnClick={true} />
        <div className="App">
          <header className="App-header">
            <Link to="/">Home</Link>
            <ConnectWalletCard />
            <hr />
            {isConnected && <RouteMain />}
          </header>
        </div>
      </WagmiConfig>
    </ErrorBoundary>
  );
}

export default App;
