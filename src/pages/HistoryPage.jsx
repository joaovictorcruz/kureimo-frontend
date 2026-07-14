import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  History,
  Radio,
  Send,
  Lock,
  FileText,
  Link2,
  Clock,
  Package,
} from 'lucide-react';
import styles from './Dashboard.module.css';

const STATUS_LABELS = {
  Draft:     { label: 'Rascunho',  cls: 'badge-gray',  Icon: FileText },
  Published: { label: 'Publicado', cls: 'badge-lilac', Icon: Send     },
  Open:      { label: 'Ao vivo',   cls: 'badge-live',  Icon: Radio    },
  Closed:    { label: 'Encerrado', cls: 'badge-gray',  Icon: Lock     },
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [sets, setSets]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
  }, [user, authLoading, navigate]);

  const fetchSets = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await setsApi.getClaimed(p, PAGE_SIZE);
      setSets(data.items || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error('Erro ao carregar seu histórico.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!authLoading && user) fetchSets(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, page]);

  const copyLink = (set) => {
    navigator.clipboard.writeText(`${window.location.origin}/set/${set.accessToken}`);
    toast.success('Link copiado!');
  };

  if (authLoading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </main>
  );

  return (
    <main className={styles.page}>
      <div className="page-container">

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1>Histórico</h1>
            <p style={{ color: 'var(--gray)', marginTop: 6, fontSize: '0.95rem' }}>
              Sets em que você já deu claim.
            </p>
          </div>
        </div>

        {/* Sets list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        ) : sets.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <div className={styles.emptyIcon}>
              <History size={32} strokeWidth={1.5} />
            </div>
            <h2>Nenhuma participação ainda</h2>
            <p style={{ color: 'var(--gray)', marginTop: 8, marginBottom: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              Quando você der claim em um set, ele vai aparecer aqui.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.setsList}>
              {sets.map((set) => {
                const sm = STATUS_LABELS[set.status] || { label: set.status, cls: 'badge-gray', Icon: FileText };
                const StatusIcon = sm.Icon;
                const claimDate = set.claimOpensAt ? new Date(set.claimOpensAt) : null;
                const isClosed  = set.status === 'Closed';

                return (
                  <div key={set.id} className={`card ${styles.setCard} ${isClosed ? styles.setCardClosed : ''}`}>

                    {/* Thumbnail */}
                    <div className={styles.setThumb}>
                      {set.imageUrl
                        ? <img src={set.imageUrl} alt={set.title} />
                        : <div className={styles.setThumbPlaceholder}><Package size={22} strokeWidth={1.5} color="var(--blush)" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className={styles.setInfo}>
                      <div className={styles.setInfoTop}>
                        <span className={`badge ${sm.cls}`}>
                          <StatusIcon size={10} strokeWidth={2.5} /> {sm.label}
                        </span>
                        <span style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>
                          {set.totalPhotocards || 0} membro{set.totalPhotocards !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <h3 className={styles.setName}>{set.title || '(sem título)'}</h3>
                      {claimDate && (
                        <div className={styles.claimDate}>
                          <Clock size={11} strokeWidth={2} />
                          <span>
                            Claim: {claimDate.toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit',
                              year: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={styles.setActions}>
                      <button className="btn btn-secondary btn-sm" onClick={() => copyLink(set)} title="Copiar link">
                        <Link2 size={14} strokeWidth={2} />
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/set/${set.accessToken}`)}>
                        Ver →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ← Anterior
                </button>
                <span className={styles.pageInfo}>Página {page} de {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}