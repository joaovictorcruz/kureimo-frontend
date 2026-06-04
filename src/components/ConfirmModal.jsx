import styles from './ConfirmModal.module.css';

/**
 * Modal de confirmação reutilizável.
 *
 * Props:
 *  title        — título do modal
 *  message      — mensagem (suporta \n para quebras de linha)
 *  confirmLabel — texto do botão de confirmação
 *  confirmClass — classe CSS do botão (ex: "btn-danger", "btn-primary")
 *  onConfirm    — callback ao confirmar
 *  onCancel     — callback ao cancelar / fechar
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmClass = 'btn-primary',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay">
      <div className={`card ${styles.modal}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <hr className="divider" />

        {/* Message — respeita \n */}
        <div className={styles.body}>
          {message.split('\n').map((line, i) =>
            line.trim() === ''
              ? <br key={i} />
              : <p key={i}>{line}</p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className={`btn ${confirmClass}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}