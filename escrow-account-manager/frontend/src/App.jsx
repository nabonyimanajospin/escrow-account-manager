import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PropertyList from './pages/PropertyList';
import PropertyDetail from './pages/PropertyDetail';
import PropertyForm from './pages/PropertyForm';
import EscrowDetail from './pages/EscrowDetail';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import SellerWallet from './pages/SellerWallet';
import AIChatWidget from './components/AIChatWidget';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />

        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/properties" element={<PropertyList />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />

              {/* Protected Seller & Admin Property Creation */}
              <Route element={<ProtectedRoute allowedRoles={['SELLER', 'ADMIN']} />}>
                <Route path="/properties/create" element={<PropertyForm />} />
                <Route path="/properties/:id/edit" element={<PropertyForm />} />
              </Route>

              {/* Protected Customer Routes (Buyer, Seller & Admin) */}
              <Route element={<ProtectedRoute allowedRoles={['BUYER', 'SELLER', 'ADMIN']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/escrow/:id" element={<EscrowDetail />} />
                {/* Backwards-compatibility alias for legacy paths */}
                <Route path="/transactions/:id" element={<EscrowDetail />} />
                {/* Profile & Wallet */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/wallet" element={<SellerWallet />} />
              </Route>

              {/* Protected Admin Console Route */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>

              {/* 404 Pages */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          <AIChatWidget />
        <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
