import ConnectWalletCard from "./components/ConnectWalletCard";
import RouteMain from "./routes";
import { WagmiConfig, createClient, configureChains, goerli, useAccount } from "wagmi";
import { bscTestnet } from "@wagmi/core/chains";

import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { rpc } from "./utils/rpcHelper";

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
  const { isConnected, connector } = useAccount();
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <WagmiConfig client={client}>
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
