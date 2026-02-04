"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { ethers } from "ethers";
import { TOKEN_ABI } from "@/lib/tokenABI";

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Balance states
  const [adminBalance, setAdminBalance] = useState("0");
  const [userBalance, setUserBalance] = useState("0");
  const [loadingAdminBalance, setLoadingAdminBalance] = useState(false);
  const [loadingUserBalance, setLoadingUserBalance] = useState(false);

  const [adminToAddress, setAdminToAddress] = useState("");
  const [adminAmount, setAdminAmount] = useState("");
  const [adminSending, setAdminSending] = useState(false);

  const [userToAddress, setUserToAddress] = useState("");
  const [userAmount, setUserAmount] = useState("");
  const [userSending, setUserSending] = useState(false);

  // Wallet management modal
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Send from generated wallet states
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendingFromGenerated, setSendingFromGenerated] = useState(false);

  // Delete wallet private key input
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteKey, setDeleteKey] = useState("");

  useEffect(() => {
    fetchUser();
    fetchWallets();
    fetchAdminTransactions();
    fetchUserTransactions();
    fetchAdminBalance();
  }, []);

  useEffect(() => {
    if (isConnected && address && user && !user.connectedWallet) {
      linkWallet(address);
    }
  }, [isConnected, address, user]);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserBalance();
    }
  }, [isConnected, address]);

  const fetchAdminBalance = async () => {
    setLoadingAdminBalance(true);
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com",
      );

      const tokenContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        TOKEN_ABI,
        provider,
      );

      const adminWallet = new ethers.Wallet(
        process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY,
      );

      const balance = await tokenContract.balanceOf(adminWallet.address);
      const formatted = ethers.formatUnits(balance, 18);
      setAdminBalance(parseFloat(formatted).toFixed(2));
    } catch (error) {
      console.error("Fetch admin balance error:", error);
      setAdminBalance("Error");
    } finally {
      setLoadingAdminBalance(false);
    }
  };

  const fetchUserBalance = async () => {
    if (!address) return;

    setLoadingUserBalance(true);
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com",
      );

      const tokenContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        TOKEN_ABI,
        provider,
      );

      const balance = await tokenContract.balanceOf(address);
      const formatted = ethers.formatUnits(balance, 18);
      setUserBalance(parseFloat(formatted).toFixed(2));
    } catch (error) {
      console.error("Fetch user balance error:", error);
      setUserBalance("0.00");
    } finally {
      setLoadingUserBalance(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Fetch user error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/wallet/list");
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error("Fetch wallets error:", error);
    }
  };

  const fetchAdminTransactions = async () => {
    try {
      const res = await fetch("/api/transaction/admin-history");
      if (res.ok) {
        const data = await res.json();
        setAdminTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Fetch admin transactions error:", error);
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const res = await fetch("/api/transaction/history");
      if (res.ok) {
        const data = await res.json();
        setUserTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Fetch user transactions error:", error);
    }
  };

  const linkWallet = async (walletAddress) => {
    try {
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (res.ok) {
        alert("Wallet linked successfully!");
        fetchUser();
      }
    } catch (error) {
      console.error("Link wallet error:", error);
    }
  };

  const generateWallet = async () => {
    try {
      const res = await fetch("/api/wallet/generate", { method: "POST" });
      if (res.ok) {
        alert("Wallet generated!");
        fetchWallets();
      }
    } catch (error) {
      alert("Failed to generate wallet");
    }
  };

  const deleteWallet = async (walletId) => {
    if (
      !confirm(
        "Are you sure you want to delete this wallet? This cannot be undone!",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/wallet/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId }),
      });

      if (res.ok) {
        alert("Wallet deleted!");
        fetchWallets();
        setShowWalletModal(false);
      } else {
        alert("Failed to delete wallet");
      }
    } catch (error) {
      alert("Failed to delete wallet");
    }
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminToAddress || !adminAmount) {
      alert("Please fill in all fields");
      return;
    }

    setAdminSending(true);
    try {
      const res = await fetch("/api/token/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: adminToAddress,
          amount: adminAmount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Tokens sent! Tx: " + data.txHash);
        setAdminToAddress("");
        setAdminAmount("");
        fetchAdminTransactions();
        fetchAdminBalance();
      } else {
        alert("Failed: " + data.error);
      }
    } catch (error) {
      alert("Failed to send tokens");
    } finally {
      setAdminSending(false);
    }
  };

  const handleUserSend = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect MetaMask first!");
      return;
    }

    if (chainId !== sepolia.id) {
      try {
        await switchChain({ chainId: sepolia.id });
      } catch (error) {
        alert("Please switch to Sepolia network in MetaMask");
        return;
      }
    }

    if (!userToAddress || !userAmount) {
      alert("Please fill in all fields");
      return;
    }

    setUserSending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        TOKEN_ABI,
        signer,
      );

      const amountInWei = ethers.parseUnits(userAmount.toString(), 18);
      const tx = await tokenContract.transfer(userToAddress, amountInWei);

      alert("Waiting for confirmation...");
      const receipt = await tx.wait();

      await fetch("/api/token/send-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: userToAddress,
          amount: userAmount,
          txHash: receipt.hash,
        }),
      });

      alert("Success! Tx: " + receipt.hash);
      setUserToAddress("");
      setUserAmount("");
      fetchUserTransactions();
      fetchUserBalance();
    } catch (error) {
      alert("Failed: " + error.message);
    } finally {
      setUserSending(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0">
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Gone Token
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  Connected Wallet
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isConnected ? "✓" : "✗"}
                </p>
              </div>
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  Generated Wallets
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {wallets.length}
                </p>
              </div>
              <div className="bg-green-100 text-green-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {adminTransactions.length + userTransactions.length}
                </p>
              </div>
              <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              🔗 Wallet Connection
            </h2>

            {isConnected && (
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-3xl transition-all shadow-sm"
              >
                Disconnect Wallet
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-8">
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mb-4">
                <p className="text-sm sm:text-base text-gray-700 mb-6">
                  Connect your MetaMask wallet to send tokens
                </p>
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  🦊 Connect MetaMask
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4 sm:p-6">
              <p className="text-green-700 font-semibold mb-2 flex items-center">
                <span className="bg-green-500 w-2 h-2 rounded-full mr-2 animate-pulse"></span>
                Connected
              </p>

              <div className="flex gap-2 items-center">
                <p className="flex-1 font-mono text-xs sm:text-sm text-gray-700 bg-white px-3 py-2 rounded border border-green-200 break-all">
                  {address}
                </p>

                <button
                  onClick={() => copyToClipboard(address)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  Copy
                </button>
              </div>

              {user?.connectedWallet && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Linked to your account
                </p>
              )}
            </div>
          )}
        </div>

        {/* Generated Wallets */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                📥 Generated Wallets
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                This is generate wallets that you can use to send and receive
                "Gone" tokens.
              </p>
              <p className="text-xs sm:text-sm text-gray-500 font-bold mt-1">
                **You need gas fees to send tokens (send gas to this wallet
                address)**
              </p>
            </div>
            <button
              onClick={generateWallet}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex-shrink-0"
            >
              + Generate New
            </button>
          </div>

          {wallets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-gray-500 font-medium">
                No wallets generated yet
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Click "Generate New" to create addresses
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet, idx) => (
                <div
                  key={wallet.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-gray-50 to-blue-50 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all gap-3"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs sm:text-sm text-gray-700 break-all">
                        {wallet.address}
                      </span>
                      <span className="text-xs text-gray-500">
                        Balance: {wallet.balance} Gone
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:ml-4">
                    <button
                      onClick={() => copyToClipboard(wallet.address)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWallet(wallet);
                        setSendTo("");
                        setSendAmount("");
                        setShowWalletModal(true);
                      }}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Tokens Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Admin Send */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  💸 Send Tokens (Admin)
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Send tokens from the admin wallet to any address. This uses
                  the master wallet.
                </p>
              </div>
              <button
                onClick={fetchAdminBalance}
                disabled={loadingAdminBalance}
                className="ml-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
              >
                🔄
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6 border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Admin Wallet Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">
                {loadingAdminBalance ? (
                  <span className="text-base sm:text-lg">Loading...</span>
                ) : (
                  `${adminBalance} Gone`
                )}
              </p>
            </div>

            <form onSubmit={handleAdminSend} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={adminToAddress}
                  onChange={(e) => setAdminToAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all font-mono text-xs sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (Gone)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adminAmount}
                  onChange={(e) => setAdminAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all text-sm sm:text-base"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={adminSending}
                className="w-full py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {adminSending ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send from Admin Wallet"
                )}
              </button>
            </form>
          </div>

          {/* User Send */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  💰 Send My Tokens
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Send tokens from your connected wallet to any address.
                  Peer-to-peer transfer.
                </p>
              </div>
              {isConnected && (
                <button
                  onClick={fetchUserBalance}
                  disabled={loadingUserBalance}
                  className="ml-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                >
                  🔄
                </button>
              )}
            </div>

            {!isConnected ? (
              <div className="text-center py-12 sm:py-16 bg-amber-50 rounded-lg border-2 border-dashed border-amber-200">
                <svg
                  className="mx-auto h-12 w-12 text-amber-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-amber-700 font-medium text-sm sm:text-base">
                  Connect your wallet first
                </p>
                <p className="text-xs sm:text-sm text-amber-600 mt-1">
                  Use MetaMask to send tokens
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">
                    Your Wallet Balance
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                    {loadingUserBalance ? (
                      <span className="text-base sm:text-lg">Loading...</span>
                    ) : (
                      `${userBalance} Gone`
                    )}
                  </p>
                </div>

                <form onSubmit={handleUserSend} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={userToAddress}
                      onChange={(e) => setUserToAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all font-mono text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount (Gone)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={userAmount}
                      onChange={(e) => setUserAmount(e.target.value)}
                      placeholder="50"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all text-sm sm:text-base"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={userSending}
                    className="w-full py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {userSending ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Send My Tokens"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-6 sm:space-y-8">
          {/* Admin Transactions */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
              📊 Admin Transactions
            </h2>
            {adminTransactions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm sm:text-base">
                  No admin transactions yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          From
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          To
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Amount
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Status
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase hidden sm:table-cell">
                          Transaction
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase hidden md:table-cell">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-gray-700">
                            {tx.from.slice(0, 6)}...
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-gray-700">
                            {tx.to.slice(0, 6)}...
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900 text-xs sm:text-sm">
                            {tx.amount}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                                tx.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                            >
                              View →
                            </a>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* User Transactions */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
              💳 My Transactions
            </h2>
            {userTransactions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm sm:text-base">
                  No user transactions yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          From
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          To
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Amount
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Status
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase hidden sm:table-cell">
                          Transaction
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase hidden md:table-cell">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-gray-700">
                            {tx.from.slice(0, 6)}...
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-mono text-xs text-gray-700">
                            {tx.to.slice(0, 6)}...
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900 text-xs sm:text-sm">
                            {tx.amount}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                                tx.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                            >
                              View →
                            </a>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Management Modal */}
      {showWalletModal && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Manage Wallet
              </h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedWallet.address}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs sm:text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(selectedWallet.address)}
                    className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Send Tokens */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Control Gen Wallet
                </label>
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="font-semibold text-gray-800">Send Tokens</h4>

                  <input
                    type="text"
                    placeholder="To address"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />

                  <input
                    type="number"
                    placeholder="Amount"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />

                  <button
                    disabled={sendingFromGenerated}
                    onClick={async () => {
                      if (!sendTo || !sendAmount) {
                        alert("Fill all fields");
                        return;
                      }

                      setSendingFromGenerated(true);

                      const res = await fetch("/api/wallet/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          walletId: selectedWallet.id,
                          toAddress: sendTo,
                          amount: sendAmount,
                        }),
                      });

                      const data = await res.json();

                      if (res.ok) {
                        alert("Tx: " + data.txHash);
                        setSendTo("");
                        setSendAmount("");
                        fetchWallets();
                      } else {
                        alert(data.error);
                      }

                      setSendingFromGenerated(false);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    {sendingFromGenerated
                      ? "Sending..."
                      : "Send from this wallet"}
                  </button>
                </div>
              </div>

              {/* Delete button (opens second modal) */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                >
                  Delete Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showDeleteModal && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Confirm Delete Wallet
            </h3>

            <p className="text-sm text-red-600 mb-4">
              This action is permanent. Enter the private key to confirm.
            </p>

            <input
              type="text"
              placeholder="Enter private key"
              value={deleteKey}
              onChange={(e) => setDeleteKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteKey("");
                }}
                className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!deleteKey) {
                    alert("Enter private key");
                    return;
                  }

                  const res = await fetch("/api/wallet/delete", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      walletId: selectedWallet.id,
                      privateKey: deleteKey,
                    }),
                  });

                  const data = await res.json();

                  if (res.ok) {
                    alert("Wallet deleted");
                    fetchWallets();
                    setShowDeleteModal(false);
                    setShowWalletModal(false);
                    setDeleteKey("");
                  } else {
                    alert(data.error);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
