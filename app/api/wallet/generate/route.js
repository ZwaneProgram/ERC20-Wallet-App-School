import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const wallet = ethers.Wallet.createRandom();

    const savedWallet = await prisma.wallet.create({
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey, // ✅ STORE RAW KEY
        userId: user.userId
      }
    });

    return NextResponse.json({
      message: 'Wallet created successfully',
      wallet: {
        id: savedWallet.id,
        address: savedWallet.address,
        createdAt: savedWallet.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Wallet generation error:', error);
    return NextResponse.json({ error: 'Failed to generate wallet' }, { status: 500 });
  }
}
