import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserFromRequest } from '@/lib/auth';
import { TOKEN_ABI } from '@/lib/tokenABI';

export async function POST(request) {
  try {
    // Check if user is authenticated
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { toAddress, amount } = await request.json();

    // Validate inputs
    if (!toAddress || !amount) {
      return NextResponse.json(
        { error: 'Recipient address and amount are required' },
        { status: 400 }
      );
    }

    // Validate Ethereum address
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    // Connect to token contract
    const tokenContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      TOKEN_ABI,
      adminWallet
    );

    // Convert amount to token units (18 decimals)
    const amountInWei = ethers.parseUnits(amount.toString(), 18);

    // Check balance
    const balance = await tokenContract.balanceOf(adminWallet.address);
    if (balance < amountInWei) {
      return NextResponse.json(
        { error: 'Insufficient token balance' },
        { status: 400 }
      );
    }

    // Send tokens
    const tx = await tokenContract.transfer(toAddress, amountInWei);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();

    return NextResponse.json({
      message: 'Tokens sent successfully',
      transaction: {
        hash: receipt.hash,
        from: adminWallet.address,
        to: toAddress,
        amount: amount,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Token transfer error:', error);
    
    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        { error: 'Insufficient ETH for gas fees' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send tokens' },
      { status: 500 }
    );
  }
}