'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Token transfer state
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    checkAuth();
    loadWallets();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadWallets = async () => {
    try {
      const res = await fetch('/api/wallet/list');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const generateWallet = async () => {
    setGenerating(true);
    setError('');
    
    try {
      const res = await fetch('/api/wallet/generate', {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate wallet');
        setGenerating(false);
        return;
      }

      // Reload wallets list
      await loadWallets();
      setGenerating(false);
    } catch (err) {
      setError('Something went wrong');
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Address copied to clipboard!');
  };

  const sendTokens = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendError('');
    setSendSuccess('');
    setTxHash('');

    try {
      const res = await fetch('/api/token/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress: sendToAddress,
          amount: sendAmount
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error || 'Failed to send tokens');
        setSending(false);
        return;
      }

      setSendSuccess(`Successfully sent ${sendAmount} Gone tokens!`);
      setTxHash(data.transaction.hash);
      setSendToAddress('');
      setSendAmount('');
      setSending(false);
    } catch (err) {
      setSendError('Something went wrong');
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Crypto Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Welcome! 🎉</h2>
          <p className="text-gray-600">
            You're logged in as: <strong>{user?.email}</strong>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold mb-2">Token Info</h3>
          <p className="text-gray-600">Symbol: <strong>Gone</strong></p>
          <p className="text-gray-600 text-sm break-all">
            Contract: <strong>0x4167E4CC76A9Bab53D3Aa08D9FaA92aD3De35a55</strong>
          </p>
        </div>

        {/* Wallet Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">My Wallets ({wallets.length})</h3>
            <button
              onClick={generateWallet}
              disabled={generating}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 font-semibold"
            >
              {generating ? 'Generating...' : '+ Generate Wallet'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {wallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No wallets yet</p>
              <p className="text-sm">Click "Generate Wallet" to create your first wallet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Wallet #{wallet.id}</p>
                      <p className="font-mono text-sm break-all">{wallet.address}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(wallet.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(wallet.address)}
                      className="ml-4 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token Transfer Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Send Tokens</h3>
          
          {sendError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {sendError}
            </div>
          )}

          {sendSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-semibold">{sendSuccess}</p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline hover:text-green-800"
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          )}

          <form onSubmit={sendTokens}>
            <div className="mb-4">
              <label htmlFor="toAddress" className="block text-gray-700 mb-2 font-semibold">
                Wallet Address
              </label>
              <input
                type="text"
                id="toAddress"
                value={sendToAddress}
                onChange={(e) => setSendToAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the recipient's Ethereum address
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="amount" className="block text-gray-700 mb-2 font-semibold">
                Amount (Gone Tokens)
              </label>
              <input
                type="number"
                id="amount"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="100"
                step="0.000000000000000001"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                How many tokens to send
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 disabled:bg-green-300 font-semibold text-lg"
            >
              {sending ? 'Sending...' : 'Send Tokens'}
            </button>
          </form>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> You can send tokens to any of your generated wallets above, or any other Ethereum address!
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}