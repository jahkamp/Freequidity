# Smart Contract Deployment Guide

This Remix + Hardhat project is set up to deploy Solidity smart contracts to Ethereum and other EVM-compatible networks.

## 🎯 Which Contract Are You Deploying?

- **`Freequidity.sol`** (Cronos mainnet): CRO → TP swap + liquidity + LP burn → See [Freequidity Guide](./FREEQUIDITY_GUIDE.md)

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Running Tests](#running-tests)
- [Local Development](#local-development)
- [Deployment](#deployment)
  - [To Hardhat Local Node](#to-hardhat-local-node)
  - [To Goerli Testnet](#to-goerli-testnet)
  - [To Mainnet](#to-mainnet)
- [Frontend Integration](#frontend-integration)
- [Verification](#verification)
- [Security Checklist](#security-checklist)

## 🏗️ Project Structure

```
.
├── app/                          # Remix React app
│   ├── components/
│   │   ├── ContractInteraction.tsx   # Web3 component for interacting with contract
│   │   └── ...
│   └── routes/
│       ├── _index.tsx            # Homepage
│       └── contract.tsx          # Contract interaction page
├── contracts/
│   ├── Freequidity.sol             # Production CRO → TP swap + liquidity (Cronos mainnet)
│   └── mocks/                    # Mock contracts for testing
│       ├── MockERC20.sol
│       ├── MockFactory.sol
│       ├── MockRouter.sol
│       └── MockPair.sol
├── scripts/
│   ├── deploy.ts                 # Deployment script
│   └── example_usage.ts          # Example: how to call contracts
├── test/
│   ├── Freequidity.test.ts         # Integration tests for Freequidity
│   └── mocks/                    # Test mock definitions
├── artifacts/
│   ├── abis/                     # Extracted ABIs for frontend
│   │   └── Freequidity.abi.json
│   └── contracts/                # Compiled artifacts (auto-generated)
├── hardhat.config.cjs            # Hardhat configuration
├── tsconfig.hardhat.json         # TypeScript config for Hardhat
├── package.json
└── .env.example                  # Environment variables template
```

## 📦 Prerequisites

- **Node.js**: v18.20.0 or v20+ (v18.20.0 recommended for Hardhat stability on Windows)
- **npm**: v9+
- **MetaMask** or another Web3 wallet browser extension (for frontend interaction)
- **An Ethereum account** with testnet ETH (e.g., from [Goerli Faucet](https://goerlifaucet.com))

### Install Node.js

If you don't have Node.js v18+, install it:

1. **Using nvm (Node Version Manager)** - Recommended:
   ```bash
   nvm install 18.20.0
   nvm use 18.20.0
   node -v  # should show v18.20.0
   ```

2. **Direct download**: Visit [nodejs.org](https://nodejs.org/) and download the LTS version.

## 🚀 Setup & Installation

1. **Clone or open the project**:
   ```bash
   cd CroiletFluush
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # If you hit peer-dependency errors:
   npm install --legacy-peer-deps
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Fill in your `.env` file**:
   ```env
   PRIVATE_KEY=0x...                    # Your deployer wallet's private key (DO NOT commit!)
   ALCHEMY_API_KEY=...                  # Get from https://www.alchemy.com
   ETHERSCAN_API_KEY=...                # Get from https://etherscan.io/apis
   ```

   ⚠️ **NEVER commit `.env` to version control.** Add it to `.gitignore` (already done).

## 🧪 Running Tests

Compile the smart contract and run tests:

```bash
# Compile Solidity contract
npm run contracts:compile

# Run tests (Mocha + Chai)
npm run contracts:test
```

Expected output:
```
  Freequidity
    ✔ should swap CRO for TP and burn LP using mock router

  1 passing (2s)
```

## 🏠 Local Development

### Start Local Hardhat Node

Run a local Ethereum node for testing and development:

```bash
npm run contracts:node
```

This starts a local node at `http://127.0.0.1:8545`.

### Deploy to Local Node (in another terminal)

```bash
npm run contracts:deploy:localhost
```

Example output:
```
Deploying Freequidity...
Freequidity deployed to: 0x5FbDB2315678afccb333f8a9c60582DC08d6ff20
Deployment info saved to ./deployed-address.json
```

### Run the Remix App Locally

```bash
npm run dev
```

Visit `http://localhost:5173` and navigate to `/contract` to interact with your local contract.

### Connect MetaMask to Local Node

1. Open MetaMask → Settings → Networks → Add Network
2. Network details:
   - **Network Name**: Hardhat Localhost
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
3. **Import Hardhat Account**:
   - MetaMask → Select account → Import Account
   - Use one of the private keys printed by `npm run contracts:node`
4. Now you can interact with the deployed contract via the web interface.

## 🌐 Deployment

### To Goerli Testnet

1. **Get test ETH**: Visit [Goerli Faucet](https://goerlifaucet.com) and request ETH for your deployer address.

2. **Set environment variables** in `.env`:
   ```env
   PRIVATE_KEY=0x...            # Your Goerli wallet private key
   ALCHEMY_API_KEY=your_api_key # From Alchemy
   ```

3. **Deploy**:
   ```bash
   npx hardhat run --network goerli scripts/deploy.ts
   ```

   Example output:
   ```
   Deploying Freequidity...
   Freequidity deployed to: 0x1234567890abcdef...
   ```

4. **Check on Etherscan**: Visit [Goerli Etherscan](https://goerli.etherscan.io) and search for your contract address.

### To Mainnet (⚠️ Production)

⚠️ **Only deploy to mainnet after thorough testing and security review!**

```bash
npx hardhat run --network mainnet scripts/deploy.ts
```

**Important**:
- Use a hardware wallet (Ledger, Trezor) or air-gapped signing for mainnet private keys.
- Use a multisig wallet for production contracts.
- Always verify the contract on Etherscan.

### To Other Networks

Edit `hardhat.config.cjs` to add more networks (Arbitrum, Optimism, Polygon, etc.):

```javascript
networks: {
  arbitrum: {
    url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
  },
  optimism: {
    url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY}`,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
  },
}
```

Then deploy:
```bash
npx hardhat run --network arbitrum scripts/deploy.ts
```

## 🔗 Frontend Integration

The contract is integrated into the Remix frontend via `/contract` route.

### Update Contract Address

After deployment, update the contract address in your component:

**File**: `app/components/ContractInteraction.tsx`

```typescript
const CONTRACT_ADDRESS = "0x1234567890abcdef..."; // Replace with your deployed address
```

### How It Works

1. User connects MetaMask via the **Connect Wallet** button.
2. Component reads current value from contract.
3. User enters a new value and clicks **Set Value**.
4. Component sends a signed transaction via ethers.js.
5. Value is updated on-chain and reflected in the UI.

### Custom Contract Interactions

To add more functions to the frontend:

1. Add function signatures to `CONTRACT_ABI` in `ContractInteraction.tsx`.
2. Create new functions that call contract methods via the signer.
3. Update the UI with new buttons/inputs.

Example (if you had a `transfer` function):
```typescript
async function transfer(to: string, amount: string) {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  const tx = await contract.transfer(to, amount);
  await tx.wait();
}
```

## ✅ Verification

### Verify Contract on Etherscan

After deploying to a testnet or mainnet:

```bash
npx hardhat verify --network goerli 0x1234567890abcdef "constructor_args_if_any"
```

For Freequidity (no constructor args):
```bash
npx hardhat verify --network cronos 0x1234567890abcdef
```

Verify deployment output will show a link to the Etherscan verified contract page.

## 🔒 Security Checklist

Before deploying to mainnet:

- [ ] **Test thoroughly** on local Hardhat node and testnet (Goerli).
- [ ] **Review Solidity code** for bugs, reentrancy, and best practices.
- [ ] **Run static analysis**:
  ```bash
  npm install --save-dev slither-analyzer
  slither contracts/Freequidity.sol
  ```
- [ ] **Private keys are NOT committed**: Verify `.env` is in `.gitignore`.
- [ ] **Use environment variables**: Never hardcode keys in code.
- [ ] **Use a multisig wallet** for production deployments (e.g., Gnosis Safe).
- [ ] **Formal audit**: For high-value contracts, hire a professional security audit.
- [ ] **Verify on Etherscan**: Publish source code for transparency.
- [ ] **Monitor after deployment**: Watch contract for unusual activity.
- [ ] **Gas optimization**: Optimize Solidity to reduce deployment and transaction costs:
  ```javascript
  // In hardhat.config.cjs:
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,  // Increase for more optimization
      },
    },
  }
  ```

## 📚 Additional Resources

- **Hardhat Docs**: https://hardhat.org
- **Ethers.js Docs**: https://docs.ethers.org/
- **Solidity Docs**: https://docs.soliditylang.org/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Remix IDE**: https://remix.ethereum.org/

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add my feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a pull request.

## 📄 License

This project is provided as-is for educational and development purposes.

---

**Happy smart contract deploying! 🚀**
