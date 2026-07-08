import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersApi } from '../api/client';
import { Star, ArrowLeft, Loader2, MessageSquare, Package } from 'lucide-react';
import styles from './GomProfilePage.module.css';

const MAX_COMMENT = 500;

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={readonly ? 14 : 22}
          strokeWidth={1.8}
          style={{
            color: star <= display ? '#F59E0B' : 'var(--gray-light)',
            fill: star <= display ? '#F59E0B' : 'transparent',
            cursor: readonly ? 'default' : 'pointer',
            transition: 'color 0.1s, fill 0.1s',
            flexShrink: 0,
          }}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(star)}
        />
      ))}
    </div>
  );
}

export default function GomProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [gom, setGom]         = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwnProfile = user?.id === id;

  const fetchGom = useCallback(async () => {
    try {
      const data = await usersApi.getProfile(id);
      setGom(data);
    } catch {
      toast.error('Perfil não encontrado.');
      navigate('/');
    }
  }, [id]);

  const fetchReviews = useCallback(async (p = 1) => {
    setLoadingReviews(true);
    try {
      const data = await usersApi.getReviews(id, p);
      setReviews(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error('Erro ao carregar avaliações.');
    } finally {
      setLoadingReviews(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchGom();
      await fetchReviews(1);
      setLoading(false);
    };
    init();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) { toast.info('Faça login para avaliar.'); return; }
    if (rating === 0) { toast.error('Selecione uma nota de 1 a 5 estrelas.'); return; }
    if (!comment.trim()) { toast.error('Escreva um comentário.'); return; }

    setSubmitting(true);
    try {
      await usersApi.submitReview(id, { rating, comment: comment.trim() });
      toast.success('Avaliação enviada!');
      setRating(0);
      setComment('');
      await fetchGom();
      await fetchReviews(1);
    } catch (err) {
      if (err?.status === 400) toast.error('Você não pode avaliar a si mesmo.');
      else toast.error(err?.message || 'Erro ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Loader2 size={36} strokeWidth={1.5} style={{ color: 'var(--rose)', animation: 'spin 1s linear infinite' }} />
    </main>
  );

  if (!gom) return null;

  const initial = (gom.username || '?')[0].toUpperCase();
  const hasRating = gom.reviewCount > 0;

  return (
    <main className={styles.page}>
      <div className="page-container">

        <button
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={15} strokeWidth={2} /> Voltar
        </button>

        <div className={styles.layout}>

          {/* Sidebar — perfil */}
          <aside className={styles.sidebar}>
            <div className={`card ${styles.profileCard}`}>
              {gom.profilePicUrl ? (
                <img
                  src={gom.profilePicUrl}
                  alt={gom.username}
                  className={styles.avatar}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className={`avatar ${styles.avatarFallback}`}>{initial}</div>
              )}

              <h1 className={styles.username}>{gom.username}</h1>
              <span className={styles.gomBadge}>Group Order Manager</span>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {hasRating ? gom.averageRating.toFixed(1) : '—'}
                  </span>
                  <span className={styles.statLabel}>
                    {hasRating ? `${gom.reviewCount} avaliação${gom.reviewCount !== 1 ? 'ões' : ''}` : 'Sem avaliações'}
                  </span>
                  {hasRating && (
                    <StarRating value={Math.round(gom.averageRating)} readonly />
                  )}
                </div>

                <div className={styles.statDivider} />

                <div className={styles.statItem}>
                  <span className={styles.statValue}>{gom.publishedSetsCount ?? 0}</span>
                  <span className={styles.statLabel}>
                    set{(gom.publishedSetsCount ?? 0) !== 1 ? 's' : ''} publicado{(gom.publishedSetsCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className={styles.content}>

            {/* Formulário de avaliação */}
            {user && !isOwnProfile && (
              <div className={`card ${styles.reviewForm}`}>
                <h2 className={styles.sectionTitle}>
                  <MessageSquare size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  Deixe seu feedback
                </h2>
                <hr className="divider" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                      Sua nota
                    </label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>

                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Comentário
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      maxLength={MAX_COMMENT}
                      placeholder="Conte como foi sua experiência com este GOM..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray)', textAlign: 'right', display: 'block', marginTop: 2 }}>
                      {comment.length}/{MAX_COMMENT}
                    </span>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitReview}
                    disabled={submitting || rating === 0 || !comment.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {submitting
                      ? <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                      : 'Enviar avaliação'
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Lista de avaliações */}
            <div className={`card ${styles.reviewList}`}>
              <h2 className={styles.sectionTitle}>
                <Star size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                Avaliações
                {totalCount > 0 && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)', marginLeft: 6 }}>
                    {totalCount} no total
                  </span>
                )}
              </h2>
              <hr className="divider" />

              {loadingReviews ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Loader2 size={24} strokeWidth={1.5} style={{ color: 'var(--rose)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray)', fontSize: '0.88rem' }}>
                  Nenhuma avaliação ainda.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {reviews.map((r) => {
                      const reviewInitial = (r.authorUsername || '?')[0].toUpperCase();
                      const date = new Date(r.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      });

                      return (
                        <div key={r.id} className={styles.reviewItem}>
                          <div className={styles.reviewHeader}>
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
                                  <StarRating value={r.rating} readonly />
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

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={page === 1}
                        onClick={() => fetchReviews(page - 1)}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '0.82rem', color: 'var(--gray)', fontWeight: 600 }}>
                        {page} / {totalPages}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={page === totalPages}
                        onClick={() => fetchReviews(page + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}