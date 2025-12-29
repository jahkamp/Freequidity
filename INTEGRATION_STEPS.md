# Integration Steps

Follow these steps to complete the wallet connection setup:

## Step 1: Update Root Layout

Edit `app/root.tsx` and add WagmiProvider:

```tsx
import { WagmiProvider } from '~/providers/WagmiProvider';

// ... existing imports ...

export default function App() {
  return (
    <html>
      <head>
        {/* ... existing head content ... */}
      </head>
      <body>
        <WagmiProvider>
          <Outlet />
        </WagmiProvider>
      </body>
    </html>
  );
}
```

## Step 2: Create .env.local (Optional - for WalletConnect)

```bash
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get ProjectId from: https://cloud.walletconnect.com

## Step 3: Test Locally

```bash
npm run dev
```

Visit `http://localhost:5173/contract` and test:
- ✅ Click "Connect Wallet" button
- ✅ MetaMask popup appears
- ✅ Wallet connects successfully
- ✅ See account address displayed
- ✅ See CRO price loading
- ✅ See available TP amount

## Step 4: Chain Validation

The component will automatically:
- Check if user is on Cronos (Chain ID: 25)
- Show warning if on wrong network
- Allow switching chains with wagmi

## Step 5: Build and Deploy

```bash
npm run build
```

Deploy to production with environment variables set:
- `REACT_APP_WALLETCONNECT_PROJECT_ID` (if using WalletConnect)

## What's New

✅ **wagmi hooks** - useAccount, useConnect, useDisconnect
✅ **MetaMask connector** - Direct MetaMask support
✅ **Multi-wallet support** - MetaMask, WalletConnect, Injected
✅ **Cronos mainnet** - Pre-configured for Chain ID 25
✅ **Type-safe** - Full TypeScript support
✅ **Error handling** - Automatic error messages

## Troubleshooting

### "MetaMask not found" error
- Install MetaMask browser extension
- Refresh page after installation

### "Wrong network" warning
- Open MetaMask
- Switch to Cronos Mainnet
- Refresh page

### WalletConnect not working
- Add WalletConnect ProjectId to `.env.local`
- Ensure `REACT_APP_WALLETCONNECT_PROJECT_ID` is set

## Component Features

The ContractInteraction component includes:
- 🔌 MetaMask wallet connection
- 🌐 Cronos mainnet detection
- 💰 Available TP balance display
- 💹 Current CRO/TP price
- 📊 Real-time price quotes
- 🔄 CRO to TP swaps
- 📈 Slippage tolerance control
- ✅ Transaction confirmation
- 🔗 Cronoscan transaction links

All ready to use after following integration steps!
