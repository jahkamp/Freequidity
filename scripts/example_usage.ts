import { ethers } from "ethers";
import fs from "fs";

// Example: how to call Freequidity.swapCROForTPAndBurnLP from a Node script using ethers
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
  const signer = provider.getSigner();

  const abi = JSON.parse(fs.readFileSync("artifacts/abis/Freequidity.abi.json", "utf8"));
  const addr = process.env.TPCRO_ADDR || "<DEPLOYED_ADDRESS>";
  const contract = new ethers.Contract(addr, abi, signer);

  const tx = await contract.swapCROForTPAndBurnLP(100 /* slippage bips */, Math.floor(Date.now() / 1000) + 300, { value: ethers.utils.parseEther("0.1") });
  console.log("tx hash", tx.hash);
  const receipt = await tx.wait();
  console.log("receipt", receipt.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
