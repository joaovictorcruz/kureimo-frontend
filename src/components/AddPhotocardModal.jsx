import { useState } from 'react';
import { setsApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';

export default function AddPhotocardModal({ accessToken, onClose, onAdded }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    artistName: '',
    version: '',
    queuePosition: 1,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.artistName.trim()) { toast.error('Informe o nome do artista!'); return; }

    setLoading(true);
    try {
      const pc = await setsApi.addPhotocard(accessToken, {
        artistName: form.artistName,
        version: form.version || undefined,
        queuePosition: Number(form.queuePosition),
      });
      onAdded(pc);
      toast.success('Membro adicionado! 🃏');
    } catch (err) {
      toast.error(err?.message || 'Erro ao adicionar membro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.4rem' }}>Adicionar Membro</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Artista / Nome *</label>
            <input
              className="input"
              placeholder="ex: Jiwoo, Karina, V"
              value={form.artistName}
              onChange={(e) => set('artistName', e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Versão</label>
            <input
              className="input"
              placeholder="ex: Concept Photo ver., Solo ver."
              value={form.version}
              onChange={(e) => set('version', e.target.value)}
            />
          </div>

          <div className="field">
            <label>Posição na fila</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.queuePosition}
              onChange={(e) => set('queuePosition', e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '+ Adicionar membro'}
          </button>
        </form>
      </div>
    </div>
  );
}