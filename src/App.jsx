import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import SessionExpiredModal from './components/SessionExpiredModal';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import SetPage from './pages/SetPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import './styles/global.css';

const PROTECTED_ROUTES = ['/dashboard', '/perfil'];

function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const [sessionModal, setSessionModal] = useState(null); // null | { reason }
  const [authMode, setAuthMode]         = useState(null); // null | 'login' | 'register'

  // ── Escuta invalidação de sessão ──
  // Só abre o modal DEPOIS que o loading terminou.
  // Durante o loading, o /auth/me retorna 401 normalmente (usuário não logado)
  // e não deve disparar o modal de "sessão expirada".
  useEffect(() => {
    const handleInvalid = (e) => {
      // Se ainda está inicializando, ignora — é o /auth/me inicial
      if (loading) return;
      const reason = e.detail?.reason || 'expired';
      setSessionModal({ reason });
    };
    window.addEventListener('kureimo:session-invalid', handleInvalid);
    return () => window.removeEventListener('kureimo:session-invalid', handleInvalid);
  }, [loading]);

  // ── Detecta rota protegida sem autenticação ──
  useEffect(() => {
    if (loading) return;
    const isProtected = PROTECTED_ROUTES.some((r) => location.pathname.startsWith(r));
    if (isProtected && !user) {
      setSessionModal({ reason: 'unauthorized' });
    }
  }, [location.pathname, user, loading]);

  const handleCloseSessionModal = () => {
    setSessionModal(null);
    const isProtected = PROTECTED_ROUTES.some((r) => location.pathname.startsWith(r));
    if (isProtected && !user) navigate('/');
  };

  const handleOpenLogin    = () => { setSessionModal(null); setAuthMode('login');    };
  const handleOpenRegister = () => { setSessionModal(null); setAuthMode('register'); };

  if (loading) return <PageLoader />;

  const modalReason = sessionModal?.reason === 'unauthorized' ? 'unauthorized' : 'expired';

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/"           element={<Home />} />
        <Route path="/set/:token" element={<SetPage />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/perfil"     element={<ProfilePage />} />
      </Routes>

      {sessionModal && (
        <SessionExpiredModal
          reason={modalReason}
          onLogin={handleOpenLogin}
          onRegister={handleOpenRegister}
          onClose={handleCloseSessionModal}
        />
      )}

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}