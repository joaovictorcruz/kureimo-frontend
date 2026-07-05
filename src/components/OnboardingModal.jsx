import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import styles from './OnboardingModal.module.css';
import { Mail, Crown, Heart, ChevronRight, Loader2 } from 'lucide-react';

export default function OnboardingModal() {
  const { completeOnboarding } = useAuth();
  const toast = useToast();

  const [step, setStep]     = useState(1);
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState(null);
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Insira um e-mail válido.');
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!role) { toast.error('Escolha seu papel.'); return; }
    setSaving(true);
    try {
      await completeOnboarding(email.trim(), role);
      toast.success('Perfil configurado, bem-vindo ao Kureimo!');
    } catch (err) {
      if (err?.status === 409) toast.error('Este e-mail já está em uso.');
      else toast.error('Erro ao salvar. Tenta de novo!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className={`card ${styles.modal}`}>

        <div className={styles.header}>
          <div className={styles.steps}>
            {[1, 2].map((s) => (
              <div key={s} className={`${styles.step} ${step >= s ? styles.stepActive : ''}`} />
            ))}
          </div>
          <h2 className={styles.title}>
            {step === 1 ? 'Seu e-mail de recuperação' : 'Como você vai usar o Kureimo?'}
          </h2>
          <p className={styles.sub}>
            {step === 1
              ? 'Usamos seu e-mail só pra recuperação de conta, caso você esqueça sua senha.'
              : 'Isso define o que você pode fazer na plataforma.'}
          </p>
        </div>

        {step === 1 ? (
          <div className={styles.body}>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} strokeWidth={2} /> E-mail
              </label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                autoFocus
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleNext}>
              Próximo <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.roleCards}>
              <button
                className={`${styles.roleCard} ${role === 'Gon' ? styles.roleCardActive : ''}`}
                onClick={() => setRole('Gon')}
              >
                <Crown size={28} strokeWidth={1.5} style={{ color: 'var(--rose-dark)' }} />
                <span className={styles.roleLabel}>GOM</span>
                <span className={styles.roleDesc}>Você cria e gerencia sets de photocards</span>
              </button>

              <button
                className={`${styles.roleCard} ${role === 'Collector' ? styles.roleCardActive : ''}`}
                onClick={() => setRole('Collector')}
              >
                <Heart size={28} strokeWidth={1.5} style={{ color: 'var(--rose)' }} />
                <span className={styles.roleLabel}>Collector</span>
                <span className={styles.roleDesc}>Você dá claim nos photocards que quiser</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                Voltar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={!role || saving}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {saving
                  ? <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                  : 'Confirmar'
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}