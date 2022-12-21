import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
// import "hardhat-ethernal";

require("dotenv").config();

const GAS_REPORTER_CONFIG = {
  ETH_ETHERSCAN: {
    token: "ETH",
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
  },

  MATIC_POLYGON: {
    token: "MATIC",
    gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
  },

  AVAX_AVALANCHE: {
    token: "AVAX",
    gasPriceApi: "https://api.snowtrace.io/api?module=proxy&action=eth_gasPrice",
  },

  MOVR_MOONRIVER: {
    token: "MOVR",
    gasPriceApi: "https://api-moonriver.moonscan.io/api?module=proxy&action=eth_gasPrice",
  },

  // can't be used because of https://github.com/cgewecke/eth-gas-reporter/issues/283
  // ETH_ARBITRUM: {
  //   token: "ETH",
  //   gasPriceApi: "https://api.arbiscan.io/api?module=proxy&action=eth_gasPrice&apiKey=" + process.env.ARBISCAN_API_KEY,
  // },
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      forking: {
        url: "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_ETH_GOERLI_API_KEY,
      },
    },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_ETH_GOERLI_API_KEY,
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 40000,
  },
  gasReporter: {
    enabled: !!process.env.ENABLE_GAS_REPORT,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    ...GAS_REPORTER_CONFIG.ETH_ETHERSCAN,
  },
  // ethernal: {
  //   email: process.env.ETHERNAL_EMAIL,
  //   password: process.env.ETHERNAL_PASSWORD,
  //   uploadAst: false,
  //   disableSync: true,
  //   disableTrace: true,
  //   disabled: true,
  // },
};

export default config;
