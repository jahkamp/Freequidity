// scripts/add-liquidity.cjs
// Adds TP/CRO liquidity on Cronos testnet and optionally funds the Freequidity contract.
// Usage (PowerShell):
// $env:PRIVATE_KEY = '0x...'; $env:CRONOS_TESTNET_URL='https://evm-t3.cronos.org'; $env:ETH_AMOUNT='50'; $env:CRO_PER_TP='5'; $env:FUND_TP='100'; node scripts/add-liquidity.cjs

const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const CRONOS_RPC = process.env.CRONOS_TESTNET_URL || 'https://evm-t3.cronos.org';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY required in env');

  const TP_TOKEN = process.env.TP_TOKEN || '0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948'; // TTP testnet
  const ROUTER = process.env.ROUTER || '0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7';
  const FREEQUIDITY_ADDR = process.env.FREEQUIDITY_ADDR || (fs.existsSync('./deployed-address.json') ? JSON.parse(fs.readFileSync('./deployed-address.json','utf8')).Freequidity : undefined);

  const ethAmountCRO = process.env.ETH_AMOUNT || '50'; // CRO to deposit into the pair (in CRO units)
  const CRO_PER_TP = Number(process.env.CRO_PER_TP || '5'); // e.g., 5 CRO per 1 TP
  const FUND_TP = process.env.FUND_TP; // optional amount of TP to transfer to contract (in TP units)

  console.log('Provider:', CRONOS_RPC);
  console.log('Router:', ROUTER);
  console.log('TP token:', TP_TOKEN);
  console.log('Freequidity to fund:', FREEQUIDITY_ADDR || '(none)');
  console.log('ETH (CRO) amount:', ethAmountCRO, 'CRO');
  console.log('CRO per 1 TP:', CRO_PER_TP);

  const provider = new ethers.providers.JsonRpcProvider(CRONOS_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // minimal ABIs
  const ERC20 = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ];
  const ROUTER_ABI = [
    'function WETH() external pure returns (address)',
    'function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)'
  ];

  const tp = new ethers.Contract(TP_TOKEN, ERC20, wallet);
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet);

  const ethAmountWei = ethers.utils.parseEther(ethAmountCRO);
  // For CRO_PER_TP = 5 (5 CRO per 1 TP), token per CRO = 1 / 5
  // tokenAmount = ethAmountWei / CRO_PER_TP
  const tokenAmountWei = ethAmountWei.div(CRO_PER_TP);

  console.log('Computed token amount (TP) wei:', tokenAmountWei.toString());

  // Approve router for tokenAmount
  console.log('Approving router to spend TP...');
  const approveTx = await tp.approve(ROUTER, tokenAmountWei);
  await approveTx.wait();
  console.log('Approve confirmed:', approveTx.hash);

  // set minimums (1% slippage)
  const minToken = tokenAmountWei.mul(99).div(100);
  const minEth = ethAmountWei.mul(99).div(100);
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  console.log('Adding liquidity: token=', ethers.utils.formatEther(tokenAmountWei), 'TP ; eth=', ethers.utils.formatEther(ethAmountWei), 'CRO');
  const addTx = await router.addLiquidityETH(
    TP_TOKEN,
    tokenAmountWei,
    minToken,
    minEth,
    wallet.address,
    deadline,
    { value: ethAmountWei }
  );
  const addReceipt = await addTx.wait();
  console.log('Add liquidity tx:', addTx.hash);
  console.log('Liquidity added. Receipt status:', addReceipt.status);

  // Optionally fund the deployed Freequidity contract with TP
  if (FREEQUIDITY_ADDR) {
    const fundAmount = FUND_TP ? ethers.utils.parseEther(FUND_TP) : tokenAmountWei.mul(10); // default: 10x the pool tokenAmount
    console.log('Funding Freequidity contract', FREEQUIDITY_ADDR, 'with', ethers.utils.formatEther(fundAmount), 'TP');
    const fundTx = await tp.transfer(FREEQUIDITY_ADDR, fundAmount);
    await fundTx.wait();
    console.log('Fund tx:', fundTx.hash);
  } else {
    console.log('No Freequidity address configured; skipping funding step. To fund, set FREEQUIDITY_ADDR in env or deployed-address.json must exist.');
  }

  console.log('Done. Verify pair reserves and UI diagnostics to confirm price reflects 5 CRO per 1 TP.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});