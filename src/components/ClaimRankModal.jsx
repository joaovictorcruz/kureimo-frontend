import styles from './ClaimRankModal.module.css';

export default function ClaimRankModal({ photocard, userId, onClose }) {
  const claims = [...(photocard.claims || [])].sort(
    (a, b) => new Date(a.claimedAt) - new Date(b.claimedAt)
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card ${styles.modal}`}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.artistName}>{photocard.artistName || 'Photocard'}</div>
            {photocard.version && <div className={styles.version}>{photocard.version}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <hr className="divider" />

        {claims.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: '2rem' }}>🌸</span>
            <p>Nenhum claim ainda.</p>
          </div>
        ) : (
          <>
            <div className={styles.rankList}>
              {claims.map((c, i) => {
                const isMe       = c.userId === userId;
                const claimedDate = new Date(c.claimedAt);
                const time = claimedDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                const ms     = String(claimedDate.getMilliseconds()).padStart(3, '0');
                const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const picUrl = c.profilePicUrl || null;
                const name   = c.username || c.userName || 'usuário';
                const initial = name[0].toUpperCase();

                return (
                  <div
                    key={c.id}
                    className={`${styles.rankRow} ${isMe ? styles.myRow : ''} claim-pulse`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Posição — fora do mini-card */}
                    <div className={styles.pos}>
                      {medal
                        ? <span className={styles.medal}>{medal}</span>
                        : <span className={styles.posNum}>#{i + 1}</span>
                      }
                    </div>

                    {/* Mini-card: avatar + nome / contato / horário */}
                    <div className={`${styles.miniCard} ${isMe ? styles.miniCardMe : ''}`}>
                      <div className={styles.miniLeft}>
                        {/* Avatar com foto de perfil */}
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
                            <span className={styles.miniPhone}>📱 {c.phoneNumber}</span>
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