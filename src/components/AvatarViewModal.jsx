/**
 * AvatarViewModal
 *
 * Modal circular simples pra mostrar uma foto de perfil ampliada.
 *
 * Props:
 *  - src: string | null           (URL da foto; null mostra a inicial)
 *  - initial: string              (inicial exibida quando não há foto)
 *  - name: string                 (nome exibido acima da foto)
 *  - subtitle: string?            (linha opcional abaixo do nome, ex: "Group Order Manager")
 *  - editable: boolean            (true = modo "editar minha foto", false = só visualização)
 *  - onResize: () => void         (chamado ao clicar "Redimensionar" — só usado se editable)
 *  - onChangeImage: () => void    (chamado ao clicar "Alterar foto" — só usado se editable)
 *  - onClose: () => void
 */
export default function AvatarViewModal({
  src,
  initial = '?',
  name,
  subtitle,
  editable = false,
  onResize,
  onChangeImage,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 360,
          padding: 28,
          textAlign: 'center',
          animation: 'scale-in 0.22s ease',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '4px auto 18px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {src ? (
            <img
              src={src}
              alt={name || 'foto de perfil'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              className="avatar"
              style={{ width: '100%', height: '100%', fontSize: '4rem', borderRadius: '50%' }}
            >
              {initial}
            </div>
          )}
        </div>

        {name && (
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            {name}
          </h3>
        )}
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--gray)' }}>
            {subtitle}
          </p>
        )}

        {editable ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 22, width: '100%' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, minWidth: 0, padding: '11px 8px', fontSize: '0.86rem' }}
              onClick={onResize}
              disabled={!src}
            >
              Redimensionar
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, minWidth: 0, padding: '11px 8px', fontSize: '0.86rem' }}
              onClick={onChangeImage}
            >
              Alterar foto
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 22 }} onClick={onClose}>
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}