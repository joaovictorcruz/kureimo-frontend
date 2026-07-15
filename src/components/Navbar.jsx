import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './AuthModal';
import SupportModal from './SupportModal';
import styles from './Navbar.module.css';
import {
  Package,
  History,
  User,
  LogOut,
  ChevronDown,
  Crown,
  HelpCircle,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isGom, profilePicUrl, login } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() || '?';

  const AvatarSmall = ({ size = 32, fontSize = '0.75rem' }) => (
    profilePicUrl ? (
      <img
        src={profilePicUrl}
        alt={user?.username}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    ) : (
      <div className="avatar" style={{ width: size, height: size, fontSize }}>{initial}</div>
    )
  );

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logoLink}>
            <Logo size={window.innerWidth < 768 ? 36 : 46} showText  />
          </Link>

          <div className={styles.actions}>
            {user ? (
              <>
                {isGom && (
                  <Link to="/dashboard" className={`btn btn-ghost btn-sm ${styles.navLink}`}>
                    <Package size={14} strokeWidth={2.5} />
                    Meus Sets
                  </Link>
                )}
                <Link to="/historico" className={`btn btn-ghost btn-sm ${styles.navLink}`}>
                  <History size={14} strokeWidth={2.5} />
                  Histórico
                </Link>
                <div className={styles.avatarWrap} ref={menuRef}>
                  <button className={styles.avatarBtn} onClick={() => setMenuOpen((v) => !v)}>
                    <AvatarSmall size={32} fontSize="0.75rem" />
                    <span className={styles.username}>{user.username}</span>
                    <ChevronDown
                      size={12}
                      strokeWidth={2.5}
                      className={styles.caret}
                      style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none', color: 'var(--gray)' }}
                    />
                  </button>

                  {menuOpen && (
                    <div className={styles.dropdown}>
                      {/* User info */}
                      <div className={styles.dropdownUser}>
                        <AvatarSmall size={34} fontSize="0.78rem" />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink)' }}>{user.username}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{user.email}</div>
                          {isGom && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 800, color: 'var(--rose-dark)', letterSpacing: '0.04em' }}>
                              <Crown size={10} strokeWidth={2.5} />
                              GOM
                            </span>
                          )}
                        </div>
                      </div>

                      <hr className="divider" style={{ margin: '10px 0' }} />

                      <Link to="/perfil" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                        <User size={15} strokeWidth={2} />
                        Meu perfil
                      </Link>
                      {isGom && (
                        <Link to="/dashboard" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                          <Package size={15} strokeWidth={2} />
                          Meus Sets
                        </Link>
                      )}
                      <Link to="/historico" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                        <History size={15} strokeWidth={2} />
                        Histórico
                      </Link>

                      <hr className="divider" style={{ margin: '8px 0' }} />

                      <button
                        className={styles.dropdownItem}
                        onClick={() => { setShowSupport(true); setMenuOpen(false); }}
                      >
                        <HelpCircle size={15} strokeWidth={2} />
                        Ajuda &amp; Suporte
                      </button>

                      <hr className="divider" style={{ margin: '8px 0' }} />

                      <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={handleLogout}>
                        <LogOut size={15} strokeWidth={2} />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
              <button className="btn btn-primary btn-sm" onClick={login}>
                Entrar / Cadastrar
              </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthModal initialMode={authMode} onClose={() => setShowAuth(false)} />
      )}

      {showSupport && (
        <SupportModal onClose={() => setShowSupport(false)} />
      )}
    </>
  );
}