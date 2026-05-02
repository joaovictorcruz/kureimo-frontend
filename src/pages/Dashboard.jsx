import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import CreateSetModal from '../components/CreateSetModal';
import EditSetModal from '../components/EditSetModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  Package,
  Radio,
  Send,
  Lock,
  Crown,
  FileText,
  Link2,
  Pencil,
  Trash2,
  AlertTriangle,
  Rocket,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import styles from './Dashboard.module.css';

const STATUS_LABELS = {
  Draft:     { label: 'Rascunho',  cls: 'badge-gray', Icon: FileText },
  Published: { label: 'Publicado', cls: 'badge-lilac', Icon: Send     },
  Open:      { label: 'Ao vivo',   cls: 'badge-live',  Icon: Radio    },
  Closed:    { label: 'Encerrado', cls: 'badge-gray',  Icon: Lock     },
};

const PAGE_SIZE = 10;

export default function Dashboard() {
  const { user, isGom, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const [closeModal, setCloseModal]     = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [editModal, setEditModal]       = useState(null);
  const [cancelModal, setCancelModal]   = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    if (!isGom) { navigate('/'); toast.error('Acesso apenas para GOMs'); return; }
  }, [user, isGom, authLoading]);

  const fetchSets = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await setsApi.getMine(p, PAGE_SIZE);
      setSets(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch {
      toast.error('Erro ao carregar seus sets.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!authLoading && user && isGom) fetchSets(page);
  }, [authLoading, user, isGom, page]);

  const copyLink = (set) => {
    navigator.clipboard.writeText(`${window.location.origin}/set/${set.accessToken}`);
    toast.success('Link copiado!');
  };

  const handlePublish = async (set) => {
    setActioningId(set.id);
    try {
      await setsApi.publish(set.accessToken);
      toast.success(`"${set.title}" publicado!`);
      setSets((prev) => prev.map((s) => s.id === set.id ? { ...s, status: 'Published' } : s));
    } catch (err) {
      toast.error(err?.message || 'Erro ao publicar.');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async () => {
    const set = cancelModal;
    setCancelModal(null);
    setActioningId(set.id);
    try {
      await setsApi.cancel(set.accessToken);
      toast.success(`"${set.title}" cancelado.`);
      setSets((prev) => prev.filter((s) => s.id !== set.id));
      setTotalCount((c) => c - 1);
    } catch (err) {
      toast.error(err?.message || 'Erro ao cancelar o set.');
    } finally {
      setActioningId(null);
    }
  };

  const handleClose = async () => {
    const set = closeModal;
    setCloseModal(null);
    setActioningId(set.id);
    try {
      await setsApi.close(set.accessToken);
      toast.success(`Claim de "${set.title}" encerrado.`);
      setSets((prev) => prev.map((s) => s.id === set.id ? { ...s, status: 'Closed' } : s));
    } catch (err) {
      toast.error(err?.message || 'Erro ao fechar o claim.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteOne = async () => {
    const set = deleteModal;
    setDeleteModal(null);
    setActioningId(set.id);
    try {
      await setsApi.deleteOne(set.accessToken);
      toast.success(`"${set.title}" removido do histórico.`);
      setSets((prev) => prev.filter((s) => s.id !== set.id));
      setTotalCount((c) => c - 1);
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir o set.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteHistory = async () => {
    setHistoryModal(false);
    setLoading(true);
    try {
      await setsApi.deleteHistory();
      toast.success('Histórico de sets encerrados limpo!');
      fetchSets(1);
      setPage(1);
    } catch (err) {
      toast.error(err?.message || 'Erro ao limpar histórico.');
      setLoading(false);
    }
  };

  if (authLoading) return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </main>
  );

  const liveSets   = sets.filter((s) => s.status === 'Open').length;
  const closedSets = sets.filter((s) => s.status === 'Closed').length;
  const hasClosed  = sets.some((s) => s.status === 'Closed');

  return (
    <main className={styles.page}>
      <div className="page-container">

        {/* Header */}
        <div className={styles.header}>
          <div>
            <span className="badge badge-pink" style={{ marginBottom: 12 }}>
              <Crown size={11} strokeWidth={2.5} /> Painel GOM
            </span>
            <h1>Meus Sets</h1>
            <p style={{ color: 'var(--gray)', marginTop: 6, fontSize: '0.95rem' }}>
              Olá, <strong style={{ color: 'var(--ink-soft)' }}>{user?.username}</strong>! Crie e gerencie seus sets aqui.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {hasClosed && (
              <button className="btn btn-secondary" onClick={() => setHistoryModal(true)}>
                Limpar histórico
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
              + Novo set
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {[
            { label: 'Total de sets', value: totalCount,  Icon: Package,    color: 'var(--blush-light)'  },
            { label: 'Ao vivo',       value: liveSets,    Icon: Radio,      color: 'var(--rose-light)'   },
            { label: 'Publicados',    value: sets.filter((s) => s.status === 'Published').length, Icon: Send, color: 'var(--peach-light)' },
            { label: 'Fechados',      value: closedSets,  Icon: Lock,       color: 'var(--butter-light)' },
          ].map((s) => {
            const Icon = s.Icon;
            return (
              <div key={s.label} className={`card ${styles.statCard}`} style={{ background: s.color }}>
                <div className={styles.statIcon}>
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Sets list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        ) : sets.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <div className={styles.emptyIcon}>
              <LayoutGrid size={32} strokeWidth={1.5} />
            </div>
            <h2>Nenhum set ainda</h2>
            <p style={{ color: 'var(--gray)', marginTop: 8, marginBottom: 28, maxWidth: 360 }}>
              Crie seu primeiro set, personalize o visual e compartilhe o link com sua comunidade!
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Criar primeiro set
            </button>
          </div>
        ) : (
          <>
            <div className={styles.setsList}>
              {sets.map((set) => {
                const sm = STATUS_LABELS[set.status] || { label: set.status, cls: 'badge-gray', Icon: FileText };
                const StatusIcon = sm.Icon;
                const claimDate = set.claimOpensAt ? new Date(set.claimOpensAt) : null;
                const isActioning = actioningId === set.id;
                const isClosed = set.status === 'Closed';

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

                      {set.status === 'Draft' && (
                        <div className={styles.draftHint}>
                          {!set.totalPhotocards ? (
                            <>
                              <AlertTriangle size={13} strokeWidth={2} className={styles.draftHintIcon} color="var(--ink-soft)" />
                              <span>Adicione os membros desse set para poder publicá-lo.</span>
                            </>
                          ) : (
                            <>
                              <Rocket size={13} strokeWidth={2} className={styles.draftHintIcon} color="var(--ink-soft)" />
                              <span>Publique esse set para que os collectors possam ver e dar claim!</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={styles.setActions}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/set/${set.accessToken}`)}>
                        Ver →
                      </button>

                      <button className="btn btn-secondary btn-sm" onClick={() => copyLink(set)} title="Copiar link">
                        <Link2 size={14} strokeWidth={2} />
                      </button>

                      {/* Draft only */}
                      {set.status === 'Draft' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditModal(set)}>
                          <Pencil size={13} strokeWidth={2} /> Editar
                        </button>
                      )}
                      {set.status === 'Draft' && !!set.totalPhotocards && (
                        <button className="btn btn-primary btn-sm" disabled={isActioning} onClick={() => handlePublish(set)}>
                          {isActioning
                            ? <span className="spinner" style={{ width: 14, height: 14 }} />
                            : <><Send size={13} strokeWidth={2} /> Publicar</>
                          }
                        </button>
                      )}

                      {/* Draft ou Published → Cancelar */}
                      {(set.status === 'Draft' || set.status === 'Published') && (
                        <button className="btn btn-danger btn-sm" disabled={isActioning} onClick={() => setCancelModal(set)}>
                          {isActioning ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Cancelar'}
                        </button>
                      )}

                      {/* Open → Fechar */}
                      {set.status === 'Open' && (
                        <button className="btn btn-danger btn-sm" disabled={isActioning} onClick={() => setCloseModal(set)}>
                          {isActioning
                            ? <span className="spinner" style={{ width: 14, height: 14 }} />
                            : <><Lock size={13} strokeWidth={2} /> Fechar</>
                          }
                        </button>
                      )}

                      {/* Closed → Excluir */}
                      {isClosed && (
                        <button className="btn btn-ghost btn-sm" disabled={isActioning} onClick={() => setDeleteModal(set)}
                          style={{ color: '#c0392b' }}>
                          {isActioning
                            ? <span className="spinner" style={{ width: 14, height: 14 }} />
                            : <><Trash2 size={13} strokeWidth={2} /> Excluir</>
                          }
                        </button>
                      )}
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

      {/* Modais */}
      {editModal && (
        <EditSetModal
          set={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setSets((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
            setEditModal(null);
          }}
        />
      )}

      {showCreate && (
        <CreateSetModal
          onClose={() => setShowCreate(false)}
          onCreated={(newSet) => {
            setShowCreate(false);
            toast.success('Set criado!');
            navigate(`/set/${newSet.accessToken}`);
          }}
        />
      )}

      {cancelModal && (
        <ConfirmModal
          title="Cancelar set"
          message={`Tem certeza que deseja cancelar o set "${cancelModal.title}"?`}
          confirmLabel="Sim, cancelar"
          confirmClass="btn-danger"
          onConfirm={handleCancel}
          onCancel={() => setCancelModal(null)}
        />
      )}

      {closeModal && (
        <ConfirmModal
          title="Fechar claim"
          message={`Ao fechar um set, ninguém poderá mais dar claim e ele não poderá ser aberto novamente.\n\nTem certeza que deseja fechar o set "${closeModal.title}"?`}
          confirmLabel="Sim, fechar claim"
          confirmClass="btn-danger"
          onConfirm={handleClose}
          onCancel={() => setCloseModal(null)}
        />
      )}

      {deleteModal && (
        <ConfirmModal
          title="Excluir set do histórico"
          message={`Tem certeza que deseja excluir o histórico do set "${deleteModal.title}"?\n\nEssa ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          confirmClass="btn-danger"
          onConfirm={handleDeleteOne}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {historyModal && (
        <ConfirmModal
          title="Limpar histórico"
          message={`Tem certeza que deseja limpar o histórico de todos os sets que já foram fechados?\n\nEssa ação não pode ser desfeita.`}
          confirmLabel="Sim, limpar tudo"
          confirmClass="btn-danger"
          onConfirm={handleDeleteHistory}
          onCancel={() => setHistoryModal(false)}
        />
      )}
    </main>
  );
}