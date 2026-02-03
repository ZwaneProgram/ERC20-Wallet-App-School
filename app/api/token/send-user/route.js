import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { toAddress, amount, txHash } = await request.json();

    // Get user's connected wallet
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { connectedWallet: true }
    });

    if (!userData?.connectedWallet) {
      return NextResponse.json(
        { error: 'No wallet connected. Please connect your wallet first.' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!toAddress || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log the transaction
    await prisma.transaction.create({
      data: {
        from: userData.connectedWallet,
        to: toAddress,
        amount: amount,
        txHash: txHash,
        status: 'success',
        type: 'user',
        userId: user.userId
      }
    });

    return NextResponse.json({
      message: 'Transaction logged successfully',
      txHash: txHash
    });

  } catch (error) {
    console.error('Send user tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction' },
      { status: 500 }
    );
  }
}