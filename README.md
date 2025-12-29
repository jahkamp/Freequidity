# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)
- 🔗 [Smart Contract Deployment Guide](./SMART_CONTRACT_GUIDE.md) ← **Start here for contract deployment!**
- 📦 [Freequidity Contract Guide](./FREEQUIDITY_GUIDE.md) ← **Guide for the Freequidity contract (CRO → TP swap + LP burn)**

## ⭐ Featured Contract: Freequidity

This project includes **Freequidity** — a production-ready Cronos mainnet contract that:
- Accepts native CRO from users
- Converts CRO to TP tokens at on-chain market price (via Ebisusbay router)
- Adds WCRO/TP liquidity automatically
- Burns LP tokens (sends to dead address)
- Enforces reserve requirements (~2x TP by default, configurable by owner)

**Key Addresses (Cronos Mainnet)**:
- TP Token: `0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948` (TTP testnet)
- Ebisusbay Router: `0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7`

👉 See [Freequidity Quick Guide](./FREEQUIDITY_GUIDE.md) for deployment and usage.

## What's Inside

This project combines a **Remix web app** with **Hardhat smart contracts**:

- **Frontend**: React + Remix for the web UI
- **Smart Contracts**: Solidity contracts compiled and deployed with Hardhat
  - `Freequidity.sol` — CRO → TP swap + liquidity + LP burn (Cronos mainnet)
- **Testing**: Mocha + Chai integration tests with mock contracts
- **Web3 Integration**: ethers.js for wallet connection and contract interaction

## 🚀 Quick Start - Smart Contracts

### 1. Install dependencies
```sh
npm install
```

### 2. Run tests
```sh
npm run contracts:test
```

### 3. Deploy locally
```bash
# Terminal 1: Start local blockchain
npm run contracts:node

# Terminal 2: Deploy contract
npm run contracts:deploy:localhost
```

### 4. Interact via frontend
```bash
npm run dev
# Visit http://localhost:5173/contract
```

### 5. Deploy to testnet (Goerli, Arbitrum, etc.)
See [SMART_CONTRACT_GUIDE.md](./SMART_CONTRACT_GUIDE.md) for full instructions.

## 📚 Available Scripts

### Development
```sh
npm run dev          # Start Remix dev server
npm run build        # Build for production
npm start            # Run production server
```

### Contracts
```sh
npm run contracts:compile         # Compile Solidity
npm run contracts:test            # Run Hardhat tests
npm run contracts:node            # Start local blockchain
npm run contracts:deploy:localhost # Deploy to localhost
npm run hh <command>              # Run any Hardhat command
```

### Code Quality
```sh
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript compiler
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
