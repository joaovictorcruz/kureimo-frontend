import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { setsApi, claimsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { useSignalR } from '../hooks/useSignalR';
import ClaimRankModal from '../components/ClaimRankModal';
import AddPhotocardModal from '../components/AddPhotocardModal';
import ConfirmModal from '../components/ConfirmModal';
import styles from './SetPage.module.css';

const FONT_MAP = {
  'Nunito':           "'Nunito', sans-serif",
  'DM Serif Display': "'DM Serif Display', serif",
  'Playfair Display': "'Playfair Display', serif",
  'Lora':             "'Lora', serif",
  'Montserrat':       "'Montserrat', sans-serif",
  'Pacifico':         "'Pacifico', cursive",
  'Dancing Script':   "'Dancing Script', cursive",
  'Courier New':      "'Courier New', monospace",
};

export default function SetPage() {
  const { token } = useParams();
  const { user, isGom } = useAuth();
  const toast = useToast();

  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimedIds, setClaimedIds] = useState(new Set());
  const [claimingId, setClaimingId] = useState(null);
  const [rankModal, setRankModal] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);

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
      setSet(data);
      if (user && data.photocards) {
        const ids = new Set(
          data.photocards
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

  const theme = set.theme || {};
  const bgColor   = set.backgroundColor || null;
  const fontColor = set.fontColor || null;
  const fontCss   = set.fontStyle
    ? FONT_MAP[set.fontStyle] || `'${set.fontStyle}', sans-serif`
    : null;
  const statusMeta = {
    Draft:     { label: 'Rascunho',   cls: 'badge-gray' },
    Published: { label: 'Publicado',  cls: 'badge-lilac' },
    Open:      { label: '🔴 AO VIVO', cls: 'badge-live'  },
    Closed:    { label: 'Encerrado',  cls: 'badge-gray'  },
  };
  const sm = statusMeta[set.status] || { label: set.status, cls: 'badge-gray' };

  return (
    <main className={styles.page}>
      {theme.bg && <div className={styles.themeBg} style={{ background: theme.bg }} />}

      <div className={`page-container ${styles.inner}`}>
        <div className={styles.layout}>

          {/* ══════════ LEFT COLUMN ══════════ */}
          <div className={styles.leftCol}>

            {/* Timer */}
            <TimerBanner
              phase={phase}
              timeLeft={timeLeft}
              claimOpensAt={set.claimOpensAt}
              apiStatus={set.status}
            />

            {/* Set "post" card */}
            <div className={styles.setCard} style={bgColor ? { background: bgColor } : {}}>

              {/* Image */}
              <div className={styles.setImgWrap}>
                {set.imageUrl ? (
                  <img src={set.imageUrl} alt={set.title} className={styles.setImg} />
                ) : (
                  <div className={styles.setImgPlaceholder}>
                    <span style={{ fontSize: '3rem' }}>🃏</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 8 }}>
                      Nenhuma imagem definida
                    </span>
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
              </div>

              {/* GOM info */}
              <div className={styles.setMeta}>
                <div className={styles.gomRow}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                    {(set.gomUsername || set.ownerUsername || 'G')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.gomName}>{set.gomUsername || set.ownerUsername || 'GOM'}</div>
                    <div className={styles.gomSub}>Group Order Manager</div>
                  </div>
                </div>

                <h2
                  className={styles.setTitle}
                  style={{
                    ...(fontCss ? { fontFamily: fontCss } : {}),
                    ...(fontColor ? { color: fontColor } : {}),
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

            {/* GOM control bar */}
            {isGom && (
              <div className={`card ${styles.gomBar}`}>
                <span style={{ fontWeight: 800, color: 'var(--ink-soft)', fontSize: '0.82rem' }}>👑 Painel GOM</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(set.status === 'Draft' || set.status === 'Published') && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCard(true)}>
                      + Membro
                    </button>
                  )}
                  {set.status === 'Draft' && !!(set.photocards || []).length && (
                    <button className="btn btn-primary btn-sm" onClick={handlePublish}>
                      📢 Publicar
                    </button>
                  )}
                  {set.status === 'Published' || set.status === 'Draft' && (
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
            <div className={styles.memberListHeader}>
              <span className={styles.memberListTitle}>Membros</span>
              <span className={styles.memberListCount}>
                {(set.photocards || []).length} disponível{(set.photocards || []).length !== 1 ? 'is' : ''}
              </span>
            </div>

            {/* Dica para GOM em Draft */}
            {isGom && set.status === 'Draft' && (
              <div className={styles.gomHint}>
                {!(set.photocards || []).length ? (
                  <>
                    <span>⚠️</span>
                    <span>Adicione um ou mais membros para poder publicar o seu set para os collectors.</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Após adicionar todos os membros, publique o set para que os collectors possam dar claim!</span>
                  </>
                )}
              </div>
            )}

            <div className={styles.memberList}>
              {(set.photocards || []).length === 0 ? (
                <div className={styles.emptyMembers}>
                  <span style={{ fontSize: '2rem' }}>🌸</span>
                  <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginTop: 8 }}>
                    Nenhum membro adicionado.
                  </p>
                  {isGom && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddCard(true)}>
                      + Adicionar
                    </button>
                  )}
                </div>
              ) : (
                (set.photocards || []).map((pc) => (
                  <MemberRow
                    key={pc.id}
                    pc={pc}
                    phase={phase}
                    claimed={claimedIds.has(pc.id)}
                    claiming={claimingId === pc.id}
                    userId={user?.id}
                    onClaim={(e) => handleClaim(e, pc.id)}
                    onOpenRank={() => setRankModal(pc)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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
      <span>🔒</span>
      <span>Claim encerrado</span>
      {formatted && <span className={styles.timerDate}>· {formatted}</span>}
    </div>
  );

  if (phase === 'open') return (
    <div className={`${styles.timerBanner} ${styles.timerLive}`}>
      <span className={styles.livePulse} />
      <span className={styles.timerValue}>
        {/* Se foi o GOM que forçou Open sem ter chegado na hora, mostra diferente */}
        {apiStatus === 'Open' && timeLeft && !timeLeft.startsWith('+')
          ? `${timeLeft} adiantado`
          : timeLeft
            ? `+${timeLeft.replace(/^\+/, '')}`
            : 'Aberto!'
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

  // waiting
  return (
    <div className={styles.timerBanner}>
      <span className={styles.timerSub}>⏰ Claim abre em</span>
      <span className={styles.timerValue}>{timeLeft ?? '...'}</span>
      {formatted && <span className={styles.timerDate}>{formatted}</span>}
    </div>
  );
}

/* ── Member Row ── */
function MemberRow({ pc, phase, claimed, claiming, userId, onClaim, onOpenRank }) {
  const canClaim = (phase === 'open') && !claimed;
  const blurred  = phase === 'waiting' || phase === 'streaming';
  const isClosed = phase === 'closed';
  const claims   = pc.claims || [];
  const claimCount = claims.length;
  const myPos = claims.findIndex((c) => c.userId === userId);

  return (
    <div
      className={`${styles.memberRow} ${isClosed ? styles.memberRowClosed : ''}`}
      onClick={!blurred ? onOpenRank : undefined}
      title={!blurred ? 'Clique para ver o ranking' : undefined}
    >
      {/* Blur overlay quando waiting/streaming */}
      {blurred && (
        <div className={styles.blurOverlay}>
          <span className={styles.blurMsg}>
            {phase === 'streaming' ? '⏳ Preparando...' : '🔒 Aguardando abertura'}
          </span>
        </div>
      )}

      <div className={styles.memberInfo}>
        {/* Quando blurred: renderiza placeholders anônimos, não os dados reais */}
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
                <span className={styles.claimCountTag}>
                  {claimCount} claim{claimCount !== 1 ? 's' : ''}
                </span>
              )}
              {claimed && myPos >= 0 && (
                <span className={styles.myPosTag}>Você #{myPos + 1}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Claim circle button */}
      <button
        className={`
          ${styles.claimCircle}
          ${claimed    ? styles.claimCircleDone   : ''}
          ${canClaim   ? styles.claimCircleActive  : ''}
          ${isClosed   ? styles.claimCircleClosed  : ''}
        `}
        onClick={onClaim}
        disabled={!canClaim || claiming}
        title={
          isClosed  ? 'Claim encerrado' :
          claimed   ? `Posição #${myPos + 1}` :
          canClaim  ? 'Dar claim!' :
          'Aguardando...'
        }
      >
        {claiming ? (
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
        ) : isClosed ? (
          '🔒'
        ) : claimed ? (
          '✓'
        ) : (
          '♡'
        )}
      </button>
    </div>
  );
}