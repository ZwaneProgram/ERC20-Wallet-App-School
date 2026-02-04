import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ethers } from 'ethers';

export async function DELETE(request) {
  try {
    const { walletId, privateKey } = await request.json();

    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // derive address from given private key
    const testWallet = new ethers.Wallet(privateKey);

    if (testWallet.address.toLowerCase() !== wallet.address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 403 });
    }

    await prisma.wallet.delete({
      where: { id: walletId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
