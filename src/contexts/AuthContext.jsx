import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLogto } from '@logto/react';
import { usersApi, setAccessTokenProvider } from '../api/client';

const AuthContext = createContext(null);

function clearStorage() {
  localStorage.removeItem('kureimo_profile_pic');
}

export function AuthProvider({ children }) {
  const { isAuthenticated, isLoading: logtoLoading, getAccessToken, signIn, signOut } = useLogto();

  const [user, setUser]                     = useState(null);
  const [profilePicUrl, setProfilePicUrl]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const initializedRef = useRef(false);  // ← novo

  useEffect(() => {
    setAccessTokenProvider(getAccessToken);
  }, [getAccessToken]);

  // Restaura foto do localStorage para evitar flash no Navbar
  useEffect(() => {
    const storedPic = localStorage.getItem('kureimo_profile_pic');
    if (storedPic) setProfilePicUrl(storedPic);
  }, []);

  // Quando o Logto confirmar sessão ativa, busca /users/me
  useEffect(() => {
    if (logtoLoading) return;

    if (!isAuthenticated) {
      if (initializedRef.current) {
        // só limpa se estava logado antes (logout real)
        initializedRef.current = false;
        setUser(null);
        setProfilePicUrl(null);
        clearStorage();
      }
      setLoading(false);
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        const me = await usersApi.me();
        applyUser(me);
        if (!me.profileCompleted) {
          setShowOnboarding(true);
        }
      } catch {
        setUser(null);
        setProfilePicUrl(null);
        clearStorage();
        initializedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, logtoLoading]);

  const applyUser = (data) => {
    setUser({
      id:               data.id               || null,
      username:         data.username         || '',
      email:            data.email            || '',
      role:             data.role             || '',
      phoneNumber:      data.phoneNumber      || null,
      profileCompleted: data.profileCompleted ?? false,
    });

    const pic = data.profilePicUrl || null;
    if (pic) localStorage.setItem('kureimo_profile_pic', pic);
    else     localStorage.removeItem('kureimo_profile_pic');
    setProfilePicUrl(pic);
  };

  const login = () => {
    signIn(`${window.location.origin}/callback`);
  };

  const logout = async () => {
    clearStorage();
    setUser(null);
    setProfilePicUrl(null);
    await signOut(window.location.origin);
  };

  const completeOnboarding = async (email, role) => {
    const data = await usersApi.completeOnboarding({ email, role });
    applyUser(data);
    setShowOnboarding(false);
    return data;
  };

  const updateProfilePic = (url) => {
    if (url) localStorage.setItem('kureimo_profile_pic', url);
    else     localStorage.removeItem('kureimo_profile_pic');
    setProfilePicUrl(url || null);
  };

  const isGom = user?.role === 'Gon' || user?.role === 'gon';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      profilePicUrl,
      login,
      logout,
      isGom,
      showOnboarding,
      completeOnboarding,
      updateProfilePic,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);