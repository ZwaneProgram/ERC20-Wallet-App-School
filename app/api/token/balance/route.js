import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserFromRequest } from '@/lib/auth';
import { TOKEN_ABI } from '@/lib/tokenABI';

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

    // Get address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      );
    }

    // Setup provider
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

    // Connect to token contract
    const tokenContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      TOKEN_ABI,
      provider
    );

    // Get balance
    const balance = await tokenContract.balanceOf(address);
    const formattedBalance = ethers.formatUnits(balance, 18);

    // Get token info
    const [symbol, name] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name()
    ]);

    return NextResponse.json({
      address,
      balance: formattedBalance,
      symbol,
      name
    });

  } catch (error) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to check balance' },
      { status: 500 }
    );
  }
}