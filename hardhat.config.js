
require("./task");
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@chainlink/env-enc").config();

const SEPOLIA_URL = process.env.SEPOLIA_URL;
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const AMOY_URL = process.env.AMOY_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/6e70e7012c0d43a6876f838bb8d08833",
      accounts: [PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3],
      chainId: 11155111,
      blockConfirmations:6,
      companionNetworks:{
        destChain:"amoy"
    }},
    amoy:{
      url:AMOY_URL,
      accounts:[PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3],
      chainId:80002,
      blockConfirmations:6,
      companionNetworks:{
        destChain:"sepolia"
    }
  }

  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  namedAccounts: {
    firstAccount: {
      default: 0,
    },
    secondAccount: {
      default: 1,
    },
    thirdAccount: {
      default: 2,
    }
  },


};
