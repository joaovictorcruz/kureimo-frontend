import { useState, useRef } from 'react';
import { setsApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';

/* ─── Presets de cor de fundo ─── */
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

/* ─── Presets de cor do texto ─── */
const FONT_COLOR_PRESETS = [
  { label: 'Escuro',  value: '#3B2028' },
  { label: 'Grafite', value: '#444444' },
  { label: 'Rosa',    value: '#C0394A' },
  { label: 'Lilás',   value: '#7B4FA0' },
  { label: 'Branco',  value: '#FFFFFF' },
  { label: 'Creme',   value: '#FFF5EC' },
];

/* ─── Opções de fonte — enviadas ao back como identificador ─── */
const FONT_OPTIONS = [
  { label: 'Nunito (padrão)',    value: 'Nunito',             css: "'Nunito', sans-serif" },
  { label: 'DM Serif Display',  value: 'DM Serif Display',   css: "'DM Serif Display', serif" },
  { label: 'Playfair Display',  value: 'Playfair Display',   css: "'Playfair Display', serif" },
  { label: 'Lora',              value: 'Lora',               css: "'Lora', serif" },
  { label: 'Montserrat',        value: 'Montserrat',         css: "'Montserrat', sans-serif" },
  { label: 'Pacifico',          value: 'Pacifico',           css: "'Pacifico', cursive" },
  { label: 'Dancing Script',    value: 'Dancing Script',     css: "'Dancing Script', cursive" },
  { label: 'Courier New (mono)',value: 'Courier New',        css: "'Courier New', monospace" },
];

/* Garante que a Google Font esteja carregada no documento */
const loadedFonts = new Set(['Nunito', 'DM Serif Display']);
function ensureFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

export default function CreateSetModal({ onClose, onCreated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    description: '',
    claimOpensAt: '',
    imageUrl: '',
  });

  const [bgColor,    setBgColor]    = useState('#F2BFB4');
  const [fontColor,  setFontColor]  = useState('#3B2028');
  const [fontStyle,  setFontStyle]  = useState(FONT_OPTIONS[0]);

  const bgPickerRef   = useRef();
  const fontPickerRef = useRef();

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFontChange = (opt) => {
    ensureFont(opt.value);
    setFontStyle(opt);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Dá um título pro set!'); return; }
    if (!form.claimOpensAt) { toast.error('Defina quando o claim abre!'); return; }

    setLoading(true);
    try {
      const dto = {
        title:           form.title,
        description:     form.description || undefined,
        claimOpensAt:    new Date(form.claimOpensAt).toISOString(),
        imageUrl:        form.imageUrl || undefined,
        backgroundColor: bgColor,
        fontColor:       fontColor,
        fontStyle:       fontStyle.value,
      };
      const newSet = await setsApi.create(dto);
      onCreated(newSet);
    } catch (err) {
      toast.error(err?.message || 'Erro ao criar o set.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = bgColor === '#1A0A2E' || bgColor.toLowerCase() === '#1a0a2e';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal" style={{ maxWidth: 520, overflowY: 'auto', maxHeight: '92vh' }}>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>{step === 1 ? 'Informações do set' : 'Visual do post'}</h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {[1, 2].map((s) => (
                <div key={s} style={{
                  width: 28, height: 4, borderRadius: 2,
                  background: step >= s ? 'var(--rose)' : 'var(--gray-light)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Título *</label>
              <input className="input" placeholder="ex: BTS Butter — Junho 2025" value={form.title}
                onChange={(e) => setF('title', e.target.value)} autoFocus />
            </div>

            <div className="field">
              <label>Imagem do set (URL)</label>
              <input className="input" type="url" placeholder="https://... (imagem do fornecedor)"
                value={form.imageUrl} onChange={(e) => setF('imageUrl', e.target.value)} />
              {form.imageUrl && (
                <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--gray-light)' }}>
                  <img src={form.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <span style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>
                Normalmente a imagem que o fornecedor envia com o set completo.
              </span>
            </div>

            <div className="field">
              <label>Descrição / detalhes</label>
              <textarea className="input" placeholder={"Coloque cada info em uma linha:\nPreço: R$XX\nFrete: a combinar\nPagamento: Pix"}
                value={form.description} onChange={(e) => setF('description', e.target.value)}
                rows={4} style={{ resize: 'vertical' }} />
            </div>

            <div className="field">
              <label>Claim abre em *</label>
              <input className="input" type="datetime-local" value={form.claimOpensAt}
                onChange={(e) => setF('claimOpensAt', e.target.value)} />
              <span style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>
                O stream em tempo real abre automaticamente 10 min antes e depois deste horário.
              </span>
            </div>

            <button className="btn btn-primary" onClick={() => setStep(2)}
              disabled={!form.title.trim() || !form.claimOpensAt} style={{ marginTop: 4 }}>
              Próximo: Visual →
            </button>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Live preview */}
            <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--card-border)' }}>
              <div style={{ background: bgColor, padding: '20px 18px', transition: 'background 0.2s' }}>
                {form.imageUrl && (
                  <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                    <img src={form.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{
                  fontFamily: fontStyle.css,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: fontColor,
                  transition: 'all 0.2s',
                }}>
                  {form.title || 'Título do set'}
                </div>
              </div>
            </div>

            {/* ── Cor de fundo ── */}
            <div className="field">
              <label>Cor de fundo</label>
              <ColorPicker
                presets={BG_PRESETS}
                value={bgColor}
                onChange={setBgColor}
                pickerRef={bgPickerRef}
              />
            </div>

            {/* ── Cor do texto ── */}
            <div className="field">
              <label>Cor do texto</label>
              <ColorPicker
                presets={FONT_COLOR_PRESETS}
                value={fontColor}
                onChange={setFontColor}
                pickerRef={fontPickerRef}
              />
            </div>

            {/* ── Fonte ── */}
            <div className="field">
              <label>Fonte do título</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleFontChange(opt)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${fontStyle.value === opt.value ? 'var(--rose)' : 'var(--card-border)'}`,
                      background: fontStyle.value === opt.value ? 'var(--rose-light)' : 'white',
                      cursor: 'pointer',
                      fontFamily: opt.css,
                      fontSize: '0.85rem',
                      color: 'var(--ink-soft)',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Voltar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '✨ Criar set'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ColorPicker ─── */
function ColorPicker({ presets, value, onChange, pickerRef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Presets em círculos clicáveis */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button
            key={p.value}
            title={p.label}
            onClick={() => onChange(p.value)}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: p.value,
              border: value.toLowerCase() === p.value.toLowerCase()
                ? '3px solid var(--rose-dark)'
                : '2px solid rgba(0,0,0,0.12)',
              cursor: 'pointer',
              transition: 'transform 0.12s, border 0.12s',
              transform: value.toLowerCase() === p.value.toLowerCase() ? 'scale(1.18)' : 'scale(1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Picker nativo + hex input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => pickerRef.current?.click()}
          style={{
            width: '100%',
            height: 38,
            borderRadius: 'var(--radius-sm)',
            background: value,
            border: '1.5px solid var(--card-border)',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: isLight(value) ? '#333' : '#eee',
            letterSpacing: '0.05em',
          }}>
            {value.toUpperCase()} — clique para abrir o seletor
          </span>
          <input
            ref={pickerRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute', opacity: 0,
              width: 1, height: 1, pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
  const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
  const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
  return (r*299 + g*587 + b*114) / 1000 > 128;
}