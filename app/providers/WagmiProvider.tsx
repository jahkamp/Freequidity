// app/providers/WagmiProvider.tsx
import { WagmiProvider as BaseWagmiProvider } from 'wagmi'
import { config } from '../wagmi.config'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a QueryClient for react-query (used by wagmi hooks)
const queryClient = new QueryClient()

export function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BaseWagmiProvider config={config}>{children}</BaseWagmiProvider>
    </QueryClientProvider>
  )
}