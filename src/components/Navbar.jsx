import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './AuthModal';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout, isGom } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const openLogin = () => { setAuthMode('login'); setShowAuth(true); setMenuOpen(false); };
  const openRegister = () => { setAuthMode('register'); setShowAuth(true); setMenuOpen(false); };

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() || '?';

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logoLink}>
            <Logo size={36} showText />
          </Link>

          <div className={styles.actions}>
            {user ? (
              <>
                {isGom && (
                  <Link to="/dashboard" className={`btn btn-ghost btn-sm ${styles.navLink}`}>
                    📦 Meus Sets
                  </Link>
                )}
                <div className={styles.avatarWrap} ref={menuRef}>
                  <button className={styles.avatarBtn} onClick={() => setMenuOpen((v) => !v)}>
                    <div className="avatar">{initial}</div>
                    <span className={styles.username}>{user.username}</span>
                    <span className={styles.caret} style={{ transform: menuOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>

                  {menuOpen && (
                    <div className={styles.dropdown}>
                      {/* User info */}
                      <div className={styles.dropdownUser}>
                        <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.78rem' }}>{initial}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink)' }}>{user.username}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{user.email}</div>
                          {isGom && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--rose-dark)', letterSpacing: '0.04em' }}>
                              👑 GOM
                            </span>
                          )}
                        </div>
                      </div>

                      <hr className="divider" style={{ margin: '10px 0' }} />

                      {/* Navigation items */}
                      <Link to="/perfil" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                        👤 Meu perfil
                      </Link>
                      {isGom && (
                        <Link to="/dashboard" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                          📦 Meus Sets
                        </Link>
                      )}

                      <hr className="divider" style={{ margin: '8px 0' }} />

                      <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={handleLogout}>
                        🚪 Sair
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={openLogin}>
                  Entrar
                </button>
                <button className="btn btn-primary btn-sm" onClick={openRegister}>
                  Cadastrar ✨
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthModal initialMode={authMode} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
