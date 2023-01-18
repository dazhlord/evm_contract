import React from "react";
import ConnectWalletCard from "./components/ConnectWalletCard";
import RouteMain from "./routes";
import { WagmiConfig, createClient, configureChains, goerli } from "wagmi";

import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { Link } from "react-router-dom";

const { chains, provider, webSocketProvider } = configureChains(
  [goerli],
  [alchemyProvider({ apiKey: "-5Sy6N4V-1uuMt-tD3ZIYoDAj0aWE1lH" }), publicProvider()]
);

const client = createClient({
  autoConnect: false,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: "wagmi",
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        qrcode: true,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  provider,
  webSocketProvider,
});

function App() {
  return (
    <WagmiConfig client={client}>
      <div className="App">
        <header className="App-header">
          <Link to="/">Home</Link>
          <ConnectWalletCard />
          <hr />
          <RouteMain />
        </header>
      </div>
    </WagmiConfig>
  );
}

export default App;
