import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetDate, apiStatus) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [phase, setPhase] = useState('waiting');
  const [openedAt, setOpenedAt] = useState(null);
  const openedAtRef = useRef(null); // ref para evitar re-render no tick

  useEffect(() => {
    if (apiStatus === 'Open') {
      setPhase('open');
      if (!openedAtRef.current) {
        openedAtRef.current = new Date();
        setOpenedAt(openedAtRef.current);
      }
      return;
    }

    if (apiStatus === 'Closed') {
      setPhase('closed');
      return;
    }

    if (!targetDate) return;

    const target  = new Date(targetDate).getTime();
    const TEN_MIN = 10 * 60 * 1000;

    const tick = () => {
      const diff = target - Date.now();

      if (apiStatus === 'Draft') {
        setPhase('waiting');
      } else {
        if (diff > TEN_MIN) {
          setPhase('waiting');
        } else if (diff > 0) {
          setPhase('streaming');
        } else if (diff > -TEN_MIN) {
          setPhase('open');
          if (!openedAtRef.current) {
            openedAtRef.current = new Date();
            setOpenedAt(openedAtRef.current);
          }
        } else {
          setPhase('closed');
        }
      }

      setTimeLeft(formatTime(diff));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, apiStatus]);

  useEffect(() => {
    if ((apiStatus === 'Open' || apiStatus === 'Closed') && targetDate) {
      const diff = new Date(targetDate).getTime() - Date.now();
      setTimeLeft(formatTime(diff));
    }
  }, [apiStatus, targetDate]);

  return { timeLeft, phase, openedAt };
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