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
  Eye,
  Star,
  Loader2,
} from 'lucide-react';
import styles from './ProfilePage.module.css';
import gomStyles from './GomProfilePage.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const MAX_IMAGE_SIZE      = 5 * 1024 * 1024;

const LOGTO_ACCOUNT_URL = 'https://auth.kureimo.com/account/security';

function StarRating({ value }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          strokeWidth={1.8}
          style={{
            color: star <= value ? '#F59E0B' : 'var(--gray-light)',
            fill: star <= value ? '#F59E0B' : 'transparent',
          }}
        />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, isGom, profilePicUrl, updateProfilePic } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [view, setView]                       = useState('info'); // 'info' | 'edit' | 'overview'
  const [cropSrc, setCropSrc]                 = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profile, setProfile]                 = useState({ username: '', email: '', phoneNumber: '' });

  // ── Visão geral (mesmo perfil público que um collector vê, sem poder se autoavaliar) ──
  const [overview, setOverview]                             = useState(null);
  const [loadingOverview, setLoadingOverview]                = useState(false);
  const [overviewReviews, setOverviewReviews]                 = useState([]);
  const [overviewTotalCount, setOverviewTotalCount]           = useState(0);
  const [overviewTotalPages, setOverviewTotalPages]           = useState(1);
  const [overviewPage, setOverviewPage]                       = useState(1);
  const [loadingOverviewReviews, setLoadingOverviewReviews]   = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      username:    user.username    || '',
      email:       user.email       || '',
      phoneNumber: user.phoneNumber || '',
    });
  }, [user]);

  const fetchOverviewReviews = async (p = 1) => {
    if (!user) return;
    setLoadingOverviewReviews(true);
    try {
      const data = await usersApi.getReviews(user.id, p);
      setOverviewReviews(data.items || []);
      setOverviewTotalCount(data.totalCount || 0);
      setOverviewTotalPages(data.totalPages || 1);
      setOverviewPage(p);
    } catch {
      toast.error('Erro ao carregar avaliações.');
    } finally {
      setLoadingOverviewReviews(false);
    }
  };

  useEffect(() => {
    if (view !== 'overview' || !user || !isGom || overview) return;
    const loadOverview = async () => {
      setLoadingOverview(true);
      try {
        const data = await usersApi.getProfile(user.id);
        setOverview(data);
      } catch {
        toast.error('Erro ao carregar visão geral.');
      } finally {
        setLoadingOverview(false);
      }
      fetchOverviewReviews(1);
    };
    loadOverview();
  }, [view, user, isGom]);

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
                {isGom && (
                  <button
                    className={`${styles.navItem} ${view === 'overview' ? styles.navItemActive : ''}`}
                    onClick={() => setView('overview')}
                  >
                    <Eye size={15} strokeWidth={2} /> Visão geral
                  </button>
                )}
                <button
                  className={`${styles.navItem} ${view === 'info' ? styles.navItemActive : ''}`}
                  onClick={() => setView('info')}
                >
                  <User size={15} strokeWidth={2} /> Informações
                </button>
                <button
                  className={`${styles.navItem} ${view === 'edit' ? styles.navItemActive : ''}`}
                  onClick={() => setView('edit')}
                >
                  <Pencil size={15} strokeWidth={2} /> Editar perfil
                </button>
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className={styles.content}>

              {/* Visão geral */}
              {view === 'overview' && isGom && (
                <>
                  <div className={`card ${styles.section}`}>
                    <div className={styles.sectionHeader}>
                      <h2>Visão geral do perfil</h2>
                    </div>
                    <hr className="divider" />

                    {loadingOverview ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                        <Loader2 size={28} strokeWidth={1.5} style={{ color: 'var(--rose)', animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : overview && (
                      <div className={gomStyles.stats} style={{ justifyContent: 'flex-start', gap: 32, marginTop: 8 }}>
                        <div className={gomStyles.statItem}>
                          <span className={gomStyles.statValue}>
                            {overview.reviewCount > 0 ? overview.averageRating.toFixed(1) : '—'}
                          </span>
                          <span className={gomStyles.statLabel}>
                            {overview.reviewCount > 0
                              ? `${overview.reviewCount} avaliação${overview.reviewCount !== 1 ? 'ões' : ''}`
                              : 'Sem avaliações'}
                          </span>
                          {overview.reviewCount > 0 && (
                            <StarRating value={Math.round(overview.averageRating)} />
                          )}
                        </div>

                        <div className={gomStyles.statDivider} />

                        <div className={gomStyles.statItem}>
                          <span className={gomStyles.statValue}>{overview.publishedSetsCount ?? 0}</span>
                          <span className={gomStyles.statLabel}>
                            set{(overview.publishedSetsCount ?? 0) !== 1 ? 's' : ''} publicado{(overview.publishedSetsCount ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 18 }}>
                      É assim que os collectors veem seu perfil. Você não pode avaliar a si mesmo.
                    </p>
                  </div>

                  <div className={`card ${styles.section}`}>
                    <div className={styles.sectionHeader}>
                      <h2>Avaliações recebidas</h2>
                      {overviewTotalCount > 0 && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)' }}>
                          {overviewTotalCount} no total
                        </span>
                      )}
                    </div>
                    <hr className="divider" />

                    {loadingOverviewReviews ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                        <Loader2 size={24} strokeWidth={1.5} style={{ color: 'var(--rose)', animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : overviewReviews.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray)', fontSize: '0.88rem' }}>
                        Nenhuma avaliação ainda.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {overviewReviews.map((r) => {
                            const reviewInitial = (r.authorUsername || '?')[0].toUpperCase();
                            const date = new Date(r.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            });

                            return (
                              <div key={r.id} className={gomStyles.reviewItem}>
                                <div className={gomStyles.reviewHeader}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {r.authorProfilePicUrl ? (
                                      <img
                                        src={r.authorProfilePicUrl}
                                        alt={r.authorUsername}
                                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.72rem', flexShrink: 0 }}>
                                        {reviewInitial}
                                      </div>
                                    )}
                                    <div>
                                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink)' }}>
                                        {r.authorUsername}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <StarRating value={r.rating} />
                                        <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{date}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p style={{ margin: '10px 0 0', fontSize: '0.88rem', color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                                  {r.comment}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {overviewTotalPages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={overviewPage === 1}
                              onClick={() => fetchOverviewReviews(overviewPage - 1)}
                            >
                              Anterior
                            </button>
                            <span style={{ fontSize: '0.82rem', color: 'var(--gray)', fontWeight: 600 }}>
                              {overviewPage} / {overviewTotalPages}
                            </span>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={overviewPage === overviewTotalPages}
                              onClick={() => fetchOverviewReviews(overviewPage + 1)}
                            >
                              Próxima
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Informações */}
              {view === 'info' && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Informações da conta</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => setView('edit')}>
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
              {view === 'edit' && (
                <div className={`card ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <h2>Editar perfil</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setView('info')}>
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