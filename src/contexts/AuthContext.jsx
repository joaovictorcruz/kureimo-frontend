import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

function parseAndValidateToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    const exp = payload.exp;
    if (exp && Date.now() / 1000 > exp) return null;

    return {
      id:       payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub,
      username: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']           || payload.unique_name,
      email:    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']   || payload.email,
      role:     payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']         || payload.role,
      exp,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);   // dados do JWT
  const [token, setToken] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null); // vem da resposta da API
  const [loading, setLoading] = useState(true);

  // Inicialização: lê token + profilePicUrl do localStorage
  useEffect(() => {
    const stored    = localStorage.getItem('kureimo_token');
    const storedPic = localStorage.getItem('kureimo_profile_pic');
    const parsed    = parseAndValidateToken(stored);

    if (parsed) {
      setToken(stored);
      setUser(parsed);
      if (storedPic) setProfilePicUrl(storedPic);

      const msUntilExpiry = parsed.exp * 1000 - Date.now();
      if (msUntilExpiry > 0) {
        const timer = setTimeout(() => {
          localStorage.removeItem('kureimo_token');
          localStorage.removeItem('kureimo_profile_pic');
          setToken(null);
          setUser(null);
          setProfilePicUrl(null);
        }, msUntilExpiry);
        setLoading(false);
        return () => clearTimeout(timer);
      }
    } else {
      if (stored) localStorage.removeItem('kureimo_token');
      localStorage.removeItem('kureimo_profile_pic');
    }

    setLoading(false);
  }, []);

  const applySession = (newToken, apiResponse) => {
    const parsed = parseAndValidateToken(newToken);
    if (!parsed) throw new Error('Token inválido recebido da API');

    localStorage.setItem('kureimo_token', newToken);
    setToken(newToken);
    setUser(parsed);

    // profilePicUrl vem na resposta do login/register — guarda no localStorage
    const pic = apiResponse?.profilePicUrl || null;
    if (pic) {
      localStorage.setItem('kureimo_profile_pic', pic);
    } else {
      localStorage.removeItem('kureimo_profile_pic');
    }
    setProfilePicUrl(pic);
  };

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    applySession(data.token, data);
    return data;
  };

  const register = async (username, email, password, phoneNumber, isGon) => {
    const data = await authApi.register({ username, email, password, phoneNumber, isGon });
    applySession(data.token, data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('kureimo_token');
    localStorage.removeItem('kureimo_profile_pic');
    setToken(null);
    setUser(null);
    setProfilePicUrl(null);
  };

  // Permite que o ProfilePage atualize a foto após upload
  const updateProfilePic = (url) => {
    if (url) {
      localStorage.setItem('kureimo_profile_pic', url);
    } else {
      localStorage.removeItem('kureimo_profile_pic');
    }
    setProfilePicUrl(url || null);
  };

  const isGom = user?.role === 'Gon' || user?.role === 'gon';

  return (
    <AuthContext.Provider value={{ user, token, loading, profilePicUrl, login, register, logout, isGom, updateProfilePic }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);