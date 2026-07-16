import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useHandleSignInCallback } from '@logto/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import OnboardingModal from './components/OnboardingModal';
import Home from './pages/Home';
import SetPage from './pages/SetPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import GomProfilePage from './pages/GomProfilePage';
import PrivacyPage from './pages/PrivacyPage';
import './styles/global.css';

const PROTECTED_ROUTES = ['/dashboard', '/perfil', '/historico'];

// Página de callback do Logto — troca o code por tokens automaticamente
function CallbackPage() {
  const navigate = useNavigate();
  const { isLoading } = useHandleSignInCallback(() => {
    const returnTo = sessionStorage.getItem('kureimo_return_to');
    sessionStorage.removeItem('kureimo_return_to');
    navigate(returnTo || '/');
  });
  if (isLoading) return <PageLoader />;
  return null;
}

function AppShell() {
  const { user, loading, showOnboarding } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redireciona rotas protegidas para home se não autenticado
  useEffect(() => {
    if (loading) return;
    const isProtected = PROTECTED_ROUTES.some((r) => location.pathname.startsWith(r));
    if (isProtected && !user) navigate('/');
  }, [location.pathname, user, loading]);

  if (loading) return <PageLoader />;

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/"           element={<Home />} />
        <Route path="/callback"   element={<CallbackPage />} />
        <Route path="/set/:token" element={<SetPage />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/historico"  element={<HistoryPage />} />
        <Route path="/perfil"     element={<ProfilePage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/gom/:id" element={<GomProfilePage />} />
      </Routes>

      {showOnboarding && <OnboardingModal />}
    </>
  );
}

export default function App() {
  return (
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
  );
}