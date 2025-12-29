# 🚀 Quick Reference Card

## TL;DR - Get Started in 3 Minutes

### 1. Activate Node 18 (PowerShell)
```powershell
$env:PATH = "C:\Users\jahka\AppData\Roaming\nvm\v18.20.0;$env:PATH"
node -v  # Should show v18.20.0
```

### 2. Run Tests
```powershell
npm run contracts:test
```
✅ Expected: 1 passing test (Freequidity)

### 3. Start Local Blockchain
```powershell
npm run contracts:node
```
Runs on `http://127.0.0.1:8545`

### 4. Deploy (in another terminal)
```powershell
npm run contracts:deploy:localhost
```
Outputs contract address → copy it!

### 5. Start Web App
```powershell
npm run dev
```
Visit `http://localhost:5173/contract`

### 6. Connect MetaMask
- Install MetaMask browser extension
- Add Network: Hardhat Localhost (127.0.0.1:8545, Chain ID: 31337)
- Import account from local node output
- Interact with contract in UI!

---

## 📋 Command Cheat Sheet

```powershell
# Set Node to 18.20.0 (PowerShell, required!)
$env:PATH = "C:\Users\jahka\AppData\Roaming\nvm\v18.20.0;$env:PATH"

# Tests
npm run contracts:test              # Run unit tests
npm run contracts:compile           # Compile Solidity

# Local Development
npm run contracts:node              # Start local blockchain
npm run contracts:deploy:localhost  # Deploy to localhost
npm run dev                         # Start web app

# Deployment to Testnet
npx hardhat run --network goerli scripts/deploy.ts

# Deployment to Mainnet
npx hardhat run --network mainnet scripts/deploy.ts

# Verify on Etherscan
npx hardhat verify --network goerli 0x...

# Any Hardhat command
npm run hh compile
npm run hh accounts
npm run hh clean
```

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `contracts/Freequidity.sol` | CRO → TP swap contract (production) |
| `scripts/deploy.ts` | Deployment script |
| `test/Freequidity.test.ts` | Integration tests |
| `app/components/ContractInteraction.tsx` | Web3 React component |
| `app/routes/contract.tsx` | Contract interaction page |
| `hardhat.config.cjs` | Hardhat configuration |
| `.env` | Private keys & API keys (never commit!) |
| `SMART_CONTRACT_GUIDE.md` | Detailed deployment guide |

---

## � Freequidity (CRO -> TP swap + LP burn) — quick usage

This repo includes `contracts/Freequidity.sol` — a contract that accepts native CRO from users, pays them TP from a funded wallet balance (on-chain price via a UniswapV2-style router), then uses the received CRO to add WCRO/TP liquidity and burns the LP tokens.

Key addresses (example for Cronos mainnet):
- TP token: `0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948` (TTP on Cronos testnet — the token this contract pays out)
- Ebisusbay router: `0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7` (UniswapV2-style router)
- Dead address (burn): `0x000000000000000000000000000000000000dEaD`

Constructor (when deploying):
- `_tp` — TP token address
- `_router` — router address (UniswapV2-style)

Deploy example (local/cronos network):
```powershell
# Example (adjust network & script):
npx hardhat run --network cronos scripts/deploy.ts --show-stack-traces
```

After deploy
- Fund the deployed contract with TP tokens so it can pay users and supply liquidity. The contract expects to hold about 2x the TP amount returned by the on-chain quote for the CRO received (one portion is paid to the user, one portion used to add liquidity). Example:
```powershell
# from an account that holds TP:
node -e "(async()=>{const { ethers } = require('ethers');const p=new ethers.providers.JsonRpcProvider('http://localhost:8545');const w=p.getSigner(0);const tp=new ethers.Contract('<TP_ADDR>', require('./artifacts/abis/Freequidity.abi.json'), w);await tp.transfer('<DEPLOYED_TPCRO_ADDR>', ethers.utils.parseEther('10000'));})();"
```

Calling the contract (example using ethers):
```typescript
const abi = require('artifacts/abis/Freequidity.abi.json');
const contract = new ethers.Contract('<TPCRO_ADDR>', abi, signer);
// send 0.1 CRO, allow 1% slippage (100 bips)
const tx = await contract.swapCROForTPAndBurnLP(100, Math.floor(Date.now()/1000)+300, { value: ethers.utils.parseEther('0.1') });
await tx.wait();
```

Important notes
- The contract uses `router.getAmountsOut` to compute the TP amount for the CRO sent. The contract will revert if the router returns 0 or the contract doesn't hold enough TP to cover both the user payout and the liquidity portion.
- Provide enough TP to the contract before users call `swapCROForTPAndBurnLP` (roughly 2x expected TP per swap amount).
- Choose `slippageBips` carefully (100 = 1%).
- `deadline` should be a UNIX timestamp in the near future.

Local test
- Run the focused test that exercises this flow (uses the included mocks):
```powershell
npx hardhat test test/Freequidity.test.ts --show-stack-traces
```

Windows/Node note
- You may see a libuv/Node assertion on some Windows Node builds after tests finish (this is an environment issue, not a failing test). If you see `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c`, consider:
  - Upgrading/reinstalling Node 20.x (recommended), or
  - Running tests inside WSL (Ubuntu) where libuv/Windows issues do not occur.


## �🔐 Security Reminders

- ⚠️ Never commit `.env` (private keys!)
- 🔑 Keep your `PRIVATE_KEY` secret
- 🧪 Always test on localhost first
- 🌐 Test on testnet before mainnet
- ✅ Verify contracts on Etherscan

---

## ⚡ Network RPC URLs

Add these to `hardhat.config.cjs` for quick deployment:

```javascript
networks: {
  goerli: {
    url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  arbitrum: {
    url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  optimism: {
    url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  polygon: {
    url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
}
```

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| Tests fail or crash | Check Node v18.20.0 is active: `node -v` |
| Tests find no files | Ensure tests are `.cjs` files in `test/` folder |
| MetaMask won't connect | Add Hardhat Localhost network to MetaMask |
| Contract won't deploy | Verify `.env` has `PRIVATE_KEY` and `ALCHEMY_API_KEY` |
| "Module not found" | Run `npm install` |

---

## 📖 Need More Info?

- **Full deployment guide**: `SMART_CONTRACT_GUIDE.md`
- **Setup details**: `SETUP_COMPLETE.md`
- **Hardhat docs**: https://hardhat.org/
- **ethers.js docs**: https://docs.ethers.org/

---

## ✨ You're All Set!

Your smart contract stack is **ready to deploy**. Start with local testing, move to testnet, then mainnet! 🚀

---

## 🧭 Frontend: set the contract address (optional)

If you want the local frontend to point at a specific deployed `Freequidity` contract (instead of the built-in default), create a `.env.local` file at the repo root with the following line:

```text
VITE_FREEQUIDITY_ADDRESS=0x<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

Then restart the dev server (`npm run dev`) — the app will use this address when querying and calling the contract.

---
