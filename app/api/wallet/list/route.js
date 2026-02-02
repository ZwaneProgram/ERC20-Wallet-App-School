import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    // Check if user is authenticated
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get all wallets for this user
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: user.userId
      },
      select: {
        id: true,
        address: true,
        createdAt: true
        // Don't send private key to frontend for security
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ wallets });

  } catch (error) {
    console.error('Get wallets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}