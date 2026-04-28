import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersApi } from '../api/client';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, logout, isGom } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [editMode, setEditMode] = useState(false);
  const [passMode, setPassMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!user) {
    navigate('/');
    return null;
  }

  const initial = user.username?.[0]?.toUpperCase() || '?';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.username.trim()) { toast.error('Nome de usuário é obrigatório.'); return; }
    setSaving(true);
    try {
      await usersApi.update(user.id, {
        username: profile.username,
        email: profile.email,
      });
      toast.success('Perfil atualizado! ✨');
      setEditMode(false);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('As senhas novas não coincidem.'); return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.'); return;
    }
    setSaving(true);
    try {
      await usersApi.updatePassword(user.id, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Senha alterada com sucesso! 🔒');
      setPassMode(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err?.message || 'Senha atual incorreta ou erro ao alterar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.'
    );
    if (!confirmed) return;
    try {
      await usersApi.delete(user.id);
      logout();
      navigate('/');
      toast.success('Conta excluída.');
    } catch {
      toast.error('Erro ao excluir conta.');
    }
  };

  return (
    <main className={styles.page}>
      <div className="page-container">
        <div className={styles.layout}>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            <div className={`card ${styles.profileCard}`}>
              {/* Avatar grande */}
              <div className={styles.bigAvatar}>{initial}</div>
              <h2 className={styles.profileName}>{user.username}</h2>
              <p className={styles.profileEmail}>{user.email}</p>
              {user.role && (
                <span className={`badge ${isGom ? 'badge-pink' : 'badge-lilac'}`} style={{ marginTop: 8 }}>
                  {isGom ? '👑 GOM' : '🌸 Usuário'}
                </span>
              )}
            </div>

            {/* Quick nav */}
            <div className={`card ${styles.quickNav}`}>
              <button
                className={`${styles.navItem} ${!editMode && !passMode ? styles.navItemActive : ''}`}
                onClick={() => { setEditMode(false); setPassMode(false); }}
              >
                👤 Informações
              </button>
              <button
                className={`${styles.navItem} ${editMode ? styles.navItemActive : ''}`}
                onClick={() => { setEditMode(true); setPassMode(false); }}
              >
                ✏️ Editar perfil
              </button>
              <button
                className={`${styles.navItem} ${passMode ? styles.navItemActive : ''}`}
                onClick={() => { setPassMode(true); setEditMode(false); }}
              >
                🔒 Alterar senha
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className={styles.content}>

            {/* ─ View mode ─ */}
            {!editMode && !passMode && (
              <div className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                  <h2>Informações da conta</h2>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                    ✏️ Editar
                  </button>
                </div>
                <hr className="divider" />
                <div className={styles.infoGrid}>
                  <InfoRow label="Usuário" value={`@${user.username}`} />
                  <InfoRow label="E-mail" value={user.email} />
                  <InfoRow label="Tipo de conta" value={isGom ? 'GOM (Group Order Manager)' : 'Usuário padrão'} />
                  <InfoRow label="ID da conta" value={user.id} mono />
                </div>

                <div className={styles.dangerZone}>
                  <p className={styles.dangerTitle}>⚠️ Zona de perigo</p>
                  <p className={styles.dangerDesc}>
                    Excluir a conta é permanente e remove todos os seus dados.
                  </p>
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount}>
                    Excluir conta
                  </button>
                </div>
              </div>
            )}

            {/* ─ Edit profile ─ */}
            {editMode && (
              <div className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                  <h2>Editar perfil</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>
                    Cancelar
                  </button>
                </div>
                <hr className="divider" />
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className="field">
                    <label>Nome de usuário</label>
                    <input
                      className="input"
                      placeholder="seu_usuario"
                      value={profile.username}
                      onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>E-mail</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="seu@email.com"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Salvar alterações ✨'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ─ Change password ─ */}
            {passMode && (
              <div className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                  <h2>Alterar senha</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPassMode(false)}>
                    Cancelar
                  </button>
                </div>
                <hr className="divider" />
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className="field">
                    <label>Senha atual</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="••••••••"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Nova senha</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Confirmar nova senha</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="••••••••"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                      required
                    />
                    {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <span style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: 2 }}>
                        As senhas não coincidem.
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setPassMode(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '🔒 Alterar senha'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.92rem',
        fontWeight: 700,
        color: 'var(--ink-soft)',
        fontFamily: mono ? 'monospace' : undefined,
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}