# Wallet Connection Setup Guide

## Overview
The ContractInteraction component now uses **wagmi** for robust wallet connection management. This provides:
- MetaMask integration
- WalletConnect support
- Multiple wallet options
- Automatic chain detection
- Type-safe hooks

## Installation
Libraries have been installed:
```bash
npm install wagmi viem @wagmi/core @web3modal/ethereum @web3modal/react
```

## Usage

### 1. Wrap Your App with WagmiProvider
In your root layout (`app/root.tsx`), wrap your app:

```tsx
import { WagmiProvider } from '~/providers/WagmiProvider';

export default function App() {
  return (
    <WagmiProvider>
      {/* Your routes and components */}
    </WagmiProvider>
  );
}
```

### 2. Use in Components
The `ContractInteraction` component automatically uses wagmi hooks:

```tsx
import ContractInteraction from '~/components/ContractInteraction';

export default function SwapPage() {
  return <ContractInteraction />;
}
```

## Available Hooks

The component uses these wagmi hooks:

### `useAccount()`
- `address` - Connected wallet address
- `isConnected` - Connection status
- `isConnecting` - Connection in progress

### `useConnect()`
- `connect()` - Initiate wallet connection
- `connectors` - Available wallets (MetaMask, WalletConnect, etc.)

### `useDisconnect()`
- `disconnect()` - Disconnect wallet

### `useSwitchNetwork()`
- `switchNetwork()` - Switch to different chain

## Wagmi Configuration

Config file: `app/wagmi.config.ts`

Supports:
- **Cronos Mainnet** (Chain ID: 25)
- **MetaMask Connector**
- **WalletConnect Connector** (requires ProjectId)
- **Injected Connector** (browser wallets)

## WalletConnect Setup (Optional)

For WalletConnect support:
1. Get ProjectId from [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Add to `.env.local`:
   ```
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

## Features

✅ MetaMask wallet connection
✅ Automatic chain validation
✅ Disconnect functionality
✅ Type-safe wallet interactions
✅ Real-time balance/price updates
✅ Transaction signing & execution
✅ Error handling & user feedback

## Migration from Direct Provider

If you were using direct `window.ethereum`, wagmi provides:
- Better error handling
- Automatic reconnection
- Multi-wallet support
- Chain management
- Transaction confirmation

## Next Steps

1. Update `app/root.tsx` to include WagmiProvider
2. Test wallet connection on Cronos mainnet
3. Deploy to production with environment variables
