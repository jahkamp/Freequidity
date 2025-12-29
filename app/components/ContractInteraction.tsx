import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { injected, useAccount, useDisconnect, useSwitchChain } from 'wagmi';

const DEFAULT_CONTRACT = '0xfdfcdec2fa7164adc587ffd3e7603afca6f982fe';
const CONTRACT = (import.meta.env as any).VITE_FREEQUIDITY_ADDRESS || DEFAULT_CONTRACT;
const CONTRACT_FROM_ENV = !!(import.meta.env as any).VITE_FREEQUIDITY_ADDRESS;

const TP_TOKEN = '0x421465f546763c5114Dff5beC0ff953b3d51D0B2';
// Chain id can be overridden by Vite env (VITE_CHAIN_ID) — default to Cronos testnet (Chapel) chain id 338
const CHAIN = Number((import.meta.env as any).VITE_CHAIN_ID) || 338;
const CHAIN_NAME = (import.meta.env as any).VITE_CHAIN_NAME || (CHAIN === 25 ? 'Cronos Mainnet' : CHAIN === 338 ? 'Cronos Testnet (Chapel)' : 'Cronos ' + CHAIN);
// Native symbol (TCRO on testnet, CRO on mainnet) can be overridden with VITE_NATIVE_SYMBOL
const NATIVE_SYMBOL = (import.meta.env as any).VITE_NATIVE_SYMBOL || (CHAIN === 338 ? 'TCRO' : CHAIN === 25 ? 'CRO' : 'CRO');

const ABI = [
  { inputs: [{ type: 'uint256' }], name: 'quoteTPForCRO', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }, { type: 'uint256' }], name: 'swapCROForTPAndBurnLP', outputs: [], stateMutability: 'payable', type: 'function' }
];

const ERC20 = [{ inputs: [{ type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }];
const ERC20_EXT = [
  ...ERC20,
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' }
];

// Default RPC is Cronos testnet RPC (can be overridden by VITE_RPC_URL)
const RPC_URL = (import.meta.env as any).VITE_RPC_URL || 'https://evm-t3.cronos.org';

// Known UniswapV2-style pair for the TP/CRO liquidity
const LIQUIDITY_PAIR = '0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7';
const PAIR_ABI = [
  { inputs: [], name: 'getReserves', outputs: [{ type: 'uint112' }, { type: 'uint112' }, { type: 'uint32' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token0', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token1', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }
];

export default function ContractInteraction() {
  // Wagmi hooks for wallet connection
  const { address: wagmiAccount, isConnected: wagmiConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Local state
  const [account, setAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [chainOk, setChainOk] = useState(false);
  const [cro, setCro] = useState('');
  const [tp, setTp] = useState<string | null>(null);
  const [available, setAvailable] = useState<string | null>(null);
  const [slippage, setSlippage] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [priceTPperCRO, setPriceTPperCRO] = useState<string | null>(null);
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [pairExists, setPairExists] = useState<boolean | null>(null);
  const [pairReserves, setPairReserves] = useState<{ reserve0: string; reserve1: string } | null>(null);
  const [diagOutput, setDiagOutput] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [walletCro, setWalletCro] = useState<string | null>(null);
  const [contractDeployed, setContractDeployed] = useState<boolean | null>(null);

  const checkPairLiquidity = async (p?: any) => {
    try {
      const rpc = p || new ethers.providers.JsonRpcProvider(RPC_URL);
      const pair = new ethers.Contract(LIQUIDITY_PAIR, PAIR_ABI, rpc);
      const reserves: any = await pair.getReserves();
      const r0 = reserves[0];
      const r1 = reserves[1];
      setPairExists(true);
      // Try formatting using 18 decimals (common) but fall back to raw string if formatting fails
      try {
        setPairReserves({ reserve0: ethers.utils.formatUnits(r0, 18), reserve1: ethers.utils.formatUnits(r1, 18) });
      } catch (e) {
        setPairReserves({ reserve0: r0.toString(), reserve1: r1.toString() });
      }
      const hasLiquidity = r0.gt(0) && r1.gt(0);
      setNoLiquidity(!hasLiquidity);
      return { hasLiquidity, r0, r1 };
    } catch (err) {
      console.error('Pair lookup failed:', err);
      setPairExists(false);
      setPairReserves(null);
      return { hasLiquidity: false };
    }
  };

  // Check whether the Freequidity contract has code deployed at the configured address
  const checkContractDeployed = async (p?: any) => {
    try {
      const rpc = p || new ethers.providers.JsonRpcProvider(RPC_URL);
      const code = await rpc.getCode(CONTRACT);
      const deployed = !!code && code !== '0x';
      setContractDeployed(deployed);
      return deployed;
    } catch (err) {
      console.error('checkContractDeployed failed:', err);
      setContractDeployed(false);
      return false;
    }
  };

  const getPrice = async (p: any) => {
    try {
      const deployed = await checkContractDeployed(p).catch(()=>false);
      if (!deployed) {
        setError('Contract not deployed at ' + CONTRACT + ' — update the address or deploy Freequidity to Cronos.');
        setPriceTPperCRO(null);
        return;
      }
      setNoLiquidity(false);
      if (!p && (window as any).ethereum) {
        p = new ethers.providers.Web3Provider((window as any).ethereum);
        setProvider(p);
      }
      if (!p) throw new Error('No provider');
      const net = await p.getNetwork();
      if (net.chainId !== CHAIN) {
        setError('Wrong network -- switch to Cronos (25) to see price');
        setPriceTPperCRO(null);
        return;
      }
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const v = ethers.utils.parseEther('1');
      const t = await c.quoteTPForCRO(v);
      const f = ethers.utils.formatUnits(t, 18);
      const croPer1TP = (1 / Number(f)).toFixed(6);
      setPriceTPperCRO(croPer1TP);
    } catch (err: any) {
      console.error('getPrice primary provider failed:', err);
      // Try a public Cronos RPC fallback for read-only queries
      try {
        const rpc = new ethers.providers.JsonRpcProvider(RPC_URL);
        const c2 = new ethers.Contract(CONTRACT, ABI, rpc);
        const v2 = ethers.utils.parseEther('1');
        const t2 = await c2.quoteTPForCRO(v2);
        const f2 = ethers.utils.formatUnits(t2, 18);
        const croPer1TP2 = (1 / Number(f2)).toFixed(6);
        setPriceTPperCRO(croPer1TP2);
        setError(null);
        setNoLiquidity(false);
        return;
      } catch (err2: any) {
        console.error('Public RPC fallback also failed for getPrice:', err2);
        // Friendly user guidance when both reads fail (often means no liquidity/pair or contract reverted)
        setError('Price unavailable: contract read reverted or no liquidity/pair found (public RPC fallback also failed).');
        setNoLiquidity(true);
        setPriceTPperCRO(null);
      }
    }
  };

  const connect = async () => {
    try {
      setError(null);
      setNoLiquidity(false);
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('MetaMask not found');
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const p = new ethers.providers.Web3Provider(ethereum);
      const net = await p.getNetwork();
      setProvider(p);
      setAccount(accounts[0]);
      setConnected(true);
      setChainOk(net.chainId === CHAIN);
      if (net.chainId !== CHAIN) setError('Wrong network');
      // pass the freshly-requested account when available and fetch both wallet CRO and contract TP
      await getAvailable(p, accounts ? accounts[0] : undefined);
      await getContractAvailableTP(p);
      await getPrice(p);
      // check pair via public RPC so we can provide better UX when quote fails
      checkPairLiquidity().catch(()=>{});
    } catch (err: any) {
      setError(err.message);
      setConnected(false);
    }
  };

  // Fetch balances: wallet native CRO balance (available for trading)
  const getAvailable = async (p: any, addr?: string) => {
    try {
      const address = addr || account || wagmiAccount || (await p.getSigner().getAddress().catch(()=>null));
      if (!address) {
        setWalletCro(null);
        return;
      }
      const bal = await p.getBalance(address);
      const f = ethers.utils.formatEther(bal);
      // show up to 4 decimal CRO for readability
      setWalletCro(Number(f).toFixed(4));
    } catch (err) {
      console.error('getAvailable (wallet CRO) failed:', err);
      setWalletCro(null);
    }
  };

  // Fetch contract TP available (half of contract TP balance) for availability display
  const getContractAvailableTP = async (p?: any) => {
    try {
      const providerForRead = p || new ethers.providers.JsonRpcProvider(RPC_URL);
      const t = new ethers.Contract(TP_TOKEN, ERC20, providerForRead);
      const b = await t.balanceOf(CONTRACT);
      const a = b.div(2);
      const f = ethers.utils.formatUnits(a, 18);
      setAvailable(Number(f).toFixed(2));
    } catch (err) {
      console.error('getContractAvailableTP failed:', err);
      setAvailable(null);
    }
  };

  const quote = async () => {
    setNoLiquidity(false);
     // ensure we have a provider (support Wagmi-connected flows where provider may not be set)
     let p = provider;
     if (!p && (window as any).ethereum) {
       p = new ethers.providers.Web3Provider((window as any).ethereum);
       setProvider(p);
     }
     if (!p) { setError('No provider: please connect your wallet'); return; }
     if (!cro || Number(cro) <= 0) { setError('Enter amount'); return; }
     try {
       const net = await p.getNetwork();
       if (net.chainId !== CHAIN) { setError('Wrong network'); return; }
     } catch (err) {
       // ignore network errors
     }
     try {
      const deployed = await checkContractDeployed(provider).catch(()=>false);
      if (!deployed) {
        setError('Contract not deployed at ' + CONTRACT + ' — unable to quote.');
        return;
      }
       setError(null);
       const c = new ethers.Contract(CONTRACT, ABI, p);
       const v = ethers.utils.parseEther(cro);
       const t = await c.quoteTPForCRO(v);
      const f = ethers.utils.formatUnits(t, 18);
      setTp(Number(f).toFixed(2));
    } catch (err: any) {
      console.error('quote primary provider failed:', err);
      // If call reverted, try a read-only public RPC to see if quote works from a different provider
      if (err?.code === 'CALL_EXCEPTION' || String(err).includes('CALL_EXCEPTION')) {
        try {
          const rpc = new ethers.providers.JsonRpcProvider(RPC_URL);
          const c2 = new ethers.Contract(CONTRACT, ABI, rpc);
          const t2 = await c2.quoteTPForCRO(ethers.utils.parseEther(cro));
          const f2 = ethers.utils.formatUnits(t2, 18);
          setTp(Number(f2).toFixed(2));
          setSuccess('Quote fetched via public RPC (read-only)');
          setError(null);
          setNoLiquidity(false);
          // since public read succeeded, also refresh pair state
          checkPairLiquidity(rpc).catch(()=>{});
         return;
       } catch (err2: any) {
         console.error('Public RPC fallback failed for quote', err2);
          // Verify whether the pair exists and if its reserves are zero to show a clearer message
          const result = await checkPairLiquidity().catch(()=>({ hasLiquidity: false }));
          if (result && result.hasLiquidity === false && pairExists === true) {
            setError('Quote unavailable: pair exists but reserves appear to be zero (no liquidity).');
          } else if (pairExists === false) {
            setError('Quote unavailable: liquidity pair not found on-chain.');
          } else {
            setNoLiquidity(true);
            setError('Quote unavailable: contract read reverted or no liquidity/pair found (public RPC fallback also failed).');
          }
           return;
         }
       }

      // For other errors, show a shorter message and keep technical details in the console
      setError('Quote failed: ' + ((err && err.message) ? err.message : 'Unexpected error'));
    }
  };

  const switchToCronos = async () => {
    try {
      setError(null);
      if (!switchChain) throw new Error('Network switch not available');
      await switchChain({ chainId: CHAIN });
      setSuccess('Network switch requested');
    } catch (err: any) {
      setError('Switch failed: ' + (err?.message || String(err)));
    }
  };

  const runDiagnostics = async () => {
    setDiagnosing(true);
    setDiagOutput(null);
    try {
      const rpc = new ethers.providers.JsonRpcProvider(RPC_URL);
      const out: string[] = [];

      // Read router address and WETH/factory from the Freequidity contract
      try {
        const tpContract = new ethers.Contract(CONTRACT, [ { inputs: [], name: 'router', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' } ], rpc);
        const routerAddr = await tpContract.router();
        out.push('Router address (from contract): ' + routerAddr);
        // minimal router ABI for WETH and getAmountsOut and factory
        const ROUTER_MIN = [ { inputs: [], name: 'WETH', outputs: [{ type: 'address' }], stateMutability: 'pure', type: 'function' }, { inputs: [{ type: 'uint256' }, { type: 'address[]' }], name: 'getAmountsOut', outputs: [{ type: 'uint256[]' }], stateMutability: 'view', type: 'function' }, { inputs: [], name: 'factory', outputs: [{ type: 'address' }], stateMutability: 'pure', type: 'function' } ];
        const router = new ethers.Contract(routerAddr, ROUTER_MIN, rpc);
        try {
          const weth = await router.WETH();
          out.push('router.WETH(): ' + weth);
          const factoryAddr = await router.factory();
          out.push('router.factory(): ' + factoryAddr);
          // ask factory about the pair
          const FACTORY_MIN = [{ inputs: [{ type: 'address' }, { type: 'address' }], name: 'getPair', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }];
          const factory = new ethers.Contract(factoryAddr, FACTORY_MIN, rpc);
          const pairFromFactory = await factory.getPair(weth, TP_TOKEN);
          out.push('factory.getPair(weth, TP_TOKEN): ' + pairFromFactory + ' (expected ' + LIQUIDITY_PAIR + ')');

          // attempt getAmountsOut (capture revert details)
          try {
            const amounts = await router.getAmountsOut(ethers.utils.parseEther(cro || '1'), [weth, TP_TOKEN]);
            out.push('router.getAmountsOut success: ' + amounts.map((a: any) => ethers.utils.formatUnits(a, 18)).join(' / '));
          } catch (err: any) {
            out.push('router.getAmountsOut failed: ' + (err?.message || String(err)));
            if (err?.data) out.push('getAmountsOut error data: ' + String(err.data));
          }
        } catch (err: any) {
          out.push('router calls failed: ' + (err?.message || String(err)));
        }
      } catch (err: any) {
        out.push('Reading router from contract failed: ' + (err?.message || String(err)));
      }

      // 1) try quote on public RPC
      try {
        const c = new ethers.Contract(CONTRACT, ABI, rpc);
        const q = await c.quoteTPForCRO(ethers.utils.parseEther(cro || '1'));
        out.push('Public RPC quote: ' + ethers.utils.formatUnits(q, 18));
      } catch (err: any) {
        out.push('Public RPC quote failed: ' + (err?.message || String(err)));
        if (err?.data) out.push('Error data: ' + String(err.data));
      }

      // 2) pair info
      try {
        const pair = new ethers.Contract(LIQUIDITY_PAIR, PAIR_ABI, rpc);
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        out.push('Pair tokens: token0=' + token0 + ' token1=' + token1);
        const reserves: any = await pair.getReserves();
        out.push('Pair reserves raw: ' + reserves[0].toString() + ' / ' + reserves[1].toString());
      } catch (err: any) {
        out.push('Pair read failed: ' + (err?.message || String(err)));
      }

      // 3) token decimals & symbol for TP
      try {
        const t = new ethers.Contract(TP_TOKEN, ERC20_EXT, rpc);
        const dec = await t.decimals();
        const sym = await t.symbol();
        out.push('TP token: symbol=' + sym + ' decimals=' + dec.toString());
      } catch (err: any) {
        out.push('TP token metadata failed: ' + (err?.message || String(err)));
      }

      // show on-chain bytecode for the Freequidity address (helps detect proxies or wrong address)
      try {
        const code = await rpc.getCode(CONTRACT);
        out.push('Contract code length: ' + (code ? (code.length - 2) / 2 : 0) + ' bytes');
        out.push('Contract code prefix: ' + (code ? code.slice(0, 32) : '0x'));
      } catch (err: any) {
        out.push('getCode failed: ' + (err?.message || String(err)));
      }

      // Also show pair bytecode length for comparison
      try {
        const pcode = await rpc.getCode(LIQUIDITY_PAIR);
        out.push('Pair code length: ' + (pcode ? (pcode.length - 2) / 2 : 0) + ' bytes');
      } catch (err: any) {
        out.push('getCode(pair) failed: ' + (err?.message || String(err)));
      }

      setDiagOutput(out.join('\n'));
    } catch (err: any) {
      setDiagOutput('Diagnostics failed: ' + (err?.message || String(err)));
    } finally {
      setDiagnosing(false);
    }
  };

  // If the user connected via Wagmi (useAccount), initialize the local provider/state
  useEffect(() => {
    if (wagmiConnected && !provider) {
      if ((window as any).ethereum) {
        const p = new ethers.providers.Web3Provider((window as any).ethereum);
        setProvider(p);
        setAccount(wagmiAccount || null);
        setConnected(true);
        p.getNetwork().then((net) => setChainOk(net.chainId === CHAIN)).catch(()=>{});
        // refresh on connect
        getAvailable(p).catch(()=>{});
        getContractAvailableTP(p).catch(()=>{});
        getPrice(p).catch(()=>{});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagmiConnected, wagmiAccount]);

  const swap = async () => {
    if (!provider || !cro || !tp) { setError('Connect and enter amount'); return; }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);
      const s = provider.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const v = ethers.utils.parseEther(cro);
      const b = Math.round(parseFloat(slippage) * 100);
      const d = Math.floor(Date.now() / 1000) + 1200;
      const t = await c.swapCROForTPAndBurnLP(b, d, { value: v });
      setTxHash(t.hash);
      setSuccess('Tx submitted');
      await t.wait();
      setSuccess('Success');
      setCro('');
      setTp(null);
      await getAvailable(provider);
      await getContractAvailableTP(provider);
    } catch (err: any) {
      setError('Swap failed: ' + ((err && err.message) ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const url = (h: string) => 'https://cronoscan.com/tx/' + h;
  const slash = '/';
  const rarr = String.fromCharCode(8594);

  return (
    <div className='flex flex-col gap-6 rounded-lg border border-[#0b3350] bg-croilet-panel p-6 shadow-lg text-croilet-text'>
      <h2 className='text-2xl font-bold text-croilet-text neon-heading'>Trade {NATIVE_SYMBOL} for TP. Generate free liquidity: {NATIVE_SYMBOL} {rarr} TP</h2>
      <p className='text-sm text-gray-300'>Swap {NATIVE_SYMBOL} for TP with auto liquidity and LP burn.</p>
      {!wagmiConnected ? (
        <button 
          onClick={() => connect()} 
          disabled={isConnecting}
          className='rounded-lg bg-croilet-green px-6 py-3 font-semibold text-white hover:brightness-110 disabled:bg-gray-400'>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className='flex items-center justify-between rounded-lg p-4 bg-[#00102E]'>
          <p className='text-sm font-semibold text-white'>{wagmiAccount?.slice(0, 6)}...{wagmiAccount?.slice(-4)}</p>
          <button onClick={() => disconnect()} className='text-xs bg-black text-white px-3 py-1 rounded hover:brightness-110'>
             Disconnect
           </button>
         </div>
       )}
      {error && <div className='rounded-lg bg-red-100 p-4'><p className='text-sm text-red-900'>Error: {error}</p></div>}
      {success && <div className='rounded-lg bg-[#0b3b5a] p-4'><p className='text-sm text-white'>Success: {success}</p></div>}
      {txHash && (
        <div className='rounded-lg bg-blue-100 p-4'>
          <p className='text-xs text-blue-900'><a href={url(txHash)} target='_blank' rel='noreferrer' className='underline'>{txHash.slice(0, 10)}...{txHash.slice(-8)}</a></p>
        </div>
      )}
      {wagmiConnected && (
        <>
          {!chainOk && (
            <div className='mb-2 flex gap-2'>
              <button onClick={switchToCronos} className='rounded-md bg-white px-3 py-1 text-sm font-medium text-black'>Switch to {CHAIN_NAME} ({CHAIN})</button>
              <p className='text-sm text-yellow-300'>You are on the wrong network</p>
            </div>
          )}
          <div className='rounded-lg p-4 bg-croilet-darkpanel'>
            <p className='text-xs text-gray-300 break-words'>{CONTRACT}</p>
            <p className='mt-3 text-xs text-gray-300'>Contract Available TP: {available ? available + ' TP' : 'Loading'}</p>
            <p className='mt-3 text-xs text-gray-300'>Your Available {NATIVE_SYMBOL}: {walletCro ? walletCro + ' ' + NATIVE_SYMBOL : (connected ? 'Loading' : 'Not connected')}</p>
            {CONTRACT_FROM_ENV && <p className='mt-1 text-xs text-green-300'>Using contract address from VITE_FREEQUIDITY_ADDRESS env</p>}
            {contractDeployed === false && (
              <p className='mt-2 text-xs text-red-400'>Contract address has no deployed code on Cronos — update the `VITE_FREEQUIDITY_ADDRESS` env or deploy Freequidity to Cronos.</p>
            )}
          </div>
          <div className='flex flex-col gap-4'>
            <input type='number' value={cro} onChange={(e) => { setCro(e.target.value); setTp(null); }} placeholder={`0.0 (${NATIVE_SYMBOL})`} className='w-full rounded-lg border border-gray-600 bg-gray-800 text-white px-4 py-2 text-sm' />
            <button onClick={quote} disabled={!cro || Number(cro) <= 0} className='rounded-lg bg-white px-6 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed'>{tp ? 'Got: ' + tp + ' TP' : 'Get Quote'}</button>
            {/* Disable quoting if we know the contract is not deployed */}
            <div className='mt-2' />
            <button onClick={swap} disabled={loading || !tp || !chainOk} className='rounded-lg bg-[#0b3b5a] px-6 py-3 font-semibold text-white hover:brightness-110 disabled:bg-gray-400'>{loading ? 'Processing' : 'Swap'}</button>
          </div>
        </>
      )}
      <p className='text-xs text-gray-500'>{CHAIN_NAME} {CHAIN} — native token: {NATIVE_SYMBOL}</p>
    </div>
  );
}
