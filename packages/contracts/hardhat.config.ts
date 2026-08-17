import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    xlayerTestnet: {
      url: process.env.XLAYER_TESTNET_RPC ?? "https://testrpc.xlayer.tech/terigon",
      chainId: 1952,
      accounts: (process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) ? [(process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY)!] : [],
    },
    xlayerMainnet: {
      url: process.env.XLAYER_MAINNET_RPC ?? "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: (process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) ? [(process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY)!] : [],
    },
  },
};

export default config;
