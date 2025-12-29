import type { MetaFunction } from "@remix-run/node";
import ContractInteraction from "~/components/ContractInteraction";

export const meta: MetaFunction = () => {
  return [
    { title: "Freequidity Contract" },
    { name: "description", content: "Trade CRO for TP. All proceeds are used to generate liquidity." },
  ];
};

export default function ContractPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-900 dark:text-white">
          Freequidity Contract
        </h1>
        <ContractInteraction />
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-100 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            📚 Getting Started
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>1. Install MetaMask or another Web3 wallet</li>
            <li>2. Click "Connect Wallet" to connect to your wallet</li>
            <li>3. Ensure you're on the correct network (Hardhat localhost, Goerli, or your chosen testnet)</li>
            <li>4. Enter a value and click "Set Value" to update the contract state</li>
            <li>5. Click "Refresh Value" to see the latest value from the contract</li>
          </ol>
          <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Update the contract address in the component to match your deployed address.
          </p>
        </div>
      </div>
    </div>
  );
}
