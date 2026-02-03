import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Your token ABI (ERC-20 transfer function)
const tokenABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { toAddress, amount } = await request.json();

    if (!toAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Setup ethers
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      tokenABI,
      adminWallet
    );

    // Convert amount to wei (18 decimals)
    const amountInWei = ethers.parseUnits(amount.toString(), 18);

    // Send transaction
    const tx = await tokenContract.transfer(toAddress, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();

    // Log transaction to database
    await prisma.transaction.create({
      data: {
        from: adminWallet.address,
        to: toAddress,
        amount: amount.toString(),
        txHash: receipt.hash,
        status: 'success',
        type: 'admin',
        userId: user.userId
      }
    });

    return NextResponse.json({
      message: 'Tokens sent successfully',
      txHash: receipt.hash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`
    });

  } catch (error) {
    console.error('Admin send error:', error);
    
    // Try to log failed transaction
    try {
      const { toAddress, amount } = await request.json();
      const user = getUserFromRequest(request);
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
      
      await prisma.transaction.create({
        data: {
          from: adminWallet.address,
          to: toAddress || 'unknown',
          amount: amount?.toString() || '0',
          txHash: 'failed-' + Date.now(),
          status: 'failed',
          type: 'admin',
          userId: user.userId
        }
      });
    } catch (logError) {
      console.error('Failed to log error transaction:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to send tokens: ' + error.message },
      { status: 500 }
    );
  }
}