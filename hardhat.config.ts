import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "@nomicfoundation/hardhat-foundry";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import "hardhat-storage-layout";
// import "hardhat-ethernal";

require("dotenv").config();

const PUBLIC_RPC_GOERLI = "https://eth-goerli.public.blastapi.io";
const PUBLIC_RPC_BSC_TESTNET = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PUBLIC_RPC_ARB_GOERLI = "https://endpoints.omniatech.io/v1/arbitrum/goerli/public";

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
  paths: {
    artifacts: "artifacts_hh",
    cache: "cache_hh",
    tests: "test/hh",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      forking: {
        url: process.env.RPC_GOERLI ?? PUBLIC_RPC_GOERLI,
      },
    },
    goerli: {
      url: process.env.RPC_GOERLI ?? PUBLIC_RPC_GOERLI,
      accounts: process.env.ACCOUNT_PVT_KEY ? [process.env.ACCOUNT_PVT_KEY] : [],
    },
    bscTestnet: {
      url: process.env.RPC_BSC_TESTNET ?? PUBLIC_RPC_BSC_TESTNET,
      chainId: 97,
      accounts: process.env.ACCOUNT_PVT_KEY ? [process.env.ACCOUNT_PVT_KEY] : [],
    },
    arbGoerli: {
      url: process.env.RPC_ARB_GOERLI ?? PUBLIC_RPC_ARB_GOERLI,
      chainId: 421613,
      accounts: process.env.ACCOUNT_PVT_KEY ? [process.env.ACCOUNT_PVT_KEY] : [],
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
    // outputFile: "gas_report_asm+no_lib.txt",
    // noColors: true,
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
