import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ethers } from 'ethers';
import { TOKEN_ABI } from '@/lib/tokenABI';

export async function POST(request) {
  try {
    const { walletId, toAddress, amount } = await request.json();

    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const signer = new ethers.Wallet(wallet.privateKey, provider);

    const token = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      TOKEN_ABI,
      signer
    );

    const tx = await token.transfer(
      toAddress,
      ethers.parseUnits(amount.toString(), 18)
    );

    await tx.wait();

    return NextResponse.json({ txHash: tx.hash });

  } catch (error) {
    console.error('Send wallet error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
