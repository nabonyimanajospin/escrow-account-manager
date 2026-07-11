import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, sub }) => (
  <div className="stat-card p-6 animate-fade-in bg-white">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-extrabold text-slate-900 leading-tight">{value}</p>
    <p className="text-xs text-slate-400 mt-2 font-semibold">{sub}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, escrowLocked: 0, totalEarned: 0, totalSpent: 0, properties: 0, completed: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [myProperties, setMyProperties] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [propRes, escrowRes] = await Promise.all([
        axios.get('/properties'),
        axios.get('/escrow/my'),
      ]);

      const propsList = propRes.data.data || [];
      const txnsList = escrowRes.data.data || [];

      setRecentTxns(txnsList.slice(0, 5));

      const sellerProps = propsList.filter((p) => p.sellerId === user?.id);
      setMyProperties(sellerProps);

      let active = 0, escrowLocked = 0, totalEarned = 0, totalSpent = 0, completed = 0;
      txnsList.forEach((t) => {
        const activeStates = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'];
        if (activeStates.includes(t.status)) {
          active++;
          escrowLocked += Number(t.escrowAccount?.balance || 0);
        }
        if (t.status === 'COMPLETED') {
          completed++;
          if (user?.role === 'SELLER') totalEarned += Number(t.amount || 0);
          if (user?.role === 'BUYER')  totalSpent  += Number(t.amount || 0);
        }
      });

      setStats({
        active,
        escrowLocked,
        totalEarned,
        totalSpent,
        properties: user?.role === 'SELLER' ? sellerProps.length : propsList.length,
        completed,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteProperty = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/properties/${id}`);
      toast.success('Property listing deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete listing');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Syncing Secure Escrow State...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="card-tinted p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-sans">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-semibold">
            Logged in as <span className="text-primary-600">{user?.role}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'SELLER' && (
            <Link to="/properties/create" className="btn-primary text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Listing
            </Link>
          )}
          <Link to="/properties" className="btn-secondary text-sm font-semibold">Browse Listings</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Escrow Deals" value={stats.active} sub="Transactions in progress" />
        
        {user?.role === 'SELLER' ? (
          <StatCard
            label="Pending Payouts"
            value={`$${stats.escrowLocked.toLocaleString()}`}
            sub="Locked in escrow accounts"
          />
        ) : (
          <StatCard
            label="Funds in Escrow"
            value={`$${stats.escrowLocked.toLocaleString()}`}
            sub="Your locked deposits"
          />
        )}

        <StatCard
          label={user?.role === 'SELLER' ? 'My Listed Homes' : 'Platform Listings'}
          value={stats.properties}
          sub={user?.role === 'SELLER' ? 'Total houses added' : 'Total available catalog'}
        />

        {user?.role === 'SELLER' ? (
          <StatCard
            label="Total Settled Earnings"
            value={`$${stats.totalEarned.toLocaleString()}`}
            sub={`From ${stats.completed} finalized deal${stats.completed !== 1 ? 's' : ''}`}
          />
        ) : (
          <StatCard
            label="Total Capital Settled"
            value={`$${stats.totalSpent.toLocaleString()}`}
            sub={`From ${stats.completed} successfully completed transaction${stats.completed !== 1 ? 's' : ''}`}
          />
        )}
      </div>

      {/* Main Workspace split */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Side: Recent Escrow Deals */}
        <div className="card p-6 lg:col-span-2 bg-white">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 font-sans">Recent Escrow Workspace</h2>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Deals</span>
          </div>

          {recentTxns.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-slate-200">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 text-sm font-semibold">No active escrow transactions found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Browse properties to start a secure middleman contract</p>
              <Link to="/properties" className="btn-primary text-xs font-semibold">
                Explore Properties
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="pb-3 pr-4">Deal ID</th>
                    <th className="pb-3 pr-4">Property</th>
                    <th className="pb-3 pr-4">Price</th>
                    <th className="pb-3 pr-4">Lifecycle Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pr-4 font-mono text-xs font-bold text-slate-500">
                        {txn.transactionId}
                      </td>
                      <td className="py-4 pr-4 text-sm font-semibold text-slate-900 max-w-[150px] truncate">
                        {txn.property?.title || 'Property listing deleted'}
                      </td>
                      <td className="py-4 pr-4 text-sm font-extrabold text-slate-900">
                        ${Number(txn.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="py-4">
                        <Link to={`/escrow/${txn.id}`} className="text-xs font-bold text-primary-600 hover:text-primary-700">
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

        {/* Right Side: Role Specific panel */}
        <div className="card p-6 bg-white">
          {user?.role === 'SELLER' ? (
            <>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 font-sans">My Listed Properties</h2>
                <Link to="/properties/create" className="text-xs font-bold text-primary-600 hover:underline">+ Add New</Link>
              </div>

              {myProperties.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500 text-sm font-medium">You haven't listed any houses yet.</p>
                  <Link to="/properties/create" className="text-primary-600 text-sm font-semibold hover:underline mt-2 inline-block">
                    Create first property listing
                  </Link>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {myProperties.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <Link to={`/properties/${p.id}`} className="text-sm font-bold text-slate-800 truncate block hover:text-primary-600">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{p.location}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-sm font-extrabold text-slate-900">${Number(p.price).toLocaleString()}</p>
                        <div className="flex gap-2 items-center">
                          <StatusBadge status={p.status} />
                          {p.status === 'AVAILABLE' && (
                            <button
                              onClick={() => handleDeleteProperty(p.id, p.title)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors ml-1 cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 font-sans">Three-Way Escrow Protocol</h2>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Buyer Buy Trigger', desc: 'Buyer triggers purchase. A unique transaction address & smart contract identifier is generated.' },
                  { step: '02', title: 'Fund & Validate', desc: 'Buyer deposits transaction funds. Both sides input verification codes to proceed.' },
                  { step: '03', title: 'Ownership Mutation', desc: 'Seller conducts mutation transfer and uploads legal confirmation document.' },
                  { step: '04', title: 'Admin Verification', desc: 'Admin reviews mutation document and settles funds to seller or buyer refund.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 border border-primary-200 text-primary-700 font-mono flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
