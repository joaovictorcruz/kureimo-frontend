import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { setsApi, claimsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { useSignalR } from '../hooks/useSignalR';
import AddPhotocardModal from '../components/AddPhotocardModal';
import ClaimRankModal from '../components/ClaimRankModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageCropModal from '../components/ImageCropModal';
import styles from './SetPage.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const MAX_IMAGE_SIZE      = 5 * 1024 * 1024;

const FONT_MAP = {
  'Nunito':             "'Nunito', sans-serif",
  'Montserrat':         "'Montserrat', sans-serif",
  'Raleway':            "'Raleway', sans-serif",
  'Poppins':            "'Poppins', sans-serif",
  'Quicksand':          "'Quicksand', sans-serif",
  'Josefin Sans':       "'Josefin Sans', sans-serif",
  'Righteous':          "'Righteous', cursive",
  'DM Serif Display':   "'DM Serif Display', serif",
  'Playfair Display':   "'Playfair Display', serif",
  'Lora':               "'Lora', serif",
  'Cinzel':             "'Cinzel', serif",
  'Cormorant Garamond': "'Cormorant Garamond', serif",
  'Abril Fatface':      "'Abril Fatface', cursive",
  'Pacifico':           "'Pacifico', cursive",
  'Dancing Script':     "'Dancing Script', cursive",
  'Caveat':             "'Caveat', cursive",
  'Satisfy':            "'Satisfy', cursive",
  'Courier New':        "'Courier New', monospace",
  'Space Mono':         "'Space Mono', monospace",
};

export default function SetPage() {
  const { token } = useParams();
  const { user, isGom } = useAuth();
  const toast = useToast();

  const [set, setSet]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [claimedIds, setClaimedIds] = useState(new Set());
  const [claimingId, setClaimingId] = useState(null);
  const [rankModal, setRankModal]   = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);

  // Edição de membros
  const [editMode, setEditMode]     = useState(false);
  const [editingPc, setEditingPc]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingPc, setSavingPc]     = useState(false);
  const [reordering, setReordering] = useState(false);

  // Drag-and-drop reorder
  const dragIndexRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Alterar imagem do set
  const imgInputRef                     = useRef(null);
  const [cropSrc, setCropSrc]           = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const { timeLeft, phase } = useCountdown(set?.claimOpensAt, set?.status);
  const isStreamingPhase = phase === 'streaming' || phase === 'open';
  const { connected, claimEvents } = useSignalR(set?.id, isStreamingPhase);

  useEffect(() => {
    if (!claimEvents.length || !set) return;
    setSet((prev) => {
      if (!prev) return prev;
      const updated = (prev.photocards || []).map((pc) => {
        const relevant = claimEvents.filter((c) => c.photocardId === pc.id);
        if (!relevant.length) return pc;
        const merged = [...(pc.claims || [])];
        relevant.forEach((ev) => {
          if (!merged.find((c) => c.id === ev.id)) merged.push(ev);
        });
        merged.sort((a, b) => new Date(a.claimedAt) - new Date(b.claimedAt));
        return { ...pc, claims: merged };
      });
      return { ...prev, photocards: updated };
    });
  }, [claimEvents]);

  const fetchSet = useCallback(async () => {
    try {
      const data = await setsApi.getByToken(token);
      const photocards = data.photocards || [];
      const enriched = await Promise.all(
        photocards.map(async (pc) => {
          try {
            const claims = await claimsApi.getByPhotocard(pc.id);
            return { ...pc, claims: claims || [] };
          } catch {
            return pc;
          }
        })
      );
      const enrichedSet = { ...data, photocards: enriched };
      setSet(enrichedSet);
      if (user) {
        const ids = new Set(
          enriched
            .filter((pc) => (pc.claims || []).some((c) => c.userId === user.id))
            .map((pc) => pc.id)
        );
        setClaimedIds(ids);
      }
    } catch {
      toast.error('Set não encontrado ou sem acesso 😢');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { fetchSet(); }, [fetchSet]);

  // ── Claim ──
  const handleClaim = async (e, photocardId) => {
    e.stopPropagation();
    if (!user) { toast.info('Faça login para dar claim!'); return; }
    if (phase !== 'open' && phase !== 'streaming') {
      toast.info('O claim ainda não está aberto!'); return;
    }
    setClaimingId(photocardId);
    try {
      const claim = await claimsApi.claim(photocardId);
      setClaimedIds((p) => new Set([...p, photocardId]));
      setSet((prev) => {
        if (!prev) return prev;
        const pcs = (prev.photocards || []).map((pc) => {
          if (pc.id !== photocardId) return pc;
          const claims = [...(pc.claims || []), claim].sort(
            (a, b) => new Date(a.claimedAt) - new Date(b.claimedAt)
          );
          return { ...pc, claims };
        });
        return { ...prev, photocards: pcs };
      });
      toast.success('Claim feito! Você está na fila! 🎉');
      spawnHearts(e.clientX, e.clientY);
    } catch (err) {
      if (err?.status === 409) toast.error('Você já deu claim nesse photocard!');
      else if (err?.status === 422) toast.error('Claim fechado ou inválido.');
      else toast.error('Erro ao dar claim. Tenta de novo!');
    } finally {
      setClaimingId(null);
    }
  };

  const spawnHearts = (x, y) => {
    ['💜', '🌸', '✨', '💗'].forEach((emoji, i) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'float-heart';
        el.textContent = emoji;
        el.style.left = `${x - 12 + Math.random() * 24}px`;
        el.style.top = `${y - 12}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1100);
      }, i * 100);
    });
  };

  // ── Ações GOM: set ──
  const handleCancel = async () => {
    setCancelModal(false);
    try {
      await setsApi.cancel(token);
      toast.success('Set cancelado.');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao cancelar o set.');
    }
  };

  const handlePublish = async () => {
    try {
      await setsApi.publish(token);
      toast.success('Set publicado! 📢');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao publicar.');
    }
  };

  const handleClose = async () => {
    try {
      await setsApi.close(token);
      toast.success('Claim encerrado! 🔒');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao fechar o claim.');
    }
  };

  // ── Ações GOM: membros ──
  const handleSavePc = async () => {
    if (!editingPc?.artistName?.trim()) { toast.error('Nome do artista é obrigatório.'); return; }
    setSavingPc(true);
    try {
      await setsApi.updatePhotocard(token, editingPc.id, {
        artistName: editingPc.artistName.trim(),
        version:    editingPc.version?.trim() || '',
      });
      setSet((prev) => prev ? {
        ...prev,
        photocards: prev.photocards.map((pc) =>
          pc.id === editingPc.id
            ? { ...pc, artistName: editingPc.artistName.trim(), version: editingPc.version?.trim() || '' }
            : pc
        ),
      } : prev);
      toast.success('Membro atualizado! ✨');
      setEditingPc(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar membro.');
    } finally {
      setSavingPc(false);
    }
  };

  const handleDeletePc = async () => {
    const id = deletingId;
    setDeletingId(null);
    try {
      await setsApi.deletePhotocard(token, id);
      setSet((prev) => prev ? {
        ...prev,
        photocards: prev.photocards.filter((pc) => pc.id !== id),
      } : prev);
      toast.success('Membro removido.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao remover membro.');
    }
  };

  // ── Drag-and-drop ──
  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) { setDragOver(null); return; }
    const pcs = [...(set.photocards || [])];
    const [moved] = pcs.splice(dragIndex, 1);
    pcs.splice(dropIndex, 0, moved);
    setSet((prev) => prev ? { ...prev, photocards: pcs } : prev);
    setDragOver(null);
    dragIndexRef.current = null;
    setReordering(true);
    try {
      await setsApi.reorderPhotocards(token, pcs.map((pc) => pc.id));
    } catch {
      toast.error('Erro ao salvar ordem. Recarregando...');
      fetchSet();
    } finally {
      setReordering(false);
    }
  };

  const handleDragEnd = () => { dragIndexRef.current = null; setDragOver(null); };

  // ── Alterar imagem ──
  const handleImgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error('Formato inválido. Use JPG, JPEG, PNG ou WEBP.'); e.target.value = ''; return; }
    if (file.size > MAX_IMAGE_SIZE) { toast.error('A imagem deve ter no máximo 5MB.'); e.target.value = ''; return; }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCropConfirm = async (blob) => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'set-image.jpg');
      await setsApi.updateImage(token, formData);
      toast.success('Imagem atualizada! 🖼️');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar imagem.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCropCancel = () => { URL.revokeObjectURL(cropSrc); setCropSrc(null); };

  // ── Renders ──
  if (loading) return (
    <main className={styles.loadingWrap}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--gray)', marginTop: 16 }}>Carregando o set...</p>
    </main>
  );

  if (!set) return (
    <main className={styles.loadingWrap}>
      <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>😢</div>
        <h2>Set não encontrado</h2>
        <p style={{ color: 'var(--gray)', marginTop: 8 }}>Verifique o link com seu GOM.</p>
      </div>
    </main>
  );

  const theme     = set.theme || {};
  const bgColor   = set.backgroundColor || null;
  const fontColor = set.fontColor || null;
  const fontCss   = set.fontStyle ? FONT_MAP[set.fontStyle] || `'${set.fontStyle}', sans-serif` : null;

  // Dados do GON vindos da API
  const gon = set.gon || {};
  const gonName    = gon.username    || set.gomUsername || set.ownerUsername || 'GOM';
  const gonPicUrl  = gon.profilePicUrl || null;
  const gonInitial = gonName[0].toUpperCase();

  const statusMeta = {
    Draft:     { label: 'Rascunho',   cls: 'badge-gray' },
    Published: { label: 'Publicado',  cls: 'badge-lilac' },
    Open:      { label: '🔴 AO VIVO', cls: 'badge-live'  },
    Closed:    { label: 'Encerrado',  cls: 'badge-gray'  },
  };
  const sm = statusMeta[set.status] || { label: set.status, cls: 'badge-gray' };

  const canAddMember  = isGom && set.status === 'Draft';
  const canEditMember = isGom && (set.status === 'Draft' || set.status === 'Published');

  return (
    <main className={styles.page}>
      {theme.bg && <div className={styles.themeBg} style={{ background: theme.bg }} />}

      <div className={`page-container ${styles.inner}`}>
        <div className={styles.layout}>

          {/* ══════════ LEFT COLUMN ══════════ */}
          <div className={styles.leftCol}>

            <TimerBanner
              phase={phase}
              timeLeft={timeLeft}
              claimOpensAt={set.claimOpensAt}
              apiStatus={set.status}
            />

            {/* Set card */}
            <div className={styles.setCard} style={bgColor ? { background: bgColor } : {}}>
              <div className={styles.setImgWrap}>
                {set.imageUrl ? (
                  <img src={set.imageUrl} alt={set.title} className={styles.setImg} />
                ) : (
                  <div className={styles.setImgPlaceholder}>
                    <span style={{ fontSize: '3rem' }}>🃏</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 8 }}>Nenhuma imagem definida</span>
                  </div>
                )}
                <span className={`badge ${sm.cls}`} style={{ position: 'absolute', top: 14, left: 14 }}>
                  {sm.label}
                </span>
                {connected && isStreamingPhase && (
                  <span className="badge badge-live" style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className={styles.liveDot} /> Tempo real
                  </span>
                )}
                {isGom && (
                  <>
                    <button
                      className={styles.changeImgBtn}
                      onClick={() => imgInputRef.current?.click()}
                      disabled={uploadingImg}
                      title="Alterar imagem do set"
                    >
                      {uploadingImg ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🖼️ Alterar imagem'}
                    </button>
                    <input ref={imgInputRef} type="file" accept={ALLOWED_IMAGE_EXTS} onChange={handleImgFileChange} style={{ display: 'none' }} />
                  </>
                )}
              </div>

              <div className={styles.setMeta}>
                {/* GON row populado com dados da API */}
                <div className={styles.gomRow}>
                  {gonPicUrl ? (
                    <img
                      src={gonPicUrl}
                      alt={gonName}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                      {gonInitial}
                    </div>
                  )}
                  <div>
                    <div className={styles.gomName}>{gonName}</div>
                    <div className={styles.gomSub}>Group Order Manager</div>
                  </div>
                </div>

                <h2
                  className={styles.setTitle}
                  style={{
                    ...(fontCss   ? { fontFamily: fontCss }   : {}),
                    ...(fontColor ? { color: fontColor }       : {}),
                  }}
                >
                  {set.title || 'Set de Photocards'}
                </h2>

                {set.description && (
                  <ul className={styles.descList} style={fontColor ? { color: fontColor, opacity: 0.85 } : {}}>
                    {set.description.split('\n').filter(Boolean).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* GOM control bar — sem botão +Membro aqui */}
            {isGom && (
              <div className={`card ${styles.gomBar}`}>
                <span style={{ fontWeight: 800, color: 'var(--ink-soft)', fontSize: '0.82rem' }}>👑 Painel GOM</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {set.status === 'Draft' && !!(set.photocards || []).length && (
                    <button className="btn btn-primary btn-sm" onClick={handlePublish}>
                      📢 Publicar
                    </button>
                  )}
                  {(set.status === 'Draft' || set.status === 'Published') && (
                    <button className="btn btn-danger btn-sm" onClick={() => setCancelModal(true)}>
                      Cancelar set
                    </button>
                  )}
                  {set.status === 'Open' && (
                    <button className="btn btn-danger btn-sm" onClick={handleClose}>
                      🔒 Fechar claim
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copiado! 🔗');
                  }}>
                    🔗 Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════ RIGHT COLUMN ══════════ */}
          <div className={styles.rightCol}>

            {/* Header com título + botões de ação agrupados */}
            <div className={styles.memberListHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.memberListTitle}>Membros</span>
                <span className={styles.memberListCount}>
                  {(set.photocards || []).length} disponível{(set.photocards || []).length !== 1 ? 'is' : ''}
                </span>
              </div>

              {/* +Membro e Editar membros ficam juntos no lado direito */}
              {canEditMember && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* +Membro só em Draft */}
                  {canAddMember && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => setShowAddCard(true)}
                    >
                      + Membro
                    </button>
                  )}
                  <button
                    className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => { setEditMode((m) => !m); setEditingPc(null); }}
                  >
                    {editMode ? '✓ Concluir' : '✏️ Editar membros'}
                  </button>
                </div>
              )}
            </div>

            {editMode && (
              <div className={styles.gomHint} style={{ marginBottom: 10 }}>
                <span>↕️</span>
                <span>Arraste para reordenar · Clique em ✏️ para editar nome/versão · 🗑️ para excluir</span>
              </div>
            )}

            {isGom && set.status === 'Draft' && !editMode && (
              <div className={styles.gomHint}>
                {!(set.photocards || []).length ? (
                  <><span>⚠️</span><span>Adicione um ou mais membros para poder publicar o seu set para os collectors.</span></>
                ) : (
                  <><span>✅</span><span>Após adicionar todos os membros, publique o set para que os collectors possam dar claim!</span></>
                )}
              </div>
            )}

            {reordering && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.75rem', color: 'var(--gray)' }}>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span>Salvando nova ordem...</span>
              </div>
            )}

            <div className={styles.memberList}>
              {(set.photocards || []).length === 0 ? (
                <div className={styles.emptyMembers}>
                  <span style={{ fontSize: '2rem' }}>🌸</span>
                  <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginTop: 8 }}>Nenhum membro adicionado.</p>
                  {canAddMember && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddCard(true)}>
                      + Adicionar
                    </button>
                  )}
                </div>
              ) : (
                (set.photocards || []).map((pc, index) => (
                  editMode ? (
                    <MemberRowEdit
                      key={pc.id}
                      pc={pc}
                      index={index}
                      isEditing={editingPc?.id === pc.id}
                      editingPc={editingPc}
                      savingPc={savingPc}
                      dragOver={dragOver === index}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onEdit={() => setEditingPc({ id: pc.id, artistName: pc.artistName || '', version: pc.version || '' })}
                      onCancelEdit={() => setEditingPc(null)}
                      onSave={handleSavePc}
                      onDelete={() => setDeletingId(pc.id)}
                      onChange={(field, val) => setEditingPc((p) => ({ ...p, [field]: val }))}
                    />
                  ) : (
                    <MemberRow
                      key={pc.id}
                      pc={pc}
                      phase={phase}
                      claimed={claimedIds.has(pc.id)}
                      claiming={claimingId === pc.id}
                      userId={user?.id}
                      isGom={isGom}
                      onClaim={(e) => handleClaim(e, pc.id)}
                      onOpenRank={() => setRankModal(pc)}
                    />
                  )
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modais ── */}
      {cancelModal && (
        <ConfirmModal
          title="Cancelar set"
          message={`Tem certeza que deseja cancelar o set "${set.title}"?\n\nEle será removido e os collectors perderão o acesso.`}
          confirmLabel="Sim, cancelar set ✕"
          confirmClass="btn-danger"
          onConfirm={handleCancel}
          onCancel={() => setCancelModal(false)}
        />
      )}

      {deletingId && (
        <ConfirmModal
          title="Remover membro"
          message="Tem certeza que deseja remover este membro do set? Todos os claims associados serão perdidos."
          confirmLabel="Sim, remover"
          confirmClass="btn-danger"
          onConfirm={handleDeletePc}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {rankModal && (
        <ClaimRankModal
          photocard={rankModal}
          userId={user?.id}
          onClose={() => setRankModal(null)}
        />
      )}

      {showAddCard && (
        <AddPhotocardModal
          accessToken={token}
          onClose={() => setShowAddCard(false)}
          onAdded={(pc) => {
            setSet((prev) => prev
              ? { ...prev, photocards: [...(prev.photocards || []), { ...pc, claims: [] }] }
              : prev
            );
            setShowAddCard(false);
            toast.success('Membro adicionado! 🃏');
          }}
        />
      )}

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          shape="rect"
          aspect={16 / 9}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </main>
  );
}

/* ── Timer Banner ── */
function TimerBanner({ phase, timeLeft, claimOpensAt, apiStatus }) {
  const date = claimOpensAt ? new Date(claimOpensAt) : null;
  const formatted = date
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  if (phase === 'closed') return (
    <div className={`${styles.timerBanner} ${styles.timerClosed}`}>
      <span>🔒</span><span>Claim encerrado</span>
      {formatted && <span className={styles.timerDate}>· {formatted}</span>}
    </div>
  );

  if (phase === 'open') return (
    <div className={`${styles.timerBanner} ${styles.timerLive}`}>
      <span className={styles.livePulse} />
      <span className={styles.timerValue}>
        {apiStatus === 'Open' && timeLeft && !timeLeft.startsWith('+')
          ? `${timeLeft} adiantado`
          : timeLeft ? `+${timeLeft.replace(/^\+/, '')}` : 'Aberto!'
        }
      </span>
      <span className={styles.timerLabel}>claim aberto! ⚡</span>
    </div>
  );

  if (phase === 'streaming') return (
    <div className={`${styles.timerBanner} ${styles.timerLive}`} style={{ opacity: 0.85 }}>
      <span className={styles.livePulse} />
      <span className={styles.timerValue}>{timeLeft}</span>
      <span className={styles.timerLabel}>para o claim abrir!</span>
    </div>
  );

  return (
    <div className={styles.timerBanner}>
      <span className={styles.timerSub}>⏰ Claim abre em</span>
      <span className={styles.timerValue}>{timeLeft ?? '...'}</span>
      {formatted && <span className={styles.timerDate}>{formatted}</span>}
    </div>
  );
}

/* ── Member Row (modo normal) ──
   isGom = true → sem blur, pode ver tudo antes do claim abrir.
   Collector normal → blur em waiting/streaming.
*/
function MemberRow({ pc, phase, claimed, claiming, userId, isGom, onClaim, onOpenRank }) {
  const canClaim = (phase === 'open') && !claimed;
  // GON nunca recebe blur — vê os membros sempre
  const blurred  = !isGom && (phase === 'waiting' || phase === 'streaming');
  const isClosed = phase === 'closed';
  const claims     = pc.claims || [];
  const claimCount = claims.length;
  const myPos      = claims.findIndex((c) => c.userId === userId);

  return (
    <div
      className={`${styles.memberRow} ${isClosed ? styles.memberRowClosed : ''}`}
      onClick={!blurred ? onOpenRank : undefined}
      title={!blurred ? 'Clique para ver o ranking' : undefined}
    >
      {blurred && (
        <div className={styles.blurOverlay}>
          <span className={styles.blurMsg}>
            {phase === 'streaming' ? '⏳ Preparando...' : '🔒 Aguardando abertura'}
          </span>
        </div>
      )}

      <div className={styles.memberInfo}>
        {blurred ? (
          <>
            <span className={styles.memberNameHidden} aria-hidden="true" />
            <span className={styles.memberVersionHidden} aria-hidden="true" />
          </>
        ) : (
          <>
            <span className={styles.memberName}>{pc.artistName || 'Membro'}</span>
            {pc.version && <span className={styles.memberVersion}>{pc.version}</span>}
            <div className={styles.memberTags}>
              {claimCount > 0 && (
                <span className={styles.claimCountTag}>{claimCount} claim{claimCount !== 1 ? 's' : ''}</span>
              )}
              {claimed && myPos >= 0 && (
                <span className={styles.myPosTag}>Você #{myPos + 1}</span>
              )}
            </div>
          </>
        )}
      </div>

      <button
        className={`${styles.claimCircle} ${claimed ? styles.claimCircleDone : ''} ${canClaim ? styles.claimCircleActive : ''} ${isClosed ? styles.claimCircleClosed : ''}`}
        onClick={onClaim}
        disabled={!canClaim || claiming}
        title={isClosed ? 'Claim encerrado' : claimed ? `Posição #${myPos + 1}` : canClaim ? 'Dar claim!' : 'Aguardando...'}
      >
        {claiming
          ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          : isClosed ? '🔒' : claimed ? '✓' : '♡'
        }
      </button>
    </div>
  );
}

/* ── Member Row Edit ── */
function MemberRowEdit({
  pc, index, isEditing, editingPc, savingPc, dragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onCancelEdit, onSave, onDelete, onChange,
}) {
  return (
    <div
      className={`${styles.memberRow} ${styles.memberRowEdit} ${dragOver ? styles.memberRowDragOver : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className={styles.dragHandle} title="Arrastar para reordenar">⠿</span>

      <div className={styles.memberInfo}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              className="input"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              placeholder="Nome do artista"
              value={editingPc.artistName}
              onChange={(e) => onChange('artistName', e.target.value)}
              autoFocus
            />
            <input
              className="input"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              placeholder="Versão (opcional)"
              value={editingPc.version}
              onChange={(e) => onChange('version', e.target.value)}
            />
          </div>
        ) : (
          <>
            <span className={styles.memberName}>{pc.artistName || 'Membro'}</span>
            {pc.version && <span className={styles.memberVersion}>{pc.version}</span>}
            {pc.order != null && (
              <span style={{ fontSize: '0.65rem', color: 'var(--gray)', marginTop: 2 }}>ordem #{pc.order}</span>
            )}
          </>
        )}
      </div>

      <div className={styles.rowEditActions}>
        {isEditing ? (
          <>
            <button className="btn btn-ghost btn-sm" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={onCancelEdit} disabled={savingPc}>✕</button>
            <button className="btn btn-primary btn-sm" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={onSave} disabled={savingPc}>
              {savingPc ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✓'}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={onEdit} title="Editar">✏️</button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#c0392b' }} onClick={onDelete} title="Excluir">🗑️</button>
          </>
        )}
      </div>
    </div>
  );
}