import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal de confirmação de exclusão de conta.
 * O usuário precisa digitar "excluir <username>" para habilitar o botão.
 *
 * Props:
 *   username  — string  — nome do usuário logado
 *   onConfirm — () => Promise<void> — chamado ao confirmar (já com loading externo)
 *   onClose   — () => void
 */
export default function DeleteAccountModal({ username, onConfirm, onClose }) {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  const expected = `excluir ${username}`.toLowerCase();
  const isValid  = input.trim().toLowerCase() === expected;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="card modal" style={{ maxWidth: 440 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            flexShrink: 0,
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'rgba(220, 53, 69, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} strokeWidth={2} color="#DC3545" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#3B2028' }}>Excluir conta</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--gray)', lineHeight: 1.5 }}>
              Esta ação é permanente e não pode ser desfeita.
            </p>
          </div>
        </div>

        <hr className="divider" />

        {/* Aviso */}
        <div style={{
          background: 'rgba(220, 53, 69, 0.06)',
          border: '1.5px solid rgba(220, 53, 69, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          marginBottom: 20,
        }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9B2335', lineHeight: 1.6 }}>
            Ao excluir sua conta, todos os seus dados serão removidos permanentemente,
            incluindo histórico de claims e informações de perfil. <strong>Não há como recuperar.</strong>
          </p>
        </div>

        {/* Campo de confirmação */}
        <div className="field" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Para confirmar, digite{' '}
            <code style={{
              background: 'rgba(242,134,149,0.12)',
              border: '1px solid rgba(242,134,149,0.3)',
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: '#d96475',
              fontWeight: 700,
            }}>
              excluir {username}
            </code>{' '}
            abaixo:
          </label>
          <input
            className="input"
            style={{ marginTop: 8, fontFamily: 'monospace' }}
            placeholder={`excluir ${username}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            autoFocus
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            style={{ minWidth: 120 }}
          >
            {loading
              ? <span className="spinner" style={{ width: 15, height: 15 }} />
              : 'Excluir minha conta'
            }
          </button>
        </div>

      </div>
    </div>
  );
}