import { LogIn, UserPlus, Lock, X } from 'lucide-react';

/**
 * SessionExpiredModal
 *
 * Props:
 *  - reason: 'expired' | 'unauthorized'  (padrão: 'expired')
 *  - onLogin:    () => void   — abre o AuthModal em modo login
 *  - onRegister: () => void   — abre o AuthModal em modo register
 *  - onClose:    () => void   — fecha sem fazer nada
 */
export default function SessionExpiredModal({ reason = 'expired', onLogin, onRegister, onClose }) {
  const isExpired = reason === 'expired';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(30, 10, 30, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fade-in 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--white)',
          borderRadius: 'var(--radius)',
          border: '1.5px solid var(--card-border)',
          boxShadow: '0 24px 64px rgba(59, 32, 40, 0.18)',
          overflow: 'hidden',
          animation: 'scale-in 0.25s ease',
        }}
      >
        {/* Header colorido */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--rose-light), var(--blush-light))',
            padding: '28px 28px 22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
          }}
        >
          {/* Botão fechar */}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'rgba(255,255,255,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--gray)',
                transition: 'background 0.15s',
              }}
              title="Fechar"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          )}

          {/* Ícone central */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(242,134,149,0.25)',
            }}
          >
            <Lock size={26} color="var(--rose-dark)" strokeWidth={2} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                color: 'var(--ink)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {isExpired ? 'Sua sessão expirou' : 'Acesso restrito'}
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--ink-soft)',
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {isExpired
                ? 'Seu login expirou por inatividade. Entre novamente para continuar.'
                : 'Você precisa estar logado para acessar esta página.'}
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Botão principal: Login */}
          <button
            onClick={onLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              width: '100%',
              padding: '13px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--rose), #d96475)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s, transform 0.12s',
              boxShadow: '0 4px 16px rgba(242,134,149,0.35)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
          >
            <LogIn size={17} strokeWidth={2.5} />
            Entrar na minha conta
          </button>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--gray)', fontWeight: 700 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
          </div>

          {/* Botão secundário: Cadastro */}
          <button
            onClick={onRegister}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              width: '100%',
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--card-border)',
              background: 'rgba(255,255,255,0.85)',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, transform 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.background = 'var(--rose-light)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; e.currentTarget.style.transform = 'none'; }}
          >
            <UserPlus size={17} strokeWidth={2} />
            Criar conta grátis ✨
          </button>

          {/* Rodapé */}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gray)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                marginTop: 4,
                padding: '4px',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'color 0.15s, text-decoration-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink-soft)'; e.currentTarget.style.textDecorationColor = 'var(--ink-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray)'; e.currentTarget.style.textDecorationColor = 'transparent'; }}
            >
              Continuar sem entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}