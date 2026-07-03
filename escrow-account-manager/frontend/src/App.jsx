import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LandingPage from './components/pages/LandingPage';
import NotFound from './components/pages/NotFound';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PropertyList from './components/properties/PropertyList';
import PropertyDetail from './components/properties/PropertyDetail';
import PropertyForm from './components/properties/PropertyForm';
import TransactionList from './components/transactions/TransactionList';
import TransactionDetail from './components/transactions/TransactionDetail';

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
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />

        <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/properties" element={<PropertyList />} />

              {/* IMPORTANT: /create must come BEFORE /:id to avoid route collision */}
              <Route element={<ProtectedRoute allowedRoles={['SELLER', 'ADMIN']} />}>
                <Route path="/properties/create" element={<PropertyForm />} />
                <Route path="/properties/:id/edit" element={<PropertyForm />} />
              </Route>

              <Route path="/properties/:id" element={<PropertyDetail />} />

              {/* Protected — any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<TransactionList />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
              </Route>

              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
