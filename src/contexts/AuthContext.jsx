import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

function clearStorage() {
  localStorage.removeItem('kureimo_profile_pic');
}

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    // Restaura foto do localStorage para evitar flash no Navbar
    const storedPic = localStorage.getItem('kureimo_profile_pic');
    if (storedPic) setProfilePicUrl(storedPic);

    const init = async () => {
      try {
        // O cookie httpOnly vai automaticamente (credentials: 'include' no client.js)
        const me = await authApi.me();
        applyUser(me);
      } catch {
        // 401 na inicialização = não logado — comportamento silencioso, sem modal
        // O evento kureimo:session-invalid do client.js só deve abrir modal
        // quando o usuário já está usando o app e a sessão expira no meio
        setUser(null);
        setProfilePicUrl(null);
        clearStorage();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Escuta invalidação de sessão disparada pelo client.js (401 ou rede offline
  // em qualquer request DEPOIS da inicialização)
  useEffect(() => {
    const handleInvalid = () => {
      clearStorage();
      setUser(null);
      setProfilePicUrl(null);
    };
    window.addEventListener('kureimo:session-invalid', handleInvalid);
    return () => window.removeEventListener('kureimo:session-invalid', handleInvalid);
  }, []);

  /**
   * Aplica dados do usuário vindos da API.
   * Contrato esperado:
   * { id, username, email, role, phoneNumber, profilePicUrl }
   */
  const applyUser = (data) => {
    setUser({
      id:          data.id          || null,
      username:    data.username    || '',
      email:       data.email       || '',
      role:        data.role        || '',
      phoneNumber: data.phoneNumber || null,
    });

    const pic = data.profilePicUrl || null;
    if (pic) localStorage.setItem('kureimo_profile_pic', pic);
    else     localStorage.removeItem('kureimo_profile_pic');
    setProfilePicUrl(pic);
  };

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    applyUser(data);
    return data;
  };

  const register = async (username, email, password, phoneNumber, isGon) => {
    const data = await authApi.register({ username, email, password, phoneNumber, isGon });
    applyUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // mesmo se a API falhar, limpa estado local
    } finally {
      clearStorage();
      setUser(null);
      setProfilePicUrl(null);
    }
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
      register,
      logout,
      isGom,
      updateProfilePic,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);