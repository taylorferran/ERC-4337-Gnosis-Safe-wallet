require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });
require("@nomiclabs/hardhat-etherscan");

  const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const API_KEY = process.env.API_KEY;

module.exports = {
  solidity: {
  version: "0.8.12",
  settings: {
    optimizer: {
      enabled: true,
      runs: 100,
    },
  },
},

  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },

  etherscan: {
    apiKey: {
      goerli: API_KEY
    },
  },

};
