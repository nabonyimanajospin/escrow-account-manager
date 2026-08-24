import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DealProvider } from './context/DealContext';
import Navbar from './components/Navbar';
import AIChatWidget from './components/AIChatWidget';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Wallet from './pages/Wallet';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import EscrowDeal from './pages/EscrowDeal';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <AuthProvider>
      <DealProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/escrow/:id" element={<EscrowDeal />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/verify/:checksum" element={<Verify />} />
            </Routes>
            <AIChatWidget />
          </div>
        </BrowserRouter>
      </DealProvider>
    </AuthProvider>
  );
}
