import * as dotenv from "dotenv";
dotenv.config()
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-abi-exporter";
import "@solidstate/hardhat-bytecode-exporter";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks:{
    'local': {
      url: 'http://127.0.0.1:8545',
    },
    localPK: {
      url: 'http://127.0.0.1:8545',
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    okcTest: {
      url: 'https://exchaintestrpc.okex.org',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    test: {
      url: process.env.TEST_RPC_URL || "",
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    evm: {
      url: 'https://evm.confluxrpc.com',
      accounts:
          process.env.k1994 !== undefined ? [process.env.k1994] : [],
    }
  },
  bytecodeExporter: {
    path: "./abi"
  }
};

export default config;
