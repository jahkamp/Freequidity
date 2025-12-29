/** @type import('hardhat/config').HardhatUserConfig */

require('dotenv').config();
require("@nomiclabs/hardhat-ethers");

const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.27",
  // Use the local Hardhat network by default to avoid accidental remote deployments
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    ropsten: {
      url: API_URL || '',
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : []
    },
    // Cronos testnet (Chapel)
    cronos: {
      url: process.env.CRONOS_TESTNET_URL || 'https://evm-t3.cronos.org',
      chainId: 338,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : []
    }
  },
};