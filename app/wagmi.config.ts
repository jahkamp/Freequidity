import { createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors'
import { http } from 'viem'
import type { Chain } from 'wagmi'

export const cronos: Chain = {
  id: 25,
  name: 'Cronos',
  network: 'cronos',
  nativeCurrency: {
    decimals: 18,
    name: 'Cronos',
    symbol: 'CRO',
  },
  rpcUrls: {
    public: { http: ['https://evm.cronos.org'] },
    default: { http: ['https://evm.cronos.org'] },
  },
  blockExplorers: {
    default: { name: 'Cronoscan', url: 'https://cronoscan.com' },
  },
  testnet: false,
}

export const config = createConfig({
  chains: [cronos],
  connectors: [
    metaMask(),
    walletConnect({
  projectId: 'bffe6ce369c0a1f47e2f904ae5b146a7',
  metadata: {
    name: 'Croilet',
    description: 'Croilet dApp',
    url: 'https://croilet.com',
    icons: ['https://img1.wsimg.com/isteam/ip/a97523d8-9581-4098-a008-75fd9e02698b/logo/Croilet%20Logo%20(1).png',]
  },
}),
    injected(),
  ],
  transports: {
    25: http('https://evm.cronos.org'),
  },
  publicClient: http('https://evm.cronos.org'), // ✅ Specify the RPC URL
});