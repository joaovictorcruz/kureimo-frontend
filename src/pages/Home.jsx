import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import Logo from '../components/Logo';
import { Zap, Trophy, Link2, Palette, Heart } from 'lucide-react';
import styles from './Home.module.css';

const FEATURES = [
  {
    icon: Zap,
    title: 'Claim em tempo real',
    desc: 'Velocidade de milissegundos via SignalR. Quem clica primeiro, leva — sem enquete, sem confusão.',
  },
  {
    icon: Trophy,
    title: 'Ranking com timestamp',
    desc: 'Veja exatamente quem fez claim e o horário exato com precisão de milissegundos.',
  },
  {
    icon: Link2,
    title: 'Link exclusivo por set',
    desc: 'Seu GOM compartilha o link no grupo e você entra direto no set, sem precisar de conta prévia.',
  },
  {
    icon: Palette,
    title: 'Visual personalizado',
    desc: 'GOMs escolhem cor de fundo, fonte e imagem do set - estilo post.',
  },
];

export default function Home() {
  const { user, isGom, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [accessInput, setAccessInput] = useState('');
  const navigate = useNavigate();

  const openRegister = () => { setAuthMode('register'); setShowAuth(true); };
  const openLogin    = () => { setAuthMode('login');    setShowAuth(true); };

  const handleAccess = (e) => {
    e.preventDefault();
    const val = accessInput.trim();
    if (!val) return;
    const match = val.match(/\/set\/([^/?#\s]+)/);
    const token = match ? match[1] : val;
    navigate(`/set/${token}`);
  };

  return (
    <main>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.blobs} aria-hidden>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>

        <div className={`page-container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className="badge badge-pink" style={{ marginBottom: 20 }}>
              ✦ feito para o kpop br
            </span>

            <h1 className={styles.heroTitle}>
              Claim seus<br />
              <em>photocards</em>
              sem stress
            </h1>

            <p className={styles.heroSub}>
              Chega de enquete do WhatsApp. No Kureimo, quem clica primeiro leva — com ranking em tempo real e link exclusivo do seu GOM.
            </p>

            {!authLoading && !user && (
              <div className={styles.heroCtas}>
                <button className="btn btn-primary btn-lg" onClick={openRegister}>
                  Criar conta grátis
                </button>
                <button className="btn btn-secondary btn-lg" onClick={openLogin}>
                  Já tenho conta
                </button>
              </div>
            )}

            {/* Access link form */}
            <form className={styles.accessForm} onSubmit={handleAccess}>
              <input
                className="input"
                style={{ flex: 1, borderRadius: 'var(--radius-pill)', paddingLeft: 22 }}
                placeholder="Cole o link ou token do set aqui..."
                value={accessInput}
                onChange={(e) => setAccessInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Acessar →
              </button>
            </form>
          </div>

          {/* Decorative card stack */}
          <div className={styles.heroVisual} aria-hidden>
            <div className={styles.setMockup}>
              {/* Mock set card */}
              <div className={styles.mockSetImg}>
                <span className="badge badge-live" style={{ position: 'absolute', top: 10, left: 10, fontSize: '0.65rem' }}>
                  <span className={styles.mockLiveDot} /> AO VIVO
                </span>
              </div>
              <div className={styles.mockSetMeta}>
                <div className={styles.mockGomRow}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(150deg,var(--rose),var(--blush))', flexShrink: 0 }} />
                  <div>
                    <div style={{ height: 7, width: 80, borderRadius: 4, background: 'var(--blush)' }} />
                  </div>
                </div>
                <div style={{ height: 10, width: '70%', borderRadius: 5, background: 'var(--gray-light)', marginBottom: 4 }} />
                <div style={{ height: 7, width: '50%', borderRadius: 4, background: 'var(--gray-light)' }} />
              </div>
            </div>

            {/* Mock member rows */}
            <div className={styles.mockRows}>
              {[
                { name: 'Jiwoo', blur: false, claimed: true },
                { name: 'Ian',     blur: false, claimed: false, active: true },
                { name: 'Stella', blur: true },
                { name: 'Carmen',   blur: true },
              ].map((m, i) => (
                <div key={i} className={`${styles.mockRow} ${m.blur ? styles.mockRowBlur : ''}`}>
                  <div className={styles.mockRowName}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{m.name}</span>
                    {m.claimed && <span style={{ fontSize: '0.62rem', color: 'var(--rose-dark)', fontWeight: 800 }}>Você #1</span>}
                  </div>
                  <div className={`${styles.mockCircle} ${m.claimed ? styles.mockCircleDone : ''} ${m.active ? styles.mockCircleActive : ''}`}>
                    {m.claimed ? '✓' : '♡'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2>Por que usar o Kureimo?</h2>
            <p style={{ color: 'var(--gray)', marginTop: 10, maxWidth: 460, margin: '10px auto 0', fontSize: '0.95rem' }}>
              Feito especialmente para os collectors e goms do Brasil
            </p>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`card ${styles.featureCard}`}>
                  <div className={styles.featureIconWrap}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3>{f.title}</h3>
                  <p style={{ color: 'var(--gray)', marginTop: 8, fontSize: '0.88rem', lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.howTo}>
        <div className="page-container">
          <h2 style={{ textAlign: 'center', marginBottom: 52 }}>Como funciona?</h2>
          <div className={styles.steps}>
            {[
              { n: '01', title: 'GOM cria o set',     desc: 'Sobe a imagem do fornecedor, define o horário do claim e personaliza o visual do post.' },
              { n: '02', title: 'Compartilha o link', desc: 'O GOM posta o link exclusivo do set e apenas quem possui o link, tem acesso ao set.' },
              { n: '03', title: 'Você dá claim',      desc: 'Na hora marcada, o botão ativa em tempo real. Clique no círculo ao lado do membro que você quer!' },
              { n: '04', title: 'Ranking na hora',    desc: 'Abra o card do membro pra ver a fila completa com o timestamp exato de cada claim.' },
            ].map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ color: 'var(--gray)', fontSize: '0.88rem', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <section className={styles.ctaSection}>
          <div className="page-container" style={{ textAlign: 'center' }}>
            <h2>Pronto pra dar claim?</h2>
            <p style={{ color: 'var(--gray)', marginTop: 10, marginBottom: 32, fontSize: '0.95rem' }}>
              Crie sua conta grátis e nunca mais perca um photocard.
            </p>
            <button className="btn btn-primary btn-lg" onClick={openRegister}>
              Começar agora
            </button>
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className="page-container">
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}>
              <Logo size={28} showText />
            </div>
            <p style={{ color: 'var(--gray)', fontSize: '0.78rem', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              feito com <Heart size={12} fill="currentColor" color="var(--rose)" /> para a comunidade kpop do Brasil
            </p>
          </div>
        </div>
      </footer>

      {showAuth && <AuthModal initialMode={authMode} onClose={() => setShowAuth(false)} />}
    </main>
  );
}