import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axiosConfig';
import LoadingSpinner from '../common/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTransactions: 0,
    totalEscrowBalance: 0,
    propertiesCount: 0,
    completedDeals: 0
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [myProperties, setMyProperties] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch properties
      const propResponse = await axios.get('/properties');
      const propertiesList = propResponse.data.data || [];

      // Filter properties owned by seller
      const sellerProps = propertiesList.filter(p => p.seller?._id === user?.id);
      setMyProperties(sellerProps);

      // Fetch transactions
      const txnResponse = await axios.get('/transactions');
      const txnList = txnResponse.data.data || [];
      setRecentTxns(txnList.slice(0, 5)); // show top 5

      // Calculate stats based on user role
      let active = 0;
      let escrowHeld = 0;
      let completed = 0;

      txnList.forEach(t => {
        if (['PENDING', 'FUNDS_DEPOSITED', 'MUTATION_INITIATED', 'MUTATION_IN_PROGRESS', 'MUTATION_COMPLETED'].includes(t.status)) {
          active++;
          if (t.escrowAccount) {
            escrowHeld += t.escrowAccount.balance;
          }
        } else if (t.status === 'FUNDS_RELEASED') {
          completed++;
        }
      });

      setStats({
        activeTransactions: active,
        totalEscrowBalance: escrowHeld,
        propertiesCount: user?.role === 'SELLER' ? sellerProps.length : propertiesList.length,
        completedDeals: completed
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-0">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            You are logged in as a <strong className="text-primary-600 uppercase">{user?.role}</strong>.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          {user?.role === 'SELLER' && (
            <Link
              to="/properties/create"
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all shadow-sm flex items-center"
            >
              ➕ Create Listing
            </Link>
          )}
          <Link
            to="/properties"
            className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium px-4 py-2 rounded-lg text-sm transition-all flex items-center"
          >
            🔍 Browse Properties
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Transactions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Deals</p>
              <h3 className="text-2xl font-bold text-gray-950 mt-2">{stats.activeTransactions}</h3>
            </div>
            <span className="text-2xl bg-amber-50 p-2 rounded-lg">💼</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">Transactions currently in progress</p>
        </div>

        {/* Escrow Balance */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Escrow Balance</p>
              <h3 className="text-2xl font-bold text-gray-950 mt-2">
                ${stats.totalEscrowBalance.toLocaleString()}
              </h3>
            </div>
            <span className="text-2xl bg-green-50 p-2 rounded-lg">💰</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">Funds securely locked in escrow</p>
        </div>

        {/* Properties Count */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {user?.role === 'SELLER' ? 'My Properties' : 'Available Houses'}
              </p>
              <h3 className="text-2xl font-bold text-gray-950 mt-2">{stats.propertiesCount}</h3>
            </div>
            <span className="text-2xl bg-blue-50 p-2 rounded-lg">🏠</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {user?.role === 'SELLER' ? 'Your listed property entries' : 'Properties listed in catalog'}
          </p>
        </div>

        {/* Completed Deals */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Finished Deals</p>
              <h3 className="text-2xl font-bold text-gray-950 mt-2">{stats.completedDeals}</h3>
            </div>
            <span className="text-2xl bg-purple-50 p-2 rounded-lg">✅</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">Transactions successfully settled</p>
        </div>
      </div>

      {/* Main Grid: Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Transactions list */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found. Go to the <Link to="/properties" className="text-primary-600 hover:underline">Properties</Link> catalog to start buying!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3">Deal ID</th>
                    <th className="pb-3">Property</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {recentTxns.map((txn) => (
                    <tr key={txn._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 font-mono text-xs font-semibold text-gray-700">
                        {txn.transactionId}
                      </td>
                      <td className="py-3.5 font-medium text-gray-900">
                        {txn.property?.title || 'Unknown Property'}
                      </td>
                      <td className="py-3.5 text-gray-700">
                        ${txn.amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          txn.status === 'FUNDS_RELEASED' ? 'bg-green-100 text-green-800' :
                          txn.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                          txn.status === 'PENDING' ? 'bg-gray-100 text-gray-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <Link
                          to={`/transactions/${txn._id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          Workspace &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Mini Panel depending on user role */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          {user?.role === 'SELLER' ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">My Listings</h3>
              {myProperties.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No properties listed yet.{' '}
                  <Link to="/properties/create" className="text-primary-600 hover:underline">
                    Create your first list entry!
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProperties.slice(0, 3).map((p) => (
                    <div key={p._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-400">{p.location}</p>
                      </div>
                      <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-bold">
                        ${p.price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Security Notice</h3>
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 text-xs text-primary-950 space-y-2">
                <p className="font-bold">🛡️ How does Escrow work?</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong>Deposit:</strong> The buyer deposits funds matching the selling price.</li>
                  <li><strong>Mutation:</strong> The seller legally transfers property deeds (ownership transfer).</li>
                  <li><strong>Verification:</strong> The seller uploads mutation proof, and the administrator verifies it.</li>
                  <li><strong>Payout/Refund:</strong> Admin releases funds to the seller, or refunds the buyer if mutation fails.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
