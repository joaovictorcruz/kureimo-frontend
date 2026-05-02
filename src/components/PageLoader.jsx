/**
 * PageLoader
 *
 * Exibido enquanto o AuthContext está inicializando (loading = true).
 * Cobre a tela toda com o fundo do design system e o logo animado.
 */
export default function PageLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--bg)',
      }}
    >
      {/* Logo / ícone animado */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        {/* Anel externo pulsante */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid var(--rose-light)',
            animation: 'loader-ring 1.4s ease-in-out infinite',
          }}
        />
        {/* Anel interno girando */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--rose)',
            borderRightColor: 'var(--rose)',
            animation: 'loader-spin 0.9s linear infinite',
          }}
        />
      </div>

      {/* Texto */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            color: 'var(--rose-dark)',
            letterSpacing: '-0.01em',
          }}
        >
          kureimo
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--gray)',
            marginTop: 4,
            fontWeight: 600,
            animation: 'loader-dots 1.4s steps(4, end) infinite',
          }}
        >
          Carregando
        </div>
      </div>

      {/* Keyframes injetados inline via style tag */}
      <style>{`
        @keyframes loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes loader-ring {
          0%, 100% { transform: scale(1);   opacity: 0.4; }
          50%       { transform: scale(1.12); opacity: 0.9; }
        }
        @keyframes loader-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.8; }
          50%       { transform: scale(1.15); opacity: 1;   }
        }
        @keyframes loader-dots {
          0%  { content: 'Carregando';    }
          25% { content: 'Carregando.';   }
          50% { content: 'Carregando..';  }
          75% { content: 'Carregando...'; }
        }
      `}</style>
    </div>
  );
}