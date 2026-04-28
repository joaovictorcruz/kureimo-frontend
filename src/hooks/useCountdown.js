import { useState, useEffect } from 'react';

/**
 * useCountdown
 *
 * Deriva a fase combinando status da API (fonte da verdade) + timer local.
 *
 * Fases:
 *  - Open   → sempre 'open'    (API forçou)
 *  - Closed → sempre 'closed'  (API forçou)
 *  - Draft / Published → roda o timer, mas Draft trava a fase em 'waiting'
 *    (mostra o countdown, porém não libera claim nem streaming)
 */
export function useCountdown(targetDate, apiStatus) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [phase, setPhase] = useState('waiting');

  useEffect(() => {
    // Status definitivos vindos da API — sem timer necessário para a fase
    if (apiStatus === 'Open')   { setPhase('open');   return; }
    if (apiStatus === 'Closed') { setPhase('closed'); return; }

    // Draft e Published: roda o countdown para exibir o tempo
    // mas Draft mantém fase 'waiting' independente do horário
    if (!targetDate) return;

    const target  = new Date(targetDate).getTime();
    const TEN_MIN = 10 * 60 * 1000;

    const tick = () => {
      const diff = target - Date.now();

      if (apiStatus === 'Draft') {
        // Sempre waiting — só exibe o countdown, nunca libera claim
        setPhase('waiting');
      } else {
        // Published: fase normal pelo timer
        if      (diff > TEN_MIN)  setPhase('waiting');
        else if (diff > 0)        setPhase('streaming');
        else if (diff > -TEN_MIN) setPhase('open');
        else                      setPhase('closed');
      }

      setTimeLeft(formatTime(diff));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, apiStatus]);

  // Para Open/Closed: calcula o timeLeft estático de referência
  useEffect(() => {
    if ((apiStatus === 'Open' || apiStatus === 'Closed') && targetDate) {
      const diff = new Date(targetDate).getTime() - Date.now();
      setTimeLeft(formatTime(diff));
    }
  }, [apiStatus, targetDate]);

  return { timeLeft, phase };
}

function formatTime(ms) {
  const abs  = Math.abs(ms);
  const past = ms < 0;
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return past ? `+${parts.join(' ')}` : parts.join(' ');
}