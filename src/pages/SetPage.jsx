import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { setsApi, claimsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { useNavigate } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';
import AddPhotocardModal from '../components/AddPhotocardModal';
import ClaimRankModal from '../components/ClaimRankModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageCropModal from '../components/ImageCropModal';
import EditSetModal from '../components/EditSetModal';
import styles from './SetPage.module.css';
import {
  Lock, Radio, Clock, Zap, Image as ImageIcon, Megaphone, XCircle,
  Link as LinkIcon, Plus, Pencil, Check, GripVertical, AlertTriangle,
  CheckCircle2, Loader2, Heart, HeartCrack, Timer, Info, Crown, X,
} from 'lucide-react';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const UNCLAIM_WINDOW_MS = 6 * 60 * 1000; // 5 minutos

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

function sessionKey(token) { return `claimed_${token}`; }

function getSessionClaimed(token) {
  try { return new Set(JSON.parse(sessionStorage.getItem(sessionKey(token)) || '[]')); }
  catch { return new Set(); }
}

function addSessionClaimed(token, photocardId) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(sessionKey(token)) || '[]');
    if (!stored.includes(photocardId)) {
      sessionStorage.setItem(sessionKey(token), JSON.stringify([...stored, photocardId]));
    }
  } catch { /* sessionStorage indisponivel */ }
}

function removeSessionClaimed(token, photocardId) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(sessionKey(token)) || '[]');
    sessionStorage.setItem(sessionKey(token), JSON.stringify(stored.filter((id) => id !== photocardId)));
  } catch { /* sessionStorage indisponivel */ }
}

// Retorna uma cor de borda que contrasta com o backgroundColor do set (ou um contraste
// neutro quando o set não define um background customizado), para sinalizar elementos clicáveis.
function getContrastBorderColor(hex) {
  const fallback = 'rgba(59, 32, 40, 0.8)'; // contraste padrão sobre o --card-bg (claro)
  if (!hex) return fallback;
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (full.length !== 6) return fallback;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return fallback;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? 'rgba(59, 32, 40, 0.8)' : 'rgba(255, 255, 255, 0.92)';
}

export default function SetPage() {
  const { token } = useParams();
  const { user, isGom, login } = useAuth();
  const toast = useToast();

  const [set, setSet]                 = useState(null);
  const [loading, setLoading]         = useState(true);
  const [claimedIds, setClaimedIds]   = useState(new Set());
  const [claimingId, setClaimingId]   = useState(null);
  const [shakeId, setShakeId]         = useState(null);
  const [rankModal, setRankModal]     = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [closeModal, setCloseModal]   = useState(false);
  const [editSetModal, setEditSetModal] = useState(false);

  const [editMode, setEditMode]   = useState(false);
  const [editingPc, setEditingPc] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingPc, setSavingPc]   = useState(false);
  const [reordering, setReordering] = useState(false);
  const [claimTimes, setClaimTimes] = useState({});

  const dragIndexRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const imgInputRef                     = useRef(null);
  const [cropSrc, setCropSrc]           = useState(null);
  const [cropIsExisting, setCropIsExisting] = useState(false); // true = recortando a imagem que já está publicada
  const [uploadingImg, setUploadingImg] = useState(false);

  const { timeLeft, phase, openedAt, closedAt } = useCountdown(set?.claimOpensAt, set?.status);
  const isStreamingPhase = phase === 'streaming' || phase === 'open';
  const { connected, claimEvent, claimUpdates, claimRemoval, connectionRef, connection } = useSignalR(token, isStreamingPhase);

  const navigate = useNavigate();

  // ClaimRegistered — adiciona claim único sem duplicar
  useEffect(() => {
    if (!claimEvent || !set) return;
    setSet((prev) => {
      if (!prev) return prev;
      const updated = (prev.photocards || []).map((pc) => {
        if (pc.id !== claimEvent.photocardId) return pc;
        const existing = pc.claims || [];
        if (existing.find((c) => c.id === claimEvent.id)) return pc;
        const merged = [...existing, claimEvent].sort(
          (a, b) => new Date(a.claimedAt) - new Date(b.claimedAt)
        );
        return { ...pc, claims: merged };
      });
      return { ...prev, photocards: updated };
    });
  }, [claimEvent]);

  // ClaimUpdated — substitui lista completa com posições corretas
  useEffect(() => {
    if (!claimUpdates || !set) return;
    setSet((prev) => {
      if (!prev) return prev;
      const updated = (prev.photocards || []).map((pc) => {
        const fullList = claimUpdates.filter((c) => c.photocardId === pc.id);
        if (!fullList.length) return pc;
        const sorted = [...fullList].sort((a, b) => {
          if (a.queuePosition != null && b.queuePosition != null)
            return a.queuePosition - b.queuePosition;
          return new Date(a.claimedAt) - new Date(b.claimedAt);
        });
        return { ...pc, claims: sorted };
      });
      return { ...prev, photocards: updated };
    });
  }, [claimUpdates]);

  // ClaimRemoved — remove claim da lista local em tempo real
  useEffect(() => {
    if (!claimRemoval || !set) return;
    setSet((prev) => {
      if (!prev) return prev;
      const updated = (prev.photocards || []).map((pc) => {
        if (pc.id !== claimRemoval.photocardId) return pc;
        return {
          ...pc,
          claims: (pc.claims || []).filter((c) => c.userId !== claimRemoval.userId),
        };
      });
      return { ...prev, photocards: updated };
    });
  }, [claimRemoval]);
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
        const fromApi = new Set(
          enriched
            .filter((pc) =>
              (pc.claims || []).some((c) =>
                (user.id && c.userId === user.id) ||
                (!user.id && c.username && c.username === user.username)
              )
            )
            .map((pc) => pc.id)
        );
        const fromSession = getSessionClaimed(token);
        setClaimedIds(new Set([...fromApi, ...fromSession]));

        const times = {};
        enriched.forEach((pc) => {
          const myClaim = (pc.claims || []).find((c) =>
            (user.id && c.userId === user.id) ||
            (!user.id && c.username && c.username === user.username)
          );
          if (myClaim?.claimedAt) {
            times[pc.id] = new Date(myClaim.claimedAt).getTime();
          }
        });
        setClaimTimes(times);
      }
    } catch {
      toast.error('Set não encontrado ou sem acesso');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { fetchSet(); }, [fetchSet]);

  // ── Claim ──
  const handleClaim = async (e, photocardId) => {
    e.stopPropagation();
    if (!user) { login(`/set/${token}`); return; }
    if (phase !== 'open' && phase !== 'streaming') {
      toast.info('O claim ainda não está aberto!'); return;
    }
    if (claimedIds.has(photocardId)) return; // já claimado — evita duplo-clique durante a janela otimista

    // ── Feedback instantâneo: botão e animação reagem na hora, sem esperar a API.
    //     Não mexe em pc.claims aqui — isso fica só pro dado real do servidor,
    //     senão duplica com o que já chega em tempo real. ──
    setClaimedIds((p) => new Set([...p, photocardId]));
    addSessionClaimed(token, photocardId);
    setClaimTimes((p) => ({ ...p, [photocardId]: Date.now() }));
    spawnHearts(e.clientX, e.clientY);

    try {
      const claim = await claimsApi.claim(photocardId);
      setSet((prev) => {
        if (!prev) return prev;
        const pcs = (prev.photocards || []).map((pc) => {
          if (pc.id !== photocardId) return pc;
          const existing = pc.claims || [];
          const merged = existing.find((c) => c.id === claim.id)
            ? existing
            : [...existing, claim];
          return { ...pc, claims: merged.sort((a, b) => new Date(a.claimedAt) - new Date(b.claimedAt)) };
        });
        return { ...prev, photocards: pcs };
      });
      setClaimTimes((p) => ({ ...p, [photocardId]: new Date(claim.claimedAt).getTime() }));
    } catch (err) {
      // ── Rollback: desfaz só o feedback otimista (botão/animação) e explica o motivo real do erro ──
      setClaimedIds((p) => { const n = new Set(p); n.delete(photocardId); return n; });
      setClaimTimes((p) => { const n = { ...p }; delete n[photocardId]; return n; });
      removeSessionClaimed(token, photocardId);

      setShakeId(photocardId);
      setTimeout(() => setShakeId(null), 450);

      if (err?.status === 409) toast.error('Você já deu claim nesse photocard!');
      else if (err?.status === 422) toast.error('Claim fechado ou inválido.');
      else toast.error('Não deu pra confirmar seu claim — tenta de novo!');
    }
  };

  const handleUnclaim = async (e, photocardId) => {
    e.stopPropagation();
    setClaimingId(photocardId);
    try {
      await claimsApi.unclaim(photocardId);
      setClaimedIds((p) => { const n = new Set(p); n.delete(photocardId); return n; });
      setClaimTimes((p) => { const n = { ...p }; delete n[photocardId]; return n; });
      removeSessionClaimed(token, photocardId);
      setSet((prev) => {
        if (!prev) return prev;
        const pcs = (prev.photocards || []).map((pc) => {
          if (pc.id !== photocardId) return pc;
          return {
            ...pc,
            claims: (pc.claims || []).filter((c) =>
              !(user?.id && c.userId === user.id) &&
              !(!user?.id && c.username === user?.username)
            ),
          };
        });
        return { ...prev, photocards: pcs };
      });
      toast.success('Claim removido!');
    } catch (err) {
      if (err?.status === 403) toast.error('Janela de 5 minutos expirou. Entre em contato com o GOM.');
      else if (err?.status === 404) toast.error('Claim não encontrado.');
      else toast.error('Erro ao remover claim. Tenta de novo!');
    } finally {
      setClaimingId(null);
    }
  };

  const handleOpenRank = async (pc) => {
    try {
      const claims = await claimsApi.getByPhotocard(pc.id);
      setRankModal({ ...pc, claims: claims || [] });
    } catch {
      // fallback: abre com dados que já tem
      setRankModal(pc);
    }
  };

  const spawnHearts = (x, y) => {
    ['💜', '🌸', '✨', '💗'].forEach((emoji, i) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'float-heart';
        el.textContent = emoji;
        el.style.left = `${x - 12 + Math.random() * 24}px`;
        el.style.top  = `${y - 12}px`;
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
      toast.success('Set publicado!');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao publicar.');
    }
  };

  const handleClose = async () => {
    setCloseModal(false);
    try {
      await setsApi.close(token);
      toast.success('Claim encerrado!');
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
      toast.success('Membro atualizado!');
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
    if (cropSrc && !cropIsExisting) URL.revokeObjectURL(cropSrc);
    setCropIsExisting(false);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleRecropExisting = () => {
    setCropIsExisting(true);
    setCropSrc(set.imageUrl);
  };

  const handleCropConfirm = async (blob) => {
    if (!cropIsExisting) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropIsExisting(false);
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'set-image.jpg');
      await setsApi.updateImage(token, formData);
      toast.success('Imagem atualizada!');
      fetchSet();
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar imagem.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCropCancel = () => {
    if (!cropIsExisting) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropIsExisting(false);
  };

  // ── Renders ──
  if (loading) return (
    <main className={styles.loadingWrap}>
      <Loader2 size={40} strokeWidth={1.5} style={{ color: 'var(--rose)', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--gray)', marginTop: 16 }}>Carregando o set...</p>
    </main>
  );

  if (!set) return (
    <main className={styles.loadingWrap}>
      <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <XCircle size={48} strokeWidth={1.5} style={{ color: 'var(--gray)' }} />
        </div>
        <h2>Set não encontrado</h2>
        <p style={{ color: 'var(--gray)', marginTop: 8 }}>Verifique o link com seu GOM.</p>
      </div>
    </main>
  );

  const theme    = set.theme || {};
  const bgColor  = set.backgroundColor || null;
  const fontColor = set.fontColor || null;
  const fontCss  = set.fontStyle ? FONT_MAP[set.fontStyle] || `'${set.fontStyle}', sans-serif` : null;

  const gon        = set.gon || {};
  const gonName    = gon.username    || set.gomUsername || set.ownerUsername || 'GOM';
  const gonPicUrl  = gon.profilePicUrl || null;
  const gonInitial = gonName[0].toUpperCase();

  const statusMeta = {
    Draft:     { label: 'Rascunho',  cls: 'badge-gray'  },
    Published: { label: 'Publicado', cls: 'badge-lilac' },
    Open:      { label: 'AO VIVO',   cls: 'badge-live'  },
    Closed:    { label: 'Encerrado', cls: 'badge-gray'  },
  };
  const sm = statusMeta[set.status] || { label: set.status, cls: 'badge-gray' };

  const isOwnerGom = isGom && (
    (user?.id && gon.id && user.id === gon.id) ||
    (!user?.id && user?.username && gon.username && user.username === gon.username)
  );

  const canAddMember  = isOwnerGom && set.status === 'Draft';
  const canEditMember = isOwnerGom && (set.status === 'Draft' || set.status === 'Published') && !!(set.photocards || []).length;

  const gomClickable   = !isOwnerGom && !!gon.id;
  const gomBorderColor = getContrastBorderColor(bgColor);

  return (
    <main className={styles.page}>
      {theme.bg && <div className={styles.themeBg} style={{ background: theme.bg }} />}

      <div className={`page-container ${styles.inner}`}>
        <div className={styles.layout}>

          {/* LEFT COLUMN */}
          <div className={styles.leftCol}>
            <TimerBanner
              phase={phase}
              timeLeft={timeLeft}
              claimOpensAt={set.claimOpensAt}
              openedAt={openedAt}
              closedAt={closedAt}
              apiStatus={set.status}
            />

            {/* Set card */}
            <div className={styles.setCard} style={bgColor ? { background: bgColor } : {}}>
              <div className={styles.setImgWrap}>
                {set.imageUrl ? (
                  <img src={set.imageUrl} alt={set.title} className={styles.setImg} />
                ) : (
                  <div className={styles.setImgPlaceholder}>
                    <ImageIcon size={40} strokeWidth={1.5} style={{ color: 'var(--gray)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 8 }}>Nenhuma imagem definida</span>
                  </div>
                )}

                <span className={`badge ${sm.cls}`} style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {set.status === 'Open' && <Radio size={10} strokeWidth={2.5} />}
                  {sm.label}
                </span>

                {connected && isStreamingPhase && (
                  <span className="badge badge-live" style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className={styles.liveDot} /> Tempo real
                  </span>
                )}

                {isOwnerGom && set.status === 'Draft' && (
                  <>
                    <div className={styles.changeImgActions}>
                      {set.imageUrl && (
                        <button
                          className={styles.changeImgBtn}
                          onClick={handleRecropExisting}
                          disabled={uploadingImg}
                          title="Recortar a imagem atual"
                        >
                          <ImageIcon size={12} strokeWidth={2} />
                          Recortar
                        </button>
                      )}
                      <button
                        className={styles.changeImgBtn}
                        onClick={() => imgInputRef.current?.click()}
                        disabled={uploadingImg}
                        title="Enviar uma nova imagem"
                      >
                        {uploadingImg
                          ? <Loader2 size={12} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                          : <ImageIcon size={12} strokeWidth={2} />
                        }
                        {set.imageUrl ? 'Nova imagem' : 'Alterar imagem'}
                      </button>
                    </div>
                    <input ref={imgInputRef} type="file" accept={ALLOWED_IMAGE_EXTS} onChange={handleImgFileChange} style={{ display: 'none' }} />
                  </>
                )}
              </div>

              <div className={styles.setMeta}>
                <div
                className={styles.gomRow}
                onClick={() => !isOwnerGom && gon.id && navigate(`/gom/${gon.id}`)}
                style={{ cursor: !isOwnerGom && gon.id ? 'pointer' : 'default' }}
                title={!isOwnerGom && gon.id ? `Ver perfil de ${gonName}` : undefined}
              >
                {gonPicUrl ? (
                  <img
                    src={gonPicUrl}
                    alt={gonName}
                    className={gomClickable ? styles.gomAvatarClickable : ''}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                      ...(gomClickable ? { '--gom-ring-color': gomBorderColor } : {}),
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className={`avatar ${gomClickable ? styles.gomAvatarClickable : ''}`}
                    style={{
                      width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0,
                      ...(gomClickable ? { '--gom-ring-color': gomBorderColor } : {}),
                    }}
                  >
                    {gonInitial}
                  </div>
                )}
                <div>
                  <div className={styles.gomName} style={fontColor ? { color: fontColor } : {}}>{gonName}</div>
                  <div className={styles.gomSub} style={fontColor ? { color: fontColor, opacity: 0.75 } : {}}>Group Order Manager</div>
                </div>
              </div>

                <h2 className={styles.setTitle} style={{ ...(fontCss ? { fontFamily: fontCss } : {}), ...(fontColor ? { color: fontColor } : {}) }}>
                  {set.title || 'Set de Photocards'}
                </h2>

                {set.description && (
                  <p className={styles.descText} style={{ ...(fontColor ? { color: fontColor, opacity: 0.85 } : {}), whiteSpace: 'pre-line', margin: 0 }}>
                    {set.description}
                  </p>
                )}
              </div>
            </div>

            {/* GOM control bar */}
            {isOwnerGom && (
              <div className={`card ${styles.gomBar}`}>
                <span style={{ fontWeight: 800, color: 'var(--ink-soft)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Crown size={14} strokeWidth={2} style={{ color: 'var(--rose-dark)' }} />
                  Painel GOM
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {set.status === 'Draft' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditSetModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Pencil size={13} strokeWidth={2} /> Editar set
                    </button>
                  )}
                  {set.status === 'Draft' && !!(set.photocards || []).length && (
                    <button className="btn btn-primary btn-sm" onClick={handlePublish} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Megaphone size={13} strokeWidth={2} /> Publicar
                    </button>
                  )}
                  {(set.status === 'Draft' || set.status === 'Published') && (
                    <button className="btn btn-danger btn-sm" onClick={() => setCancelModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <XCircle size={13} strokeWidth={2} /> Cancelar set
                    </button>
                  )}
                  {set.status === 'Open' && (
                    <button className="btn btn-danger btn-sm" onClick={() => setCloseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Lock size={13} strokeWidth={2} /> Fechar claim
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copiado!');
                  }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <LinkIcon size={13} strokeWidth={2} /> Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.rightCol}>
           {(phase === 'open' || set.status === 'Published') && !isOwnerGom && (
              <div className={styles.unclaimHint}>
                <Info size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Caso tenha dado claim por engano ou acidentalmente, você tem até <strong>5 minutos</strong> após ter dado claim para desfazer essa ação.
                  Após esse período, entre em contato com o GOM do set.
                </span>
              </div>
            )}

            <div className={styles.memberListHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.memberListTitle}>Membros</span>
                <span className={styles.memberListCount}>
                  {(set.photocards || []).length} disponível{(set.photocards || []).length !== 1 ? 'is' : ''}
                </span>
              </div>

              {canEditMember && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {canAddMember && (
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowAddCard(true)}>
                      <Plus size={13} strokeWidth={2.5} /> Membro
                    </button>
                  )}
                  <button
                    className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => { setEditMode((m) => !m); setEditingPc(null); }}
                  >
                    {editMode
                      ? <><Check size={13} strokeWidth={2.5} /> Concluir</>
                      : <><Pencil size={13} strokeWidth={2} /> Editar membros</>
                    }
                  </button>
                </div>
              )}
            </div>

            {editMode && (
              <div className={styles.gomHint} style={{ marginBottom: 10 }}>
                <GripVertical size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Arraste para reordenar · clique em Editar para alterar nome/versão · Excluir para remover</span>
              </div>
            )}

            {isGom && set.status === 'Draft' && !editMode && (
              <div className={styles.gomHint}>
                {!(set.photocards || []).length ? (
                  <>
                    <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Adicione um ou mais membros para poder publicar o seu set para os collectors.</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Após adicionar todos os membros, publique o set para que os collectors possam dar claim!</span>
                  </>
                )}
              </div>
            )}

            {reordering && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.75rem', color: 'var(--gray)' }}>
                <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Salvando nova ordem...</span>
              </div>
            )}

            <div className={styles.memberList}>
              {(set.photocards || []).length === 0 ? (
                <div className={styles.emptyMembers}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <Heart size={32} strokeWidth={1.5} style={{ color: 'var(--rose)' }} />
                  </div>
                  <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginTop: 8 }}>Nenhum membro adicionado.</p>
                  {canAddMember && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => setShowAddCard(true)}>
                      <Plus size={13} strokeWidth={2.5} /> Adicionar
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
                      shake={shakeId === pc.id}
                      userId={user?.id}
                      userUsername={user?.username}
                      isGom={isGom}
                      isOwnerGom={isOwnerGom}
                      claimedAt={claimTimes[pc.id] ?? null}
                      onClaim={(e) => handleClaim(e, pc.id)}
                      onUnclaim={(e) => handleUnclaim(e, pc.id)}
                      onOpenRank={() => handleOpenRank(pc)}
                    />
                  )
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {cancelModal && (
        <ConfirmModal
          title="Cancelar set"
          message={`Tem certeza que deseja cancelar o set "${set.title}"?`}
          confirmLabel="Sim, cancelar set"
          confirmClass="btn-danger"
          onConfirm={handleCancel}
          onCancel={() => setCancelModal(false)}
        />
      )}

      {closeModal && (
        <ConfirmModal
          title="Fechar claim"
          message={`Tem certeza que deseja encerrar o claim do set "${set.title}"? Ninguém mais vai poder reivindicar membros depois disso.`}
          confirmLabel="Sim, fechar claim"
          confirmClass="btn-danger"
          onConfirm={handleClose}
          onCancel={() => setCloseModal(false)}
        />
      )}

      {deletingId && (
        <ConfirmModal
          title="Remover membro"
          message="Tem certeza que deseja remover este membro? Todos os claims associados serão perdidos."
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
          connection={connection}
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
            toast.success('Membro adicionado!');
          }}
        />
      )}

      {editSetModal && (
        <EditSetModal
          set={set}
          onClose={() => setEditSetModal(false)}
          onSaved={() => {
            setEditSetModal(false);
            toast.success('Set atualizado! ✨');
            fetchSet();
          }}
        />
      )}

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          shape="rect"
          aspect={16 / 9}
          crossOrigin={cropIsExisting ? 'anonymous' : undefined}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </main>
  );
}

/* ── Timer Banner ── */
function TimerBanner({ phase, timeLeft, claimOpensAt, openedAt, closedAt, apiStatus }) {
  const date = claimOpensAt ? new Date(claimOpensAt) : null;
  const formatted = date
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  const closedAtFormatted = closedAt
    ? closedAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  const openedAtFormatted = openedAt  // ← estava faltando isso
    ? openedAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  if (phase === 'closed') return (
    <div className={`${styles.timerBanner} ${styles.timerClosed}`}>
      <Lock size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>Claim encerrado</span>
      {closedAtFormatted && <span className={styles.timerDate}>· {closedAtFormatted}</span>}
    </div>
  );

  if (phase === 'open') return (
    <div className={`${styles.timerBanner} ${styles.timerLive}`}>
      <span className={styles.livePulse} />
      <span className={styles.timerLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Zap size={13} strokeWidth={2.5} />
        Claim aberto{openedAtFormatted ? ` às ${openedAtFormatted}` : '!'}
      </span>
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
      <Clock size={14} strokeWidth={2} style={{ color: 'var(--gray)', flexShrink: 0 }} />
      <span className={styles.timerSub}>Claim abre em</span>
      <span className={styles.timerValue}>{timeLeft ?? '...'}</span>
      {formatted && <span className={styles.timerDate}>{formatted}</span>}
    </div>
  );
}

/* ── Member Row (modo normal) ── */
function MemberRow({ pc, phase, claimed, claiming, shake, userId, userUsername, isGom, isOwnerGom, claimedAt, onClaim, onUnclaim, onOpenRank }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!claimed || !claimedAt) return;
    const remaining = UNCLAIM_WINDOW_MS - (Date.now() - claimedAt);
    if (remaining <= 0) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [claimed, claimedAt]);

  const canClaim   = (phase === 'open') && !claimed && !isOwnerGom;
  const canUnclaim = claimed && claimedAt != null && (Date.now() - claimedAt) < UNCLAIM_WINDOW_MS && phase === 'open';
  const blurred    = !isOwnerGom && (phase === 'waiting' || phase === 'streaming');
  const isClosed   = phase === 'closed';
  const claims     = pc.claims || [];
  const claimCount = claims.length;
  const myPos      = claims.findIndex((c) =>
    (userId && c.userId === userId) ||
    (!userId && userUsername && c.username === userUsername)
  );
  const isGomBlocked = isOwnerGom;

  return (
    <div
      className={`${styles.memberRow} ${isClosed ? styles.memberRowClosed : ''}`}
      onClick={!blurred ? onOpenRank : undefined}
      title={!blurred ? 'Clique para ver o ranking' : undefined}
    >
      {blurred && (
        <div className={styles.blurOverlay}>
          <span className={styles.blurMsg} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {phase === 'streaming'
              ? <><Clock size={13} strokeWidth={2} /> Preparando...</>
              : <><Lock size={13} strokeWidth={2} /> Aguardando abertura</>
            }
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
        className={`
          ${styles.claimCircle}
          ${claimed && !canUnclaim ? styles.claimCircleDone    : ''}
          ${canUnclaim             ? styles.claimCircleUnclaim : ''}
          ${canClaim               ? styles.claimCircleActive  : ''}
          ${isClosed               ? styles.claimCircleClosed  : ''}
          ${isGomBlocked           ? styles.claimCircleClosed  : ''}
          ${shake                  ? styles.claimShake         : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (canUnclaim) { onUnclaim(e); return; }
          if (canClaim)   { onClaim(e);   return; }
        }}
        disabled={(!canClaim && !canUnclaim) || claiming}
        title={
          isGomBlocked ? 'GOMs não podem dar claim no próprio set' :
          isClosed     ? 'Claim encerrado' :
          canUnclaim   ? 'Clique para remover seu claim (janela de 5 min)' :
          claimed      ? `Posição #${myPos + 1} — janela de unclaim expirada` :
          canClaim     ? 'Dar claim!' :
          'Aguardando...'
        }
      >
        {claiming ? (
          <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
        ) : isGomBlocked ? (
          <X size={14} strokeWidth={2.5} style={{ color: 'var(--gray)' }} />
        ) : isClosed ? (
          <Lock size={14} strokeWidth={2} />
        ) : canUnclaim ? (
          <HeartCrack size={15} strokeWidth={2} />
        ) : claimed ? (
          <Check size={15} strokeWidth={2.5} />
        ) : (
          <Heart size={15} strokeWidth={2} />
        )}
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
      <span className={styles.dragHandle} title="Arrastar para reordenar">
        <GripVertical size={16} strokeWidth={2} />
      </span>

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
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={onCancelEdit}
              disabled={savingPc}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={onSave}
              disabled={savingPc}
            >
              {savingPc
                ? <Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                : <><Check size={13} strokeWidth={2.5} /> Salvar</>
              }
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={onEdit}
            >
              Editar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#c0392b' }}
              onClick={onDelete}
            >
              Excluir
            </button>
          </>
        )}
      </div>
    </div>
  );
}