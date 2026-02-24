import { ethers } from 'ethers';
import { CONFESSION_ABI, CONTRACT_ADDRESS, BASE_RPC } from './contract';

// Server-side only — sends confession tx from app wallet
export async function postConfessionOnChain(params: {
  sinnerAddress: string;
  confessionText: string;
  sinCategory: string;
  sinLevel: string;
  aiResponse: string;
}): Promise<{ txHash: string; onChainId: number } | null> {
  const privateKey = process.env.APP_WALLET_PRIVATE_KEY;

  if (!privateKey || !CONTRACT_ADDRESS) {
    console.warn('[Chain] Skipping on-chain: missing APP_WALLET_PRIVATE_KEY or CONFESSION_CONTRACT_ADDRESS');
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONFESSION_ABI, wallet);

    // Truncate text if too long to save gas (keep under 500 chars each)
    const text = params.confessionText.slice(0, 500);
    const aiResp = params.aiResponse.slice(0, 500);

    console.log(`[Chain] Posting confession for ${params.sinnerAddress.slice(0, 10)}...`);

    const tx = await contract.confess(
      params.sinnerAddress,
      text,
      params.sinCategory,
      params.sinLevel,
      aiResp
    );

    console.log(`[Chain] Tx sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Chain] Confirmed in block ${receipt.blockNumber}`);

    // Parse event to get on-chain confession ID
    let onChainId = -1;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed && parsed.name === 'ConfessionPosted') {
          onChainId = Number(parsed.args[0]);
        }
      } catch { /* skip unparseable logs */ }
    }

    return { txHash: tx.hash, onChainId };
  } catch (err: any) {
    console.error('[Chain] Failed to post on-chain:', err.message || err);
    return null;
  }
}
