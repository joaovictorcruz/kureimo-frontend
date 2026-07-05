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
import ProfilePage from './pages/ProfilePage';
import './styles/global.css';

const PROTECTED_ROUTES = ['/dashboard', '/perfil'];

// Página de callback do Logto — troca o code por tokens automaticamente
function CallbackPage() {
  const navigate = useNavigate();
  const { isLoading } = useHandleSignInCallback(() => navigate('/'));
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
        <Route path="/perfil"     element={<ProfilePage />} />
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