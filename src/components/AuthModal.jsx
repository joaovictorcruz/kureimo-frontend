import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authApi } from '../api/client';
import Logo from './Logo';

// ─── Modal de "Esqueci minha senha" (step 1: e-mail) ────────────────────────
function ForgotPasswordModal({ onClose, onSent }) {
  const toast = useToast();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Informe seu e-mail.'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      onSent(email.trim());
    } catch (err) {
      toast.error(err?.message || 'Erro ao enviar e-mail. Tenta de novo!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="card modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <Logo size={32} showText />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <h2 style={{ marginBottom: 6 }}>Redefinir senha</h2>
        <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: 24 }}>
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>E-mail</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : 'Enviar link de redefinição'
            }
          </button>
        </form>

        <hr className="divider" />

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--gray)' }}>
          Lembrou a senha?{' '}
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={onClose}>
            Voltar ao login
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Modal de reset (step 2: token + nova senha) ─────────────────────────────
function ResetPasswordModal({ email, onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm]       = useState({ token: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.token.trim())    { toast.error('Informe o código recebido por e-mail.'); return; }
    if (form.password.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirm) { toast.error('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(form.token.trim(), form.password);
      toast.success('Senha redefinida! Faça login com sua nova senha.');
      onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Código inválido ou expirado. Tenta de novo!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="card modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <Logo size={32} showText />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <h2 style={{ marginBottom: 6 }}>Criar nova senha</h2>
        <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: 24 }}>
          Enviamos um link para <strong style={{ color: 'var(--ink-soft)' }}>{email}</strong>.
          Cole o código do link abaixo ou acesse-o diretamente pelo e-mail.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Código de redefinição</label>
            <input
              className="input"
              placeholder="Cole o token recebido por e-mail"
              value={form.token}
              onChange={(e) => set('token', e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label>Nova senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Confirme a nova senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              required
            />
            {form.confirm && form.password !== form.confirm && (
              <span style={{ fontSize: '0.78rem', color: '#E03A3A', fontWeight: 600 }}>
                As senhas não coincidem.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || (!!form.confirm && form.password !== form.confirm)}
            style={{ marginTop: 4 }}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : 'Salvar nova senha'
            }
          </button>
        </form>

        <hr className="divider" />

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--gray)' }}>
          Não recebeu o e-mail?{' '}
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={onClose}>
            Tentar novamente
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Modal principal de autenticação ─────────────────────────────────────────
export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  // 'login' | 'register' | 'forgot' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', phoneNumber: '', isGon: false,
  });
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const toast = useToast();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
      }
      if (form.password.length < 6) {
        toast.error('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Bem-vindo(a) de volta!');
      } else {
        await register(form.username, form.email, form.password, form.phoneNumber, form.isGon);
        toast.success('Conta criada!');
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || err?.title || 'Algo deu errado. Tenta de novo!');
    } finally {
      setLoading(false);
    }
  };

  // Fluxo de esqueci a senha — renderiza modais separados
  if (mode === 'forgot') {
    return (
      <ForgotPasswordModal
        onClose={() => setMode('login')}
        onSent={(email) => { setForgotEmail(email); setMode('reset'); }}
      />
    );
  }

  if (mode === 'reset') {
    return (
      <ResetPasswordModal
        email={forgotEmail}
        onClose={() => setMode('forgot')}
        onSuccess={() => { setMode('login'); }}
      />
    );
  }

  // ── Login / Register ──
  const passwordsMatch = !form.confirmPassword || form.password === form.confirmPassword;

  return (
    <div className="modal-overlay">
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

          {/* Confirme a senha — apenas no cadastro */}
          {mode === 'register' && (
            <div className="field">
              <label>Confirme a senha</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                required
              />
              {!passwordsMatch && (
                <span style={{ fontSize: '0.78rem', color: '#E03A3A', fontWeight: 600 }}>
                  As senhas não coincidem.
                </span>
              )}
            </div>
          )}

          {mode === 'register' && (
            <div className="field">
              <label>Celular *</label>
              <input
                className="input"
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phoneNumber}
                onChange={(e) => set('phoneNumber', e.target.value)}
                required
              />
            </div>
          )}

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
                  Sou GOM
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                  Vou criar e gerenciar sets de photocards
                </div>
              </div>
            </label>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (mode === 'register' && !passwordsMatch)}
            >
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18 }} />
                : mode === 'login' ? 'Entrar' : 'Criar conta'
              }
            </button>

            {/* Esqueci minha senha — apenas no login */}
            {mode === 'login' && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}
                onClick={() => setMode('forgot')}
              >
                Esqueci minha senha
              </button>
            )}
          </div>
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