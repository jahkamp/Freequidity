# Freequidity Contract Guide

## 📋 Overview

**Freequidity** is a production-ready smart contract for **Cronos mainnet** that facilitates swapping CRO for TP tokens with automatic liquidity addition and LP token burning.

### What It Does

1. **Accepts CRO**: Users send native CRO to the contract via `swapCROForTPAndBurnLP()`
2. **Quotes Price**: Contract queries the Ebisusbay router for the current CRO → TP exchange rate
3. **Transfers TP**: Pays the user TP tokens from the contract's TP reserve at the on-chain price
4. **Adds Liquidity**: Uses the received CRO + an equal amount of TP to create WCRO/TP liquidity on Ebisusbay
5. **Burns LP**: Sends the LP tokens to the dead address (`0x000...dEaD`) to permanently remove liquidity

### Key Features

- ✅ **On-chain pricing**: Uses `router.getAmountsOut()` for accurate, tamper-proof quotes
- ✅ **Reserve checks**: Enforces ~200% TP reserve requirement by default (configurable)
- ✅ **Reentrancy guard**: Protected against reentrancy attacks
- ✅ **Owner controls**: Adjustable reserve multiplier and buffer, emergency withdrawal
- ✅ **Fully tested**: Integration tests with mock contracts included
- ✅ **Gas optimized**: Stack-optimized functions, no external dependencies

---

## 🚀 Quick Deployment (Cronos Mainnet)

### Prerequisites

- **Node.js** v20+ (recommended) or v18.20.0
- **npm** v9+
- Cronos mainnet RPC URL (e.g., from Alchemy, Infura, or a public RPC)
- A funded wallet (deployer account with CRO for gas)
- TP tokens to fund the contract after deployment

### 1. Clone & Install

```bash
cd CroiletFluush
npm install
```

### 2. Create .env File

```bash
cp .env.example .env
```

Add to `.env`:
```env
# Cronos mainnet private key (deployer wallet)
PRIVATE_KEY=0x...

# RPC endpoints (choose one)
CRONOS_RPC_URL=https://evm.cronos.org  # Public RPC

# (Optional) For contract verification on Cronoscan
CRONOSCAN_API_KEY=your_api_key_here
```

### 3. Compile the Contract

```bash
npm run contracts:compile
```

Expected output:
```
Compiled 1 Solidity file successfully (evm target: paris).
```

### 4. Deploy to Cronos Mainnet

Create or use `scripts/deploy.ts` (example below):

```typescript
import { ethers } from "hardhat";

async function main() {
  const TP_ADDRESS = "0x421465f546763c5114Dff5beC0ff953b3d51D0B2"; // TP token
  const ROUTER_ADDRESS = "0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7"; // Ebisusbay router

  console.log("Deploying Freequidity...");
  const freequidity = await ethers.deployContract("Freequidity", [TP_ADDRESS, ROUTER_ADDRESS]);
  await freequidity.deployed();

  console.log(`✅ Freequidity deployed to: ${freequidity.address}`);
  console.log(`   TP Token: ${TP_ADDRESS}`);
  console.log(`   Router: ${ROUTER_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Run deployment:
```bash
npx hardhat run --network cronos scripts/deploy.ts
```

Example output:
```
Deploying Freequidity...
✅ Freequidity deployed to: 0x1234567890abcdef...
   TP Token: 0x421465f546763c5114Dff5beC0ff953b3d51D0B2
   Router: 0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7
```

### 5. Fund the Contract with TP

The contract must hold TP to pay users and supply to the liquidity pool. By default, it requires ~200% of the quoted TP amount (plus 1% buffer).

**Example**: If 1 CRO → 100 TP, the contract needs ~201 TP.

To fund the contract (from an account that holds TP):

```typescript
// Fund via ethers
const tp = new ethers.Contract(TP_ADDRESS, ERC20_ABI, signer);
const deployedAddress = "0x1234567890abcdef..."; // Freequidity address
const fundAmount = ethers.utils.parseEther("10000"); // 10,000 TP
await tp.transfer(deployedAddress, fundAmount);
```

Or transfer via a wallet UI (MetaMask, etc.).

### 6. Verify Contract on Cronoscan (Optional)

```bash
npx hardhat verify --network cronos <DEPLOYED_ADDRESS> <TP_ADDRESS> <ROUTER_ADDRESS>
```

Example:
```bash
npx hardhat verify --network cronos 0x1234567890abcdef 0x421465f546763c5114Dff5beC0ff953b3d51D0B2 0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7
```

---

## 📖 Contract Interface

### Main Function: `swapCROForTPAndBurnLP`

```solidity
function swapCROForTPAndBurnLP(uint256 slippageBips, uint256 deadline) 
  external payable 
  returns (uint256 tpSentToUser, uint256 lpBurned)
```

**Parameters**:
- `slippageBips` (uint256): Allowed slippage in basis points (100 = 1%, max 1000 = 10%)
- `deadline` (uint256): UNIX timestamp deadline for the swap (e.g., `Math.floor(Date.now()/1000) + 300` for 5 minutes)
- `msg.value`: Amount of native CRO to swap (sent with the transaction)

**Returns**:
- `tpSentToUser`: TP tokens transferred to the user
- `lpBurned`: LP tokens burned (sent to dead address)

**Reverts on**:
- `NO_CRO_SENT`: User didn't send any CRO
- `SLIPPAGE_TOO_HIGH`: Slippage exceeds 10%
- `NO_PAIR_OR_ZERO_OUTPUT`: Router returned 0 TP for the CRO (pair doesn't exist or low liquidity)
- `INSUFFICIENT_TP_IN_CONTRACT`: Contract doesn't hold enough TP to cover the swap + liquidity (default ~2x)
- `TP_TRANSFER_TO_USER_FAILED`: Transfer to user failed (token issue)
- `APPROVE_FAILED`: Approval to router failed
- `LP_BURN_FAILED`: Couldn't transfer LP to dead address

### Price Query Function: `quoteTPForCRO`

```solidity
function quoteTPForCRO(uint256 croAmount) external view returns (uint256 tpAmount)
```

**Returns** the expected TP amount for a given CRO amount (using the current router price).

**Use this** to show users the expected TP payout before they call `swapCROForTPAndBurnLP`.

### Reserve Configuration

```solidity
function setReserveMultiplierPct(uint256 pct) external onlyOwner
```
- Adjusts the reserve multiplier (100 = 1x, 200 = 2x, etc.)
- Range: 100–1000 (1x–10x)
- Default: 200 (2x)

```solidity
function setReserveBufferBips(uint256 bips) external onlyOwner
```
- Adjusts the extra buffer in basis points (e.g., 100 = 1%)
- Max: 1000 (10%)
- Default: 100 (1%)

### Owner Functions

```solidity
function ownerWithdrawToken(address token, address to, uint256 amount) external onlyOwner
```
- Withdraw TP, other ERC20s, or native CRO from the contract
- `token = address(0)` for native CRO

```solidity
function transferOwnership(address newOwner) external onlyOwner
```
- Transfer contract ownership to a new address

---

## 💻 Example Usage

### JavaScript / TypeScript (ethers.js)

```typescript
import { ethers } from "ethers";
import ABI from "./artifacts/abis/Freequidity.abi.json";

const provider = new ethers.providers.JsonRpcProvider("https://evm.cronos.org");
const signer = provider.getSigner();

const contractAddress = "0x1234567890abcdef..."; // Your deployed address
const contract = new ethers.Contract(contractAddress, ABI, signer);

// 1. Query price before swapping
const croAmount = ethers.utils.parseEther("0.5"); // 0.5 CRO
const expectedTP = await contract.quoteTPForCRO(croAmount);
console.log(`Expected TP: ${ethers.utils.formatEther(expectedTP)}`);

// 2. Execute swap
const slippageBips = 100; // 1% slippage
const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min from now

const tx = await contract.swapCROForTPAndBurnLP(slippageBips, deadline, {
  value: croAmount,
  gasLimit: 500000, // Adjust based on your needs
});

console.log("Transaction hash:", tx.hash);
const receipt = await tx.wait();
console.log("Swap completed! Block:", receipt.blockNumber);

// 3. Parse events to see TP received and LP burned
const logs = receipt.logs.map((log) => contract.interface.parseLog(log));
console.log("Events:", logs);
```

### Direct Wallet Call (MetaMask)

1. Open Cronoscan or a block explorer
2. Find your Freequidity contract address
3. Go to **Write** tab (requires MetaMask connected)
4. Call `swapCROForTPAndBurnLP`:
   - `slippageBips`: `100` (1%)
   - `deadline`: `1699999999` (future UNIX timestamp)
   - **Value**: Enter CRO amount (e.g., 0.5 CRO)
5. Click **Write** and approve the transaction

---

## 🧪 Testing Locally

### Run the Test Suite

```bash
npm run contracts:test test/Freequidity.test.ts
```

Expected output:
```
  Freequidity (integration with mocks)
    ✔ should swap CRO for TP and burn LP using mock router

  1 passing (600ms)
```

The test:
1. Deploys a mock TP token (ERC20)
2. Deploys mock Ebisusbay router + factory
3. Deploys the Freequidity contract
4. Funds it with TP tokens
5. Simulates a user swap (0.5 CRO → TP)
6. Verifies:
   - User received TP
   - LP tokens were created and burned

### Run All Tests

```bash
npm run contracts:test
```

---

## 🔒 Security Notes

### Reentrancy Guard
- `swapCROForTPAndBurnLP` is protected by a reentrancy guard (`nonReentrant` modifier)
- Prevents attacks where a contract re-enters during execution

### Reserve Requirements
- The contract enforces a minimum reserve (~2x TP by default)
- Prevents the contract from being drained and unable to complete user swaps
- **Operator**: Monitor contract TP balance and refill as needed

### Private Keys
- ⚠️ Never commit `.env` with private keys to version control
- Use environment variables or a secure key management service (e.g., AWS Secrets Manager, Hashicorp Vault)
- For mainnet, use a hardware wallet (Ledger, Trezor) or multisig (Gnosis Safe)

### Access Control
- Only the owner can:
  - Adjust reserve multiplier / buffer
  - Withdraw tokens
  - Transfer ownership
- Consider using a multisig or timelock for owner functions on mainnet

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `INSUFFICIENT_TP_IN_CONTRACT` | Fund the contract with more TP. Current requirement: `expectedTP * 200 / 100 + expectedTP * 100 / 10000` |
| `NO_PAIR_OR_ZERO_OUTPUT` | Liquidity pair WCRO/TP may not exist or have low liquidity. Check Ebisusbay. |
| `SLIPPAGE_TOO_HIGH` | Increase `slippageBips` parameter (max 1000 = 10%). Market may be volatile. |
| `TP_TRANSFER_TO_USER_FAILED` | Check TP token contract; ensure it doesn't have transfer restrictions. |
| Compilation fails with "Stack too deep" | This is already optimized. If you modify the contract, use `--via-ir` flag or split functions. |
| `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` | Windows/Node environment issue (not a contract error). Upgrade Node 20.x or use WSL. |

---

## 📚 Key Addresses (Cronos Mainnet)

| Name | Address |
|------|---------|
| TP Token | `0x421465f546763c5114Dff5beC0ff953b3d51D0B2` |
| Ebisusbay Router | `0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7` |
| WCRO (Wrapped CRO) | From router's `WETH()` call |
| Dead Address (burn) | `0x000000000000000000000000000000000000dEaD` |

---

## 📖 Additional Resources

- **Cronos Docs**: https://docs.cronos.org/
- **Ebisusbay**:  https://ebisusbay.com/ (or check AMM docs)
- **Solidity Docs**: https://docs.soliditylang.org/
- **ethers.js Docs**: https://docs.ethers.org/
- **Hardhat Docs**: https://hardhat.org/

---

## ✨ Summary

**Freequidity** is ready to deploy and use on Cronos mainnet. Follow these steps:

1. **Deploy** to Cronos (see step 4 above)
2. **Fund** with TP tokens
3. **Test** locally if desired
4. **Verify** on Cronoscan (optional but recommended)
5. **Integrate** into your app or encourage users to call directly

For questions or issues, check the repo's test suite and QUICK_START.md.

🚀 **Happy deploying!**
