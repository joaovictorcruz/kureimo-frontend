import { useState, useRef } from 'react';
import { setsApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const BG_PRESETS = [
  { label: 'Rosa',    value: '#F28695' },
  { label: 'Blush',   value: '#F2BFB4' },
  { label: 'Pêssego', value: '#F1CCA6' },
  { label: 'Butter',  value: '#F2E6B5' },
  { label: 'Lilás',   value: '#E8D5F5' },
  { label: 'Céu',     value: '#C8E6FF' },
  { label: 'Menta',   value: '#C8F0E0' },
  { label: 'Branco',  value: '#FFFFFF' },
  { label: 'Cinza',   value: '#F0ECEC' },
  { label: 'Noite',   value: '#1A0A2E' },
];

const FONT_COLOR_PRESETS = [
  { label: 'Escuro',  value: '#3B2028' },
  { label: 'Grafite', value: '#444444' },
  { label: 'Rosa',    value: '#C0394A' },
  { label: 'Lilás',   value: '#7B4FA0' },
  { label: 'Branco',  value: '#FFFFFF' },
  { label: 'Creme',   value: '#FFF5EC' },
];

const FONT_OPTIONS = [
  { label: 'Nunito (padrão)',    value: 'Nunito',            css: "'Nunito', sans-serif" },
  { label: 'DM Serif Display',  value: 'DM Serif Display',  css: "'DM Serif Display', serif" },
  { label: 'Playfair Display',  value: 'Playfair Display',  css: "'Playfair Display', serif" },
  { label: 'Lora',              value: 'Lora',              css: "'Lora', serif" },
  { label: 'Montserrat',        value: 'Montserrat',        css: "'Montserrat', sans-serif" },
  { label: 'Pacifico',          value: 'Pacifico',          css: "'Pacifico', cursive" },
  { label: 'Dancing Script',    value: 'Dancing Script',    css: "'Dancing Script', cursive" },
  { label: 'Courier New (mono)',value: 'Courier New',       css: "'Courier New', monospace" },
];

const loadedFonts = new Set(['Nunito', 'DM Serif Display']);
function ensureFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
  const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
  const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
  return (r*299 + g*587 + b*114) / 1000 > 128;
}

function ColorPicker({ presets, value, onChange, pickerRef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button key={p.value} title={p.label} onClick={() => onChange(p.value)} style={{
            width: 32, height: 32, borderRadius: '50%', background: p.value,
            border: value.toLowerCase() === p.value.toLowerCase()
              ? '3px solid var(--rose-dark)' : '2px solid rgba(0,0,0,0.12)',
            cursor: 'pointer', flexShrink: 0,
            transform: value.toLowerCase() === p.value.toLowerCase() ? 'scale(1.18)' : 'scale(1)',
            transition: 'transform 0.12s, border 0.12s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }} />
        ))}
      </div>
      <div onClick={() => pickerRef.current?.click()} style={{
        width: '100%', height: 38, borderRadius: 'var(--radius-sm)',
        background: value, border: '1.5px solid var(--card-border)',
        cursor: 'pointer', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 800, fontFamily: 'monospace',
          color: isLight(value) ? '#333' : '#eee', letterSpacing: '0.05em',
        }}>
          {value.toUpperCase()} — clique para abrir o seletor
        </span>
        <input ref={pickerRef} type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

export default function EditSetModal({ set, onClose, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title:        set.title || '',
    description:  set.description || '',
    claimOpensAt: set.claimOpensAt
      ? new Date(new Date(set.claimOpensAt).getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString().slice(0, 16)
      : '',
    imageUrl: set.imageUrl || '',
  });

  const initFont = FONT_OPTIONS.find((f) => f.value === set.fontStyle) || FONT_OPTIONS[0];
  const [bgColor,   setBgColor]   = useState(set.backgroundColor || '#F2BFB4');
  const [fontColor, setFontColor] = useState(set.fontColor || '#3B2028');
  const [fontStyle, setFontStyle] = useState(initFont);

  const bgPickerRef   = useRef();
  const fontPickerRef = useRef();

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFontChange = (opt) => { ensureFont(opt.value); setFontStyle(opt); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('O título é obrigatório.'); return; }
    if (!form.claimOpensAt) { toast.error('Defina quando o claim abre.'); return; }
    setLoading(true);
    try {
      const updated = await setsApi.update(set.accessToken, {
        title:           form.title,
        description:     form.description || undefined,
        claimOpensAt:    new Date(form.claimOpensAt).toISOString(),
        imageUrl:        form.imageUrl || undefined,
        backgroundColor: bgColor,
        fontColor:       fontColor,
        fontStyle:       fontStyle.value,
      });
      toast.success('Set atualizado! ✨');
      onSaved(updated);
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal" style={{ maxWidth: 520, overflowY: 'auto', maxHeight: '92vh' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.35rem' }}>✏️ Editar set</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live preview */}
          <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--card-border)', marginBottom: 4 }}>
            <div style={{ background: bgColor, padding: '16px 18px', transition: 'background 0.2s' }}>
              {form.imageUrl && (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                  <img src={form.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div style={{ fontFamily: fontStyle.css, fontSize: '1rem', fontWeight: 700, color: fontColor }}>
                {form.title || 'Título do set'}
              </div>
            </div>
          </div>

          <div className="field">
            <label>Título *</label>
            <input className="input" placeholder="ex: BTS Butter — Junho 2025" value={form.title}
              onChange={(e) => setF('title', e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label>Imagem do set (URL)</label>
            <input className="input" type="url" placeholder="https://..." value={form.imageUrl}
              onChange={(e) => setF('imageUrl', e.target.value)} />
          </div>

          <div className="field">
            <label>Descrição / detalhes</label>
            <textarea className="input" value={form.description}
              onChange={(e) => setF('description', e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </div>

          <div className="field">
            <label>Claim abre em *</label>
            <input className="input" type="datetime-local" value={form.claimOpensAt}
              onChange={(e) => setF('claimOpensAt', e.target.value)} />
          </div>

          <div className="field">
            <label>Cor de fundo</label>
            <ColorPicker presets={BG_PRESETS} value={bgColor} onChange={setBgColor} pickerRef={bgPickerRef} />
          </div>

          <div className="field">
            <label>Cor do texto</label>
            <ColorPicker presets={FONT_COLOR_PRESETS} value={fontColor} onChange={setFontColor} pickerRef={fontPickerRef} />
          </div>

          <div className="field">
            <label>Fonte do título</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FONT_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => handleFontChange(opt)} style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${fontStyle.value === opt.value ? 'var(--rose)' : 'var(--card-border)'}`,
                  background: fontStyle.value === opt.value ? 'var(--rose-light)' : 'white',
                  cursor: 'pointer', fontFamily: opt.css, fontSize: '0.85rem',
                  color: 'var(--ink-soft)', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Salvar alterações ✨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}