'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { TOKEN_ABI } from '@/lib/tokenABI';

// Use the full token ABI for proper token transfers
const tokenABI = TOKEN_ABI;

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adminToAddress, setAdminToAddress] = useState('');
  const [adminAmount, setAdminAmount] = useState('');
  const [adminSending, setAdminSending] = useState(false);

  const [userToAddress, setUserToAddress] = useState('');
  const [userAmount, setUserAmount] = useState('');
  const [userSending, setUserSending] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchWallets();
    fetchAdminTransactions();
    fetchUserTransactions();
  }, []);

  useEffect(() => {
    if (isConnected && address && user && !user.connectedWallet) {
      linkWallet(address);
    }
  }, [isConnected, address, user]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/wallet/list');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error('Fetch wallets error:', error);
    }
  };

  const fetchAdminTransactions = async () => {
    try {
      const res = await fetch('/api/transaction/admin-history');
      if (res.ok) {
        const data = await res.json();
        setAdminTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Fetch admin transactions error:', error);
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const res = await fetch('/api/transaction/history');
      if (res.ok) {
        const data = await res.json();
        setUserTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Fetch user transactions error:', error);
    }
  };

  const linkWallet = async (walletAddress) => {
    try {
      const res = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });

      if (res.ok) {
        alert('Wallet linked successfully!');
        fetchUser();
      }
    } catch (error) {
      console.error('Link wallet error:', error);
    }
  };

  const generateWallet = async () => {
    try {
      const res = await fetch('/api/wallet/generate', { method: 'POST' });
      if (res.ok) {
        alert('Wallet generated!');
        fetchWallets();
      }
    } catch (error) {
      alert('Failed to generate wallet');
    }
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminToAddress || !adminAmount) {
      alert('Please fill in all fields');
      return;
    }

    setAdminSending(true);
    try {
      const res = await fetch('/api/token/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toAddress: adminToAddress, amount: adminAmount })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Tokens sent! Tx: ' + data.txHash);
        setAdminToAddress('');
        setAdminAmount('');
        fetchAdminTransactions();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Failed to send tokens');
    } finally {
      setAdminSending(false);
    }
  };

  const handleUserSend = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect MetaMask first!');
      return;
    }

    if (!userToAddress || !userAmount) {
      alert('Please fill in all fields');
      return;
    }

    // Validate contract address is set
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      alert('Error: Token contract address is not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment variables.');
      return;
    }

    // Validate address format
    if (!ethers.isAddress(userToAddress)) {
      alert('Invalid recipient address format');
      return;
    }

    setUserSending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create token contract instance - this will send tokens, NOT ETH
      const tokenContract = new ethers.Contract(
        contractAddress,
        tokenABI,
        signer
      );

      // Convert amount to wei (18 decimals for ERC-20 tokens)
      const amountInWei = ethers.parseUnits(userAmount.toString(), 18);
      
      // Call the token's transfer function - this sends tokens, not ETH
      // The transaction value will be 0 ETH (only gas fees are paid in ETH)
      const tx = await tokenContract.transfer(userToAddress, amountInWei);
      
      alert('Transaction submitted! Waiting for confirmation...');
      const receipt = await tx.wait();

      // Log transaction to database
      await fetch('/api/token/send-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress: userToAddress,
          amount: userAmount,
          txHash: receipt.hash
        })
      });

      alert('Success! Tokens sent. Transaction: ' + receipt.hash);
      setUserToAddress('');
      setUserAmount('');
      fetchUserTransactions();

    } catch (error) {
      console.error('Send token error:', error);
      if (error.message.includes('insufficient funds')) {
        alert('Insufficient funds: You need ETH to pay for gas fees (network fees). The token transfer itself is separate.');
      } else if (error.message.includes('user rejected')) {
        alert('Transaction cancelled by user');
      } else {
        alert('Failed to send tokens: ' + error.message);
      }
    } finally {
      setUserSending(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl">
                G
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gone Token</h1>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Connected Wallet</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isConnected ? '✓' : '✗'}
                </p>
              </div>
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Generated Wallets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{wallets.length}</p>
              </div>
              <div className="bg-green-100 text-green-600 w-12 h-12 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {adminTransactions.length + userTransactions.length}
                </p>
              </div>
              <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">🔗 Wallet Connection</h2>
          </div>
          
          {!isConnected ? (
            <div className="text-center py-8">
              <div className="bg-blue-50 rounded-lg p-6 mb-4">
                <p className="text-gray-700 mb-6">Connect your MetaMask wallet to send tokens</p>
                <button 
                  onClick={() => connect({ connector: connectors[0] })}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  🦊 Connect MetaMask
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-green-700 font-semibold mb-2 flex items-center">
                    <span className="bg-green-500 w-2 h-2 rounded-full mr-2 animate-pulse"></span>
                    Connected
                  </p>
                  <p className="font-mono text-sm text-gray-700 bg-white px-3 py-2 rounded border border-green-200 break-all">
                    {address}
                  </p>
                  {user?.connectedWallet && (
                    <p className="text-xs text-green-600 mt-2">✓ Linked to your account</p>
                  )}
                </div>
                <button 
                  onClick={() => disconnect()}
                  className="ml-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-all"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generated Wallets */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">📥 Generated Wallets</h2>
            <button 
              onClick={generateWallet}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              + Generate New
            </button>
          </div>
          
          {wallets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 font-medium">No wallets generated yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Generate New" to create receive-only addresses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet, idx) => (
                <div key={wallet.id} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="font-mono text-sm text-gray-700 break-all">{wallet.address}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(wallet.address)}
                    className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Tokens Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Admin Send */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">💸 Send Tokens (Admin)</h2>
            <form onSubmit={handleAdminSend} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Address</label>
                <input 
                  type="text" 
                  value={adminToAddress} 
                  onChange={(e) => setAdminToAddress(e.target.value)} 
                  placeholder="0x..." 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (Gone)</label>
                <input 
                  type="number" 
                  value={adminAmount} 
                  onChange={(e) => setAdminAmount(e.target.value)} 
                  placeholder="100" 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={adminSending}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adminSending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : 'Send from Admin Wallet'}
              </button>
            </form>
          </div>

          {/* User Send */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">💰 Send My Tokens</h2>
            {!isConnected ? (
              <div className="text-center py-16 bg-amber-50 rounded-lg border-2 border-dashed border-amber-200">
                <svg className="mx-auto h-12 w-12 text-amber-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-700 font-medium">Connect your wallet first</p>
                <p className="text-sm text-amber-600 mt-1">Use MetaMask to send tokens</p>
              </div>
            ) : (
              <form onSubmit={handleUserSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Address</label>
                  <input 
                    type="text" 
                    value={userToAddress} 
                    onChange={(e) => setUserToAddress(e.target.value)} 
                    placeholder="0x..." 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (Gone)</label>
                  <input 
                    type="number" 
                    value={userAmount} 
                    onChange={(e) => setUserAmount(e.target.value)} 
                    placeholder="50" 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={userSending}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {userSending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send My Tokens'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-8">
          {/* Admin Transactions */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📊 Admin Transactions</h2>
            {adminTransactions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No admin transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">From</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Transaction</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adminTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{tx.from.slice(0, 10)}...</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{tx.to.slice(0, 10)}...</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{tx.amount} Gone</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.status === 'success' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                          >
                            View →
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Transactions */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">💳 My Transactions</h2>
            {userTransactions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No user transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">From</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Transaction</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{tx.from.slice(0, 10)}...</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{tx.to.slice(0, 10)}...</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{tx.amount} Gone</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.status === 'success' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                          >
                            View →
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}