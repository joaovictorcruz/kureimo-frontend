import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

function parseAndValidateToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Verifica expiração — campo `exp` é Unix timestamp em segundos
    const exp = payload.exp;
    if (exp && Date.now() / 1000 > exp) {
      // Token expirado — descarta
      return null;
    }

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
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicialização: lê o token do localStorage e valida na montagem
  useEffect(() => {
    const stored = localStorage.getItem('kureimo_token');
    const parsed = parseAndValidateToken(stored);

    if (parsed) {
      setToken(stored);
      setUser(parsed);

      // Agenda logout automático quando o token expirar
      const msUntilExpiry = parsed.exp * 1000 - Date.now();
      if (msUntilExpiry > 0) {
        const timer = setTimeout(() => {
          localStorage.removeItem('kureimo_token');
          setToken(null);
          setUser(null);
        }, msUntilExpiry);
        setLoading(false);
        return () => clearTimeout(timer);
      }
    } else {
      // Token ausente ou expirado — limpa tudo
      if (stored) localStorage.removeItem('kureimo_token');
    }

    setLoading(false);
  }, []);

  const applyToken = (newToken) => {
    const parsed = parseAndValidateToken(newToken);
    if (!parsed) throw new Error('Token inválido recebido da API');
    localStorage.setItem('kureimo_token', newToken);
    setToken(newToken);
    setUser(parsed);
  };

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    applyToken(data.token);
    return data;
  };

  const register = async (username, email, password, isGon) => {
    const data = await authApi.register({ username, email, password, isGon });
    applyToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('kureimo_token');
    setToken(null);
    setUser(null);
  };

  const isGom = user?.role === 'Gon' || user?.role === 'gon';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isGom }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);