import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Logo from './Logo';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', email: '', password: '', isGon: false });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Bem-vindo(a) de volta!');
      } else {
        await register(form.username, form.email, form.password, form.isGon);
        toast.success('Conta criada! Seja bem-vinda ✨');
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || err?.title || 'Algo deu errado. Tenta de novo!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <Logo size={32} showText />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <h2 style={{ marginBottom: 6 }}>
          {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
        </h2>
        <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: 24 }}>
          {mode === 'login'
            ? 'Acesse seus claims e sets favoritos.'
            : 'Junte-se à comunidade de photocards!'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="field">
              <label>Usuário</label>
              <input
                className="input"
                placeholder="seu_user"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                required
              />
            </div>
          )}

          <div className="field">
            <label>E-mail</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--card-border)',
              cursor: 'pointer',
              background: form.isGon ? 'rgba(242,134,149,0.07)' : 'rgba(255,255,255,0.8)',
              transition: 'all 0.15s',
            }}>
              <input
                type="checkbox"
                checked={form.isGon}
                onChange={(e) => set('isGon', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--rose)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--rose-dark)' }}>
                  Sou GOM 👑
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                  Vou criar e gerenciar sets de photocards
                </div>
              </div>
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : mode === 'login' ? 'Entrar 🌸' : 'Criar conta ✨'}
          </button>
        </form>

        <hr className="divider" />

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--gray)' }}>
          {mode === 'login' ? (
            <>Ainda não tem conta?{' '}
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px' }}
                onClick={() => setMode('register')}
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px' }}
                onClick={() => setMode('login')}
              >
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
