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
            <div className={styles.artistName}>{photocard.artistName || 'Photocards'}</div>
            {photocard.version && <div className={styles.version}>{photocard.version}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <hr className="divider" />

        {/* Ranking list */}
        {claims.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: '2rem' }}>🌸</span>
            <p>Nenhum claim ainda.</p>
          </div>
        ) : (
          <>
            <div className={styles.rankHeader}>
              <span>Posição</span>
              <span>Usuário</span>
              <span>Horário</span>
            </div>
            <div className={styles.rankList}>
              {claims.map((c, i) => {
                const isMe = c.userId === userId;
                const claimedDate = new Date(c.claimedAt);
                const time = claimedDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                const ms = String(claimedDate.getMilliseconds()).padStart(3, '0');

                return (
                  <div
                    key={c.id}
                    className={`${styles.rankRow} ${isMe ? styles.myRow : ''} claim-pulse`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.pos}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div className={styles.rankUser}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                        {(c.username || c.userName || '?')[0].toUpperCase()}
                      </div>
                      <span className={styles.rankUsername}>
                        {c.username || c.userName || 'usuário'}
                        {isMe && <span className={styles.meMark}> (você)</span>}
                      </span>
                    </div>
                    <div className={styles.rankTime}>
                      {time}<span className={styles.rankMs}>.{ms}</span>
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
