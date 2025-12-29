# Smart Contracts Overview

This document describes all smart contracts in the repo.

## 📦 Production Contracts

### 1. Freequidity.sol

**Location**: `contracts/Freequidity.sol`

**Purpose**: Production-ready contract for Cronos mainnet that swaps CRO to TP tokens with automatic liquidity addition and LP token burning.

**Key Features**:
- Accepts CRO from users
- Quotes on-chain price via Ebisusbay router
- Transfers TP from contract reserve at market price
- Adds WCRO/TP liquidity
- Burns LP tokens (sends to dead address)
- Enforces ~200% TP reserve requirement (configurable)
- Reentrancy-protected
- Owner-controlled

**Constructor Arguments**:
- `_tp` (address): TP token address (`0x421465f546763c5114Dff5beC0ff953b3d51D0B2`)
- `_router` (address): Ebisusbay router (`0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7`)

**Main Functions**:
- `swapCROForTPAndBurnLP(uint256 slippageBips, uint256 deadline) payable` — Execute swap
- `quoteTPForCRO(uint256 croAmount) view` — Get expected TP for CRO amount
- `setReserveMultiplierPct(uint256 pct)` — Adjust reserve requirement (owner)
- `setReserveBufferBips(uint256 bips)` — Adjust buffer (owner)
- `ownerWithdrawToken(address token, address to, uint256 amount)` — Emergency withdraw (owner)
- `transferOwnership(address newOwner)` — Transfer ownership (owner)

**Gas Usage** (approx):
- Deployment: ~1.26M gas
- Swap: ~650k gas

**Security**:
- Reentrancy guard
- Owner-controlled configuration
- Input validation for slippage, deadlines, amounts
- No external dependencies (interfaces only)

**Deployment Guide**: See [FREEQUIDITY_GUIDE.md](./FREEQUIDITY_GUIDE.md)

---

## 🧪 Test Contracts

These contracts are used only for testing Freequidity and are not intended for mainnet deployment.

### 3. MockERC20.sol

**Location**: `contracts/mocks/MockERC20.sol`

**Purpose**: Minimal ERC20 implementation for testing.

**Key Features**:
- Basic transfer, approve, transferFrom
- Mint function for testing (not standard ERC20)
- No access control

**Use**: Represents the TP token in tests.

---

### 4. MockFactory.sol

**Location**: `contracts/mocks/MockFactory.sol`

**Purpose**: Minimal Uniswap V2-style factory for testing.

**Key Features**:
- `getPair(address tokenA, address tokenB) view` — Returns pair address
- `setPair(address tokenA, address tokenB, address pair)` — Register a pair

**Use**: Used by MockRouter to manage pair addresses in tests.

---

### 5. MockRouter.sol

**Location**: `contracts/mocks/MockRouter.sol`

**Purpose**: Minimal Uniswap V2-style router for testing.

**Key Features**:
- `WETH() view` — Returns WCRO address
- `factory() view` — Returns factory address
- `getAmountsOut(uint256 amountIn, address[] path) view` — Returns output amounts (simplified: uses `priceOut` mapping)
- `addLiquidityETH(...)` — Creates/deploys LP token and transfers to caller
- `setPriceOut(address token, uint256 amountOut)` — Owner can set price for testing

**Use**: Simulates Ebisusbay router behavior in tests without needing mainnet liquidity.

---

### 6. MockPair.sol

**Location**: `contracts/mocks/MockPair.sol`

**Purpose**: Minimal ERC20-based LP token for testing.

**Key Features**:
- Extends MockERC20
- Represents WCRO/TP LP token

**Use**: Created by MockRouter and burned by Freequidity in tests.

---

## 📋 Interfaces

All interfaces are defined inline in `contracts/Freequidity.sol` for simplicity:

### IERC20

Standard ERC20 token interface:
- `balanceOf(address) view returns (uint256)`
- `transfer(address to, uint256 amount) returns (bool)`
- `approve(address spender, uint256 amount) returns (bool)`
- `transferFrom(address from, address to, uint256 amount) returns (bool)`
- `allowance(address owner, address spender) view returns (uint256)`
- `totalSupply() view returns (uint256)`
- Events: `Transfer`, `Approval`

### IUniswapV2Router02

Uniswap V2-style router interface (subset):
- `WETH() pure returns (address)`
- `factory() pure returns (address)`
- `getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)`
- `addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)`

### IUniswapV2Factory

Uniswap V2-style factory interface:
- `getPair(address tokenA, address tokenB) view returns (address pair)`

---

## 🧬 Contract Interactions

```
User
  |
  v
Freequidity.swapCROForTPAndBurnLP()
  |
  +-- Queries TP Token balance
  |
  +-- Calls router.getAmountsOut() to quote price
  |
  +-- Transfers TP to user (via TP.transfer)
  |
  +-- Approves router to spend TP (via TP.approve)
  |
  +-- Calls router.addLiquidityETH()
  |      |
  |      +-- Router deploys or uses existing WCRO/TP pair
  |      |
  |      +-- Transfers LP tokens back to Freequidity
  |
  +-- Burns LP (via LP.transfer to dead address)
  |
  v
Done - User now holds TP, LP is burned
```

---

## 📊 Contract Sizes

| Contract | Bytecode | Deployed |
|----------|----------|----------|
| Freequidity | ~7.2 KB | ~7.3 KB |
| MockERC20 | ~5.4 KB | ~5.4 KB |
| MockFactory | ~2.1 KB | ~2.1 KB |
| MockRouter | ~15.9 KB | ~15.9 KB |
| MockPair | ~5.4 KB | ~5.4 KB |

---

## 🔄 Testing & Deployment Flow

```
1. Compile all contracts
   npx hardhat compile

2. Run tests (mocks + integration)
   npx hardhat test test/Freequidity.test.ts

3. Deploy to local Hardhat node
   npx hardhat run scripts/deploy.ts --network hardhat

4. Deploy to testnet (Goerli, etc.)
   npx hardhat run scripts/deploy.ts --network goerli

5. Deploy to mainnet (Cronos, Ethereum, etc.)
   npx hardhat run scripts/deploy.ts --network cronos

6. Verify contracts
   npx hardhat verify --network <network> <address> <constructor_args>
```

---

## 💾 Artifacts

After compilation, artifacts are generated in `artifacts/`:

- **ABIs** (for frontend): `artifacts/abis/Freequidity.abi.json`
- **Full artifacts**: `artifacts/contracts/**/*.json` (includes bytecode, ABI, metadata)
- **Build info**: `artifacts/build-info/*.json` (compiler input/output)

---

## 🔒 Security Considerations

### Freequidity

✅ **Implemented**:
- Reentrancy guard
- Input validation (slippage limits, amount > 0)
- Reserve requirement checks
- Owner-controlled configuration
- Error messages for debugging

⚠️ **Assumptions**:
- TP token contract is non-malicious
- Ebisusbay router is trustworthy
- Router price is accurate (uses on-chain reserves)

🔍 **Recommended for Production**:
- Formal security audit by professional firm
- Static analysis (Slither, MythX)
- Fuzzing (Echidna)
- Use multisig for owner functions
- Time-lock for critical configuration changes

### Mock Contracts

- For testing only, not intended for production
- Simplified implementations
- No access control (except owner in MockRouter)

---

## 📚 Further Reading

- [Freequidity Detailed Guide](./FREEQUIDITY_GUIDE.md)
- [Quick Start Reference](./QUICK_START.md)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Uniswap V2 Docs](https://docs.uniswap.org/contracts/v2/overview)
- [Hardhat Docs](https://hardhat.org/)

---

## ✨ Summary

| Contract | Type | Network | Status |
|----------|------|---------|--------|
| Freequidity | Production | Cronos Mainnet | ✅ Ready to deploy |
| MockERC20 | Test | N/A (local) | ✅ For testing |
| MockFactory | Test | N/A (local) | ✅ For testing |
| MockRouter | Test | N/A (local) | ✅ For testing |
| MockPair | Test | N/A (local) | ✅ For testing |

---

**Questions?** See [FREEQUIDITY_GUIDE.md](./FREEQUIDITY_GUIDE.md) or [QUICK_START.md](./QUICK_START.md).
