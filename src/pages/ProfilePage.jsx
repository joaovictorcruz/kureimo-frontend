import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersApi } from '../api/client';
import ImageCropModal from '../components/ImageCropModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import {
  User,
  Pencil,
  Lock,
  Crown,
  Sparkles,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import styles from './ProfilePage.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const MAX_IMAGE_SIZE      = 5 * 1024 * 1024;

export default function ProfilePage() {
  // profilePicUrl vem do contexto (localStorage + /auth/me) — não precisa de GET separado
  const { user, logout, isGom, profilePicUrl, updateProfilePic } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [passMode, setPassMode] = useState(false);
  const [saving, setSaving]     = useState(false);

  const [cropSrc, setCropSrc]                 = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Formulário de edição — populado com dados do contexto, sem GET extra
  const [profile, setProfile] = useState({ username: '', email: '', phoneNumber: '' });
  const [passwords, setPasswords] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  // Preenche o form quando o user do contexto estiver pronto
  useEffect(() => {
    if (!user) return;
    setProfile({
      username:    user.username    || '',
      email:       user.email       || '',
      phoneNumber: user.phoneNumber || '',
    });
  }, [user]);

  if (!user) { navigate('/'); return null; }

  const initial   = (user.username || '?')[0].toUpperCase();
  const avatarUrl = profilePicUrl || null; // vem do contexto, sempre atualizado

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, JPEG, PNG ou WEBP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('A imagem deve ter no máximo 5MB.');
      e.target.value = '';
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCropConfirm = async (blob) => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'profile-pic.jpg');
      // user.id pode ser null → usersApi.updateProfilePic usa /users/me como fallback
      await usersApi.updateProfilePic(user.id, formData);
      toast.success('Foto de perfil atualizada!');
      // Busca a nova URL e atualiza o contexto (reflete no Navbar imediatamente)
      const updated = await usersApi.get(user.id);
      if (updated?.profilePicUrl) updateProfilePic(updated.profilePicUrl);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCropCancel = () => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.username.trim()) { toast.error('Nome de usuário é obrigatório.'); return; }
    setSaving(true);
    try {
      // user.id pode ser null → usersApi.update usa /users/me como fallback
      await usersApi.update(user.id, {
        username:    profile.username,
        email:       profile.email,
        phoneNumber: profile.phoneNumber,
      });
      toast.success('Perfil atualizado!');
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
        newPassword:     passwords.newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setPassMode(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err?.message || 'Senha atual incorreta ou erro ao alterar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    await usersApi.delete(user.id);
    logout();
    navigate('/');
    toast.success('Conta excluída.');
  };

  return (
    <>
      <main className={styles.page}>
        <div className="page-container">
          <div className={styles.layout}>

            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
              <div className={`card ${styles.profileCard}`}>
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
                    {uploadingAvatar
                      ? <span className="spinner" style={{ width: 12, height: 12 }} />
                      : <Camera size={13} strokeWidth={2} />
                    }
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_EXTS}
                    onChange={handleAvatarFileChange}
                    style={{ display: 'none' }}
                  />
              </div>
                <h2 className={styles.profileName}>{user.username}</h2>
                <p className={styles.profileEmail}>{user.email}</p>
              </div>

              <div className={`card ${styles.quickNav}`}>
                <button
                  className={`${styles.navItem} ${!editMode && !passMode ? styles.navItemActive : ''}`}
                  onClick={() => { setEditMode(false); setPassMode(false); }}
                >
                  <User size={15} strokeWidth={2} /> Informações
                </button>
                <button
                  className={`${styles.navItem} ${editMode ? styles.navItemActive : ''}`}
                  onClick={() => { setEditMode(true); setPassMode(false); }}
                >
                  <Pencil size={15} strokeWidth={2} /> Editar perfil
                </button>
                <button
                  className={`${styles.navItem} ${passMode ? styles.navItemActive : ''}`}
                  onClick={() => { setPassMode(true); setEditMode(false); }}
                >
                  <Lock size={15} strokeWidth={2} /> Alterar senha
                </button>
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className={styles.content}>

              {/* View */}
              {!editMode && !passMode && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Informações da conta</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                      <Pencil size={13} strokeWidth={2} /> Editar
                    </button>
                  </div>
                  <hr className="divider" />
                  <div className={styles.infoGrid}>
                    <InfoRow label="Usuário"      value={`@${user.username}`} />
                    <InfoRow label="E-mail"        value={user.email} />
                    <InfoRow label="Tipo de conta" value={isGom ? 'GOM (Group Order Manager)' : 'Usuário padrão'} />
                    <InfoRow label="Celular"        value={user.phoneNumber || '—'} />
                  </div>
                  <div className={styles.dangerZone}>
                    <p className={styles.dangerTitle}>
                      <AlertTriangle size={14} strokeWidth={2} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      Zona de perigo
                    </p>
                    <p className={styles.dangerDesc}>Excluir a conta é permanente e remove todos os seus dados.</p>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>Excluir conta</button>
                  </div>
                </div>
              )}

              {/* Edit */}
              {editMode && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Editar perfil</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancelar</button>
                  </div>
                  <hr className="divider" />
                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="field">
                      <label>Nome de usuário</label>
                      <input className="input" value={profile.username}
                        onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} autoFocus />
                    </div>
                    <div className="field">
                      <label>E-mail</label>
                      <input className="input" type="email" value={profile.email}
                        onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Celular</label>
                      <input className="input" type="tel" value={profile.phoneNumber}
                        onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Password */}
              {passMode && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Alterar senha</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPassMode(false)}>Cancelar</button>
                  </div>
                  <hr className="divider" />
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="field">
                      <label>Senha atual</label>
                      <input className="input" type="password" placeholder="••••••••"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                        required />
                    </div>
                    <div className="field">
                      <label>Nova senha</label>
                      <input className="input" type="password" placeholder="Mínimo 6 caracteres"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                        required />
                    </div>
                    <div className="field">
                      <label>Confirmar nova senha</label>
                      <input className="input" type="password" placeholder="••••••••"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                        required />
                      {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                        <span style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: 2 }}>
                          As senhas não coincidem.
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setPassMode(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving
                          ? <span className="spinner" style={{ width: 18, height: 18 }} />
                          : <><Lock size={14} strokeWidth={2} /> Alterar senha</>
                        }
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          shape="circle"
          aspect={1}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          username={user.username}
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-soft)', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}