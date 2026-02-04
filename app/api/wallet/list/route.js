import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { ethers } from 'ethers';
import { TOKEN_ABI } from '@/lib/tokenABI';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' }
    });

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const token = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      TOKEN_ABI,
      provider
    );

    const walletsWithBalance = await Promise.all(
      wallets.map(async (w) => {
        const bal = await token.balanceOf(w.address);
        return {
          id: w.id,
          address: w.address,
          privateKey: w.privateKey,
          createdAt: w.createdAt,
          balance: ethers.formatUnits(bal, 18)
        };
      })
    );

    return NextResponse.json({ wallets: walletsWithBalance });

  } catch (error) {
    console.error('Get wallets error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
  }
}
