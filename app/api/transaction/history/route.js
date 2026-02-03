import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all USER transactions for this user (where type = 'user')
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.userId,
        type: 'user'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Get user transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user transactions' },
      { status: 500 }
    );
  }
}