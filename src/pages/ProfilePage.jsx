import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersApi } from '../api/client';
import styles from './ProfilePage.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = '.jpg,.jpeg,.png,.webp';

export default function ProfilePage() {
  const { user, logout, isGom } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [passMode, setPassMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Dados completos do usuário vindos da API (inclui phoneNumber, profilePicUrl)
  const [profileData, setProfileData] = useState(null);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    phoneNumber: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) return;
    usersApi.get(user.id).then((data) => {
      setProfileData(data);
      setProfile({
        username: data.username || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
      });
    }).catch(() => {
      // fallback para dados do token
      setProfile({
        username: user.username || '',
        email: user.email || '',
        phoneNumber: '',
      });
    });
  }, [user]);

  if (!user) {
    navigate('/');
    return null;
  }

  const displayData = profileData || user;
  const initial = (displayData.username || '?')[0].toUpperCase();
  const avatarUrl = profileData?.profilePicUrl || null;

  // ── Upload foto de perfil ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, JPEG, PNG ou WEBP.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await usersApi.updateProfilePic(user.id, formData);
      toast.success('Foto de perfil atualizada! 🌸');
      // Recarrega dados para pegar a nova URL
      const updated = await usersApi.get(user.id);
      setProfileData(updated);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar foto de perfil.');
    } finally {
      setUploadingAvatar(false);
      // Reset input para permitir re-upload do mesmo arquivo
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.username.trim()) { toast.error('Nome de usuário é obrigatório.'); return; }
    setSaving(true);
    try {
      await usersApi.update(user.id, {
        username: profile.username,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
      });
      toast.success('Perfil atualizado! ✨');
      setEditMode(false);
      // Atualiza dados locais
      setProfileData((prev) => prev ? { ...prev, ...profile } : null);
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
              {/* Avatar grande com upload */}
              <div className={styles.avatarWrapper}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className={styles.bigAvatarImg} />
                ) : (
                  <div className={styles.bigAvatar}>{initial}</div>
                )}
                <button
                  className={styles.avatarEditBtn}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Trocar foto de perfil"
                >
                  {uploadingAvatar ? (
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                  ) : '📷'}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_EXTS}
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              <h2 className={styles.profileName}>{displayData.username || user.username}</h2>
              <p className={styles.profileEmail}>{displayData.email || user.email}</p>
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
                  <InfoRow label="Usuário" value={`@${displayData.username || user.username || ''}`} />
                  <InfoRow label="E-mail" value={displayData.email || user.email} />
                  <InfoRow label="Tipo de conta" value={isGom ? 'GOM (Group Order Manager)' : 'Usuário padrão'} />
                  <InfoRow label="Celular" value={profileData?.phoneNumber || '—'} />
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
                  <div className="field">
                    <label>Celular</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={profile.phoneNumber}
                      onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
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