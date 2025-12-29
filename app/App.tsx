import { DeFiWeb3Connector } from "@deficonnect/web3-connector";
import Web3 from "web3";

const connector = new DeFiWeb3Connector({
  supportedChainIds: [1],
  chainType: "eth", // only support 'eth' for DeFiWeb3Connector
  chainId: "25",
  rpcUrls: {
    1: "https://mainnet.infura.io/v3/INFURA_API_KEY",
    25: "https://evm-cronos.crypto.org/",
  },
});

async function connect() {
  await connector.activate();
  const provider = await connector.getProvider();
  web3 = new Web3(provider);
  accounts = await web3.eth.getAccounts();
}

async function sendTransaction() {
    const provider = await connector.getProvider();
  
    provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          /* your transaction params */
        },
      ],
    });
  }

  interface AddEthereumChainParameter {
    chainId: string; // A 0x-prefixed hexadecimal string
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string; // 2-6 characters long
      decimals: 18;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    iconUrls?: string[]; // Currently ignored.
  }