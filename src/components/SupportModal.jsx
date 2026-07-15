import { Mail } from 'lucide-react';
import styles from './ConfirmModal.module.css';

const SUPPORT_EMAIL = 'kureimo.io@gmail.com';

/**
 * Modal de ajuda / suporte — texto genérico direcionando o usuário para o
 * e-mail de contato do Kureimo. Reaproveita o layout do ConfirmModal.
 */
export default function SupportModal({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className={`card ${styles.modal}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Ajuda &amp; Suporte</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <hr className="divider" />

        {/* Body */}
        <div className={styles.body}>
          <p>
            Encontrou algum problema, tem uma dúvida sobre como usar o Kureimo, quer sugerir
            uma melhoria ou até topa contribuir com o projeto?
          </p>
          <p>
            Manda um e-mail pra gente que a gente responde o quanto antes:
          </p>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', gap: 8, marginBottom: 20 }}
        >
          <Mail size={16} strokeWidth={2} />
          {SUPPORT_EMAIL}
        </a>

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}