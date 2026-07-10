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
  Camera,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import styles from './ProfilePage.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const MAX_IMAGE_SIZE      = 5 * 1024 * 1024;

const LOGTO_ACCOUNT_URL = 'https://auth.kureimo.com/account/security';

export default function ProfilePage() {
  const { user, logout, isGom, profilePicUrl, updateProfilePic } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [editMode, setEditMode]               = useState(false);
  const [cropSrc, setCropSrc]                 = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profile, setProfile]                 = useState({ username: '', email: '', phoneNumber: '' });

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
  const avatarUrl = profilePicUrl || null;

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
      await usersApi.updateProfilePic(user.id, formData);
      toast.success('Foto de perfil atualizada!');
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
                  className={`${styles.navItem} ${!editMode ? styles.navItemActive : ''}`}
                  onClick={() => setEditMode(false)}
                >
                  <User size={15} strokeWidth={2} /> Informações
                </button>
                <button
                  className={`${styles.navItem} ${editMode ? styles.navItemActive : ''}`}
                  onClick={() => setEditMode(true)}
                >
                  <Pencil size={15} strokeWidth={2} /> Editar perfil
                </button>
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className={styles.content}>

              {/* Informações */}
              {!editMode && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Informações da conta</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                      <Pencil size={13} strokeWidth={2} /> Editar
                    </button>
                  </div>
                  <hr className="divider" />
                  <div className={styles.infoGrid}>
                    <InfoRow label="Usuário"       value={`@${user.username}`} />
                    <InfoRow label="E-mail"         value={user.email} />
                    <InfoRow label="Tipo de conta"  value={isGom ? 'GOM (Group Order Manager)' : 'Collector'} />
                    <InfoRow label="Celular"         value={user.phoneNumber || '—'} />
                  </div>
                  <div className={styles.dangerZone}>
                    <p className={styles.dangerTitle}>
                      <AlertTriangle size={14} strokeWidth={2} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      Zona de perigo
                    </p>
                    <p className={styles.dangerDesc}>Excluir a conta é permanente e remove todos os seus dados.</p>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
                      Excluir conta
                    </button>
                  </div>
                </div>
              )}

              {/* Editar perfil */}
              {editMode && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Editar perfil</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>
                      Fechar
                    </button>
                  </div>
                  <hr className="divider" />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="field">
                      <label>Nome de usuário</label>
                      <input
                        className="input"
                        value={profile.username}
                        readOnly
                        style={{ cursor: 'default', opacity: 0.7 }}
                      />
                    </div>
                    <div className="field">
                      <label>E-mail</label>
                      <input
                        className="input"
                        type="email"
                        value={profile.email}
                        readOnly
                        style={{ cursor: 'default', opacity: 0.7 }}
                      />
                    </div>
                    <div className="field">
                      <label>Celular</label>
                      <input
                        className="input"
                        type="tel"
                        value={profile.phoneNumber}
                        readOnly
                        style={{ cursor: 'default', opacity: 0.7 }}
                      />
                    </div>

                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(242, 134, 149, 0.06)',
                      border: '1px solid rgba(242, 134, 149, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
                        Precisa alterar seus dados ou senha?
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--gray)', lineHeight: 1.5 }}>
                        Username, e-mail, telefone e senha são gerenciados pelo nosso sistema de autenticação seguro.
                      </span>
                      
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, width: 'fit-content' }}
                        onClick={() => window.open(LOGTO_ACCOUNT_URL, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink size={13} strokeWidth={2} />
                        Gerenciar dados de acesso e senha
                      </button>
                    </div>
                  </div>
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