import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axiosConfig';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const StatCard = ({ label, value, sub }) => (
  <div className="stat-card p-6">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-extrabold text-slate-900">{value}</p>
    <p className="text-xs text-slate-400 mt-2">{sub}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, escrow: 0, properties: 0, completed: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [myProperties, setMyProperties] = useState([]);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, txnRes] = await Promise.all([
        axios.get('/properties'),
        axios.get(user?.role === 'ADMIN' ? '/transactions' : '/transactions/my'),
      ]);

      const allProps = propRes.data.data || [];
      const txns = txnRes.data.data || [];

      const sellerProps = allProps.filter((p) => p.sellerId === user?.id);
      setMyProperties(sellerProps);
      setRecentTxns(txns.slice(0, 5));

      let active = 0, escrow = 0, completed = 0;
      txns.forEach((t) => {
        const activeStates = ['PENDING','FUNDS_DEPOSITED','MUTATION_INITIATED','MUTATION_IN_PROGRESS','MUTATION_COMPLETED'];
        if (activeStates.includes(t.status)) {
          active++;
          escrow += Number(t.escrowAccount?.balance || 0);
        }
        if (t.status === 'FUNDS_RELEASED') completed++;
      });

      setStats({
        active,
        escrow,
        properties: user?.role === 'SELLER' ? sellerProps.length : allProps.length,
        completed,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrapper space-y-7 animate-fade-in">

      {/* Welcome banner */}
      <div className="card-tinted p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}!</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Logged in as <span className="font-semibold text-primary-600">{user?.role}</span>
            {user?.role === 'ADMIN' && ' — Full platform access'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'SELLER' && (
            <Link to="/properties/create" className="btn-primary text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Listing
            </Link>
          )}
          <Link to="/properties" className="btn-secondary text-sm">Browse Properties</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Deals"    value={stats.active}                        sub="Transactions in progress" />
        <StatCard label="Escrow Balance"  value={`$${stats.escrow.toLocaleString()}`} sub="Funds locked in escrow" />
        <StatCard
          label={user?.role === 'SELLER' ? 'My Listings' : 'Available Properties'}
          value={stats.properties}
          sub={user?.role === 'SELLER' ? 'Your listed properties' : 'Properties in catalog'}
        />
        <StatCard label="Completed Deals" value={stats.completed}                     sub="Successfully settled" />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent transactions */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View All</Link>
          </div>

          {recentTxns.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 text-sm font-medium">No transactions yet</p>
              <Link to="/properties" className="text-primary-600 text-sm font-semibold hover:underline mt-1 inline-block">
                Browse properties to start
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="pb-3 pr-4">Deal ID</th>
                    <th className="pb-3 pr-4">Property</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-slate-600">{txn.transactionId}</td>
                      <td className="py-3.5 pr-4 text-sm font-medium text-slate-800 max-w-[140px] truncate">{txn.property?.title || 'Unknown'}</td>
                      <td className="py-3.5 pr-4 text-sm text-slate-700 font-semibold">${Number(txn.amount || 0).toLocaleString()}</td>
                      <td className="py-3.5 pr-4"><StatusBadge status={txn.status} /></td>
                      <td className="py-3.5">
                        <Link to={`/transactions/${txn.id}`} className="text-xs font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="card p-6">
          {user?.role === 'SELLER' ? (
            <>
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">My Listings</h2>
                <Link to="/properties/create" className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ New</Link>
              </div>
              {myProperties.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-slate-500 text-sm">No listings yet.</p>
                  <Link to="/properties/create" className="text-primary-600 text-sm font-semibold hover:underline mt-1 inline-block">
                    Create your first listing
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProperties.slice(0, 4).map((p) => (
                    <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary-600 transition-colors">{p.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.location}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-sm font-bold text-primary-600">${Number(p.price).toLocaleString()}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">How Escrow Works</h2>
              <div className="space-y-4">
                {[
                  { n: '1', t: 'Confirm Deposit',  d: 'Buyer confirms the exact property price. The amount is locked in the escrow account.' },
                  { n: '2', t: 'Mutation Process', d: 'Seller initiates legal ownership transfer and uploads proof documents.' },
                  { n: '3', t: 'Verification',     d: 'Admin reviews the uploaded documents and verifies the mutation is complete.' },
                  { n: '4', t: 'Payout or Refund', d: 'Admin releases funds to the seller, or refunds the buyer if mutation fails.' },
                ].map((item) => (
                  <div key={item.n} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.n}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.t}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Simulation Notice</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    This system simulates escrow. No real money is transferred. Depositing funds means
                    confirming the amount in the system. A real deployment would connect to a payment gateway.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
