import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';
import OnboardingChecklist from '../components/common/OnboardingChecklist';
import GlobalAccountingJournal from '../components/escrow/GlobalAccountingJournal';

const StatCard = ({ label, value, sub }) => (
  <div className="stat-card p-6 animate-fade-in bg-white">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-extrabold text-slate-900 leading-tight">{value}</p>
    <p className="text-xs text-slate-400 mt-2 font-semibold">{sub}</p>
  </div>
);

const ACTIVE_TXN_STATES = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'DISPUTED', 'AWAITING_RECEIPT'];

const buildSellerDealRows = (properties, transactions) => {
  const rows = [];
  const propertyIdsWithActiveTxn = new Set();

  transactions.forEach((t) => {
    rows.push({
      type: 'transaction',
      key: `txn-${t.id}`,
      dealId: t.transactionId,
      propertyTitle: t.property?.title || 'Property listing deleted',
      propertyId: t.propertyId,
      price: t.amount,
      status: t.status,
      escrowId: t.id,
      sortDate: new Date(t.updatedAt || t.createdAt),
    });
    if (ACTIVE_TXN_STATES.includes(t.status)) {
      propertyIdsWithActiveTxn.add(t.propertyId);
    }
  });

  properties
    .filter((p) => p.status === 'AVAILABLE' && !propertyIdsWithActiveTxn.has(p.id))
    .forEach((p) => {
      rows.push({
        type: 'listing',
        key: `listing-${p.id}`,
        dealId: '—',
        propertyTitle: p.title,
        propertyId: p.id,
        price: p.price,
        status: 'AWAITING_BUYER',
        listingType: p.listingType,
        sortDate: new Date(p.createdAt),
      });
    });

  return rows.sort((a, b) => b.sortDate - a.sortDate);
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, escrowLocked: 0, totalEarned: 0, totalSpent: 0, properties: 0, completed: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [myProperties, setMyProperties] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [txnByPropertyId, setTxnByPropertyId] = useState({});
  const [sellerDealRows, setSellerDealRows] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const isSeller = user?.role === 'SELLER';
      const requests = [
        isSeller
          ? axios.get('/properties/mine')
          : axios.get('/properties?limit=100'),
        axios.get('/escrow/my?limit=100'),
      ];
      if (user?.role !== 'ADMIN') {
        requests.push(axios.get('/wallet').catch(() => ({ data: { wallet: { balance: user?.walletBalance || 0 } } })));
      }
      const [propRes, escrowRes, walletRes] = await Promise.all(requests);

      const propsList = propRes.data.data || [];
      const txnsList = escrowRes.data.data || [];
      if (walletRes?.data?.wallet) {
        setWalletBalance(walletRes.data.wallet.balance || 0);
      }

      setRecentTxns(txnsList);

      const propertyTxnMap = {};
      txnsList.forEach((t) => {
        if (t.propertyId) propertyTxnMap[t.propertyId] = t;
      });
      setTxnByPropertyId(propertyTxnMap);

      if (isSeller) {
        setMyProperties(propsList);
        setSellerDealRows(buildSellerDealRows(propsList, txnsList));
      } else {
        setMyProperties([]);
        setSellerDealRows([]);
      }

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
        properties: isSeller ? propsList.length : propsList.filter((p) => p.status === 'AVAILABLE').length,
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
      <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
        <div className="card-tinted p-6 h-28 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2 bg-white border border-slate-100 rounded-2xl">
             <div className="h-6 w-48 bg-slate-200 rounded mb-6 animate-pulse"></div>
             <SkeletonTable rows={4} columns={5} />
          </div>
          <div className="card p-6 bg-white border border-slate-100 rounded-2xl">
             <div className="h-6 w-32 bg-slate-200 rounded mb-6 animate-pulse"></div>
             <SkeletonTable rows={3} columns={1} />
          </div>
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
            {user?.role === 'SELLER'
              ? 'Seller portal — manage listings, buyer bids, and escrow payouts'
              : 'Buyer workspace — track active transactions and secured purchases'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'SELLER' ? (
            <>
              <Link to="/properties/create" className="btn-primary text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                + Add Property
              </Link>
              <Link to="/wallet" className="btn-secondary text-sm font-semibold">
                Seller Wallet
              </Link>
            </>
          ) : (
            <Link to="/properties" className="btn-primary text-sm font-semibold">
              Browse Listings Catalog &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard View Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setDashTab('dashboard')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            dashTab === 'dashboard'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          My Dashboard Overview
        </button>

        <button
          onClick={() => setDashTab('journal')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 ${
            dashTab === 'journal'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>📊 Platform Accounting Journal</span>
        </button>
      </div>

      {dashTab === 'journal' ? (
        <GlobalAccountingJournal />
      ) : (
        <>
          {!user?.isKycVerified && user?.role !== 'ADMIN' && (
            <div className="card p-4 bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-amber-900">Identity verification required</p>
                <p className="text-xs text-amber-800 font-medium mt-0.5">Complete KYC to buy, sell, or receive escrow payouts.</p>
              </div>
              <Link to="/kyc" className="btn-primary text-xs whitespace-nowrap">Complete KYC →</Link>
            </div>
          )}

      <OnboardingChecklist
        user={user}
        walletBalance={walletBalance}
        hasActiveDeal={stats.active > 0}
        hasListedProperty={myProperties.length > 0}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard label="Active Escrow Deals" value={stats.active} sub="Transactions in progress" />

        {user?.role !== 'ADMIN' && (
          <StatCard
            label="Wallet Balance"
            value={`$${Number(walletBalance).toLocaleString()}`}
            sub={user?.role === 'BUYER' ? 'Available for escrow deposits' : 'Available for withdrawal'}
          />
        )}
        
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
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              {user?.role === 'SELLER' ? 'My Escrow Deals' : 'Recent Escrow Workspace'}
            </h2>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {user?.role === 'SELLER'
                ? `${sellerDealRows.length} item${sellerDealRows.length !== 1 ? 's' : ''}`
                : `${recentTxns.length} deal${recentTxns.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {user?.role === 'SELLER' ? (
            sellerDealRows.length === 0 ? (
              <EmptyState
                title="No listings or deals yet"
                description="Add a property listing. It will appear here as awaiting buyer interest until someone starts an escrow deal."
                actionText="Create Listing"
                actionLink="/properties/create"
              />
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
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
                    {sellerDealRows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-4 font-mono text-xs font-bold text-slate-500">
                          {row.dealId}
                        </td>
                        <td className="py-4 pr-4 text-sm font-semibold text-slate-900 max-w-[150px] truncate">
                          {row.propertyTitle}
                        </td>
                        <td className="py-4 pr-4 text-sm font-extrabold text-slate-900">
                          ${Number(row.price || 0).toLocaleString()}
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-4">
                          {row.type === 'transaction' ? (
                            <Link to={`/escrow/${row.escrowId}`} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                              Workspace &rarr;
                            </Link>
                          ) : (
                            <Link to={`/properties/${row.propertyId}`} className="text-xs font-bold text-slate-600 hover:text-primary-600">
                              View listing &rarr;
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : recentTxns.length === 0 ? (
            <EmptyState
              title="No active escrow deals"
              description="Browse properties to start a secure middleman contract and track it here."
              actionText="Explore Properties"
              actionLink="/properties"
            />
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
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
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {myProperties.length} total
                  </span>
                  <Link to="/properties/create" className="text-xs font-bold text-primary-600 hover:underline">+ Add New</Link>
                </div>
              </div>

              {myProperties.length === 0 ? (
                <EmptyState
                  title="No properties listed"
                  description="You haven't listed any houses yet. Add your first property to start receiving escrow deals."
                  actionText="Create Listing"
                  actionLink="/properties/create"
                />
              ) : (
                <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {myProperties.map((p) => {
                    const activeTxn = txnByPropertyId[p.id];
                    return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <Link to={`/properties/${p.id}`} className="text-sm font-bold text-slate-800 truncate block hover:text-primary-600">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{p.location}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {p.listingType === 'AUCTION' ? 'Auction listing' : 'Fixed price'}
                          {p.status === 'AVAILABLE' && ' · Open for offers'}
                          {p.status === 'PENDING' && ' · Active escrow in progress'}
                          {p.status === 'SOLD' && ' · Sale completed'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-sm font-extrabold text-slate-900">${Number(p.price).toLocaleString()}</p>
                        <div className="flex gap-2 items-center flex-wrap justify-end">
                          <StatusBadge status={p.status} variant="property" />
                          {activeTxn && (
                            <Link
                              to={`/escrow/${activeTxn.id}`}
                              className="text-[10px] font-bold text-primary-600 hover:underline"
                            >
                              View deal
                            </Link>
                          )}
                          {p.status === 'AVAILABLE' && (
                            <button
                              onClick={() => handleDeleteProperty(p.id, p.title)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
      </>
      )}
    </div>
  );
};

export default Dashboard;
