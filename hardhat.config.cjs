// Configure ts-node FIRST so it can compile TypeScript tests
require('ts-node').register({
  project: './tsconfig.hardhat.json',
  transpileOnly: true,
  files: true,
});

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('dotenv').config();

const ALCHEMY = process.env.ALCHEMY_API_KEY || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || undefined;

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: { url: 'http://127.0.0.1:8545' },
    goerli: {
      url: ALCHEMY ? `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY}` : '',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    mainnet: {
      url: ALCHEMY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}` : '',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 40000,
    extension: ['ts'],
    require: 'ts-node/register',
    spec: ['test/**/*.test.ts'],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
