import { useState, useEffect } from 'react';
import styles from './ClaimRankModal.module.css';
import { X, Smartphone, Trophy, InboxIcon, Radio } from 'lucide-react';

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C2F'];

export default function ClaimRankModal({ photocard, userId, connection, onClose }) {
  const [claims, setClaims] = useState(
    [...(photocard.claims || [])].sort((a, b) => new Date(a.claimedAt) - new Date(b.claimedAt))
  );

  useEffect(() => {
    if (!connection) return;

    const onRegistered = (claim) => {
      if (claim.photocardId !== photocard.id) return;
      setClaims((prev) => {
        if (prev.find((c) => c.id === claim.id)) return prev;
        return [...prev, claim].sort((a, b) => new Date(a.claimedAt) - new Date(b.claimedAt));
      });
    };

    const onRemoved = ({ photocardId, userId: removedUserId }) => {
      if (photocardId !== photocard.id) return;
      setClaims((prev) => prev.filter((c) => c.userId !== removedUserId));
    };

    connection.on('ClaimRegistered', onRegistered);
    connection.on('ClaimRemoved', onRemoved);

    return () => {
      connection.off('ClaimRegistered', onRegistered);
      connection.off('ClaimRemoved', onRemoved);
    };
  }, [connection, photocard.id]);

  return (
    <div className="modal-overlay">
      <div className={`card ${styles.modal}`}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.artistName}>{photocard.artistName || 'Photocard'}</div>
            {photocard.version && <div className={styles.version}>{photocard.version}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {connection && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 700, color: 'var(--rose)', letterSpacing: '0.03em' }}>
                <Radio size={11} strokeWidth={2.5} />
                Tempo real
              </span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <hr className="divider" />

        {claims.length === 0 ? (
          <div className={styles.empty}>
            <InboxIcon size={32} strokeWidth={1.5} style={{ color: 'var(--gray)', marginBottom: 8 }} />
            <p>Nenhum claim ainda.</p>
          </div>
        ) : (
          <>
            <div className={styles.rankList}>
              {claims.map((c, i) => {
                const isMe        = c.userId === userId;
                const claimedDate = new Date(c.claimedAt);
                const time = claimedDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                const ms       = String(claimedDate.getMilliseconds()).padStart(3, '0');
                const hasMedal = i < 3;
                const picUrl   = c.profilePicUrl || null;
                const name     = c.username || c.userName || 'usuário';
                const initial  = name[0].toUpperCase();

                return (
                  <div
                    key={c.id}
                    className={`${styles.rankRow} ${isMe ? styles.myRow : ''} claim-pulse`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.pos}>
                      {hasMedal ? (
                        <Trophy size={18} strokeWidth={2} style={{ color: MEDAL_COLORS[i], flexShrink: 0 }} />
                      ) : (
                        <span className={styles.posNum}>#{i + 1}</span>
                      )}
                    </div>

                    <div className={`${styles.miniCard} ${isMe ? styles.miniCardMe : ''}`}>
                      <div className={styles.miniLeft}>
                        {picUrl ? (
                          <img
                            src={picUrl}
                            alt={name}
                            style={{
                              width: 30, height: 30, borderRadius: '50%',
                              objectFit: 'cover', flexShrink: 0,
                              border: isMe ? '2px solid var(--rose)' : '1.5px solid var(--card-border)',
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.72rem', flexShrink: 0 }}>
                            {initial}
                          </div>
                        )}

                        <div className={styles.miniInfo}>
                          <span className={styles.miniUsername}>
                            {name}
                            {isMe && <span className={styles.meMark}> (você)</span>}
                          </span>
                          {c.phoneNumber && (
                            <span className={styles.miniPhone} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Smartphone size={11} strokeWidth={2} />
                              {c.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.miniTime}>
                        {time}<span className={styles.miniMs}>.{ms}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.footer}>
              <span className={styles.totalNote}>
                {claims.length} claim{claims.length !== 1 ? 's' : ''} registrado{claims.length !== 1 ? 's' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}