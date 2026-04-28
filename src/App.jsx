import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SetPage from './pages/SetPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/set/:token" element={<SetPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
