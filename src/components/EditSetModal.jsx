import { useState, useRef, useEffect } from 'react';
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
  { label: 'Nunito',             value: 'Nunito',            css: "'Nunito', sans-serif",           category: 'Sans-serif' },
  { label: 'Montserrat',         value: 'Montserrat',        css: "'Montserrat', sans-serif",        category: 'Sans-serif' },
  { label: 'Raleway',            value: 'Raleway',           css: "'Raleway', sans-serif",           category: 'Sans-serif' },
  { label: 'Poppins',            value: 'Poppins',           css: "'Poppins', sans-serif",           category: 'Sans-serif' },
  { label: 'Quicksand',          value: 'Quicksand',         css: "'Quicksand', sans-serif",         category: 'Sans-serif' },
  { label: 'Josefin Sans',       value: 'Josefin Sans',      css: "'Josefin Sans', sans-serif",      category: 'Sans-serif' },
  { label: 'Righteous',          value: 'Righteous',         css: "'Righteous', cursive",            category: 'Sans-serif' },
  { label: 'DM Serif Display',   value: 'DM Serif Display',  css: "'DM Serif Display', serif",       category: 'Serif' },
  { label: 'Playfair Display',   value: 'Playfair Display',  css: "'Playfair Display', serif",       category: 'Serif' },
  { label: 'Lora',               value: 'Lora',              css: "'Lora', serif",                   category: 'Serif' },
  { label: 'Cinzel',             value: 'Cinzel',            css: "'Cinzel', serif",                 category: 'Serif' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond',css: "'Cormorant Garamond', serif",     category: 'Serif' },
  { label: 'Abril Fatface',      value: 'Abril Fatface',     css: "'Abril Fatface', cursive",        category: 'Serif' },
  { label: 'Pacifico',           value: 'Pacifico',          css: "'Pacifico', cursive",             category: 'Cursiva' },
  { label: 'Dancing Script',     value: 'Dancing Script',    css: "'Dancing Script', cursive",       category: 'Cursiva' },
  { label: 'Caveat',             value: 'Caveat',            css: "'Caveat', cursive",               category: 'Cursiva' },
  { label: 'Satisfy',            value: 'Satisfy',           css: "'Satisfy', cursive",              category: 'Cursiva' },
  { label: 'Courier New',        value: 'Courier New',       css: "'Courier New', monospace",        category: 'Mono' },
  { label: 'Space Mono',         value: 'Space Mono',        css: "'Space Mono', monospace",         category: 'Mono' },
];

const CATEGORIES = ['Todos', 'Sans-serif', 'Serif', 'Cursiva', 'Mono'];

const loadedFonts = new Set(['Nunito', 'DM Serif Display']);
function ensureFont(fontName) {
  if (!fontName || loadedFonts.has(fontName) || fontName === 'Courier New') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

function preloadAllFonts() {
  FONT_OPTIONS.forEach((f) => ensureFont(f.value));
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
  const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
  const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
  return (r*299 + g*587 + b*114) / 1000 > 128;
}

/* ─── ColorPicker ─── */
function ColorPicker({ presets, value, onChange }) {
  const pickerRef = useRef();
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  useEffect(() => { setHexInput(value.toUpperCase()); }, [value]);

  const handleHexChange = (raw) => {
    setHexInput(raw);
    const cleaned = raw.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cleaned)) {
      onChange(cleaned);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div
          onClick={() => pickerRef.current?.click()}
          title="Clique para abrir o seletor de cor"
          style={{
            flex: 1, height: 42, borderRadius: 'var(--radius-sm)',
            background: value, border: '1.5px solid var(--card-border)',
            cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace',
            color: isLight(value) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)',
            letterSpacing: '0.04em', pointerEvents: 'none', userSelect: 'none',
          }}>
            🎨 abrir seletor
          </span>
          <input
            ref={pickerRef}
            type="color"
            value={value.length === 7 ? value : '#' + value.replace('#','').padEnd(6,'0')}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          />
        </div>
        <input
          type="text"
          className="input"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#FFFFFF"
          maxLength={7}
          style={{
            width: 100, fontFamily: 'monospace', fontSize: '0.88rem',
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

/* ─── FontPickerModal — abre centralizado na tela ─── */
function FontPickerModal({ value, onChange, onClose, previewText }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const searchRef = useRef();

  useEffect(() => {
    preloadAllFonts();
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const filtered = FONT_OPTIONS.filter((f) => {
    const matchSearch = f.label.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Todos' || f.category === category;
    return matchSearch && matchCat;
  });

  const handleSelect = (opt) => {
    onChange(opt);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          animation: 'scale-in 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px',
          borderBottom: '1.5px solid var(--card-border)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
              🔤 Escolher fonte
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
              ✕
            </button>
          </div>

          <input
            ref={searchRef}
            type="text"
            className="input"
            placeholder="Pesquisar fonte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.9rem' }}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 13px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid',
                  borderColor: category === cat ? 'var(--rose)' : 'var(--card-border)',
                  background: category === cat ? 'var(--rose-light)' : 'transparent',
                  color: category === cat ? 'var(--rose-dark)' : 'var(--gray)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista scrollável */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px 14px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--gray)', fontSize: '0.88rem' }}>
              Nenhuma fonte encontrada
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1.5px solid var(--rose)' : '1.5px solid transparent',
                      background: isSelected ? 'var(--rose-light)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s, border-color 0.1s',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
                  >
                    <span style={{
                      fontFamily: opt.css,
                      fontSize: '1.1rem',
                      color: isSelected ? 'var(--rose-dark)' : 'var(--ink-soft)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {previewText || opt.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: isSelected ? 'var(--rose-dark)' : 'var(--gray)',
                        fontFamily: 'var(--font-body)',
                        background: isSelected ? 'rgba(242,134,149,0.15)' : 'var(--gray-light)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-pill)',
                      }}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span style={{ color: 'var(--rose-dark)', fontWeight: 900, fontSize: '0.8rem' }}>✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FontSelector (botão que abre o modal) ─── */
function FontSelector({ value, onChange, previewText }) {
  const [showPicker, setShowPicker] = useState(false);
  const selected = FONT_OPTIONS.find((f) => f.value === value) || FONT_OPTIONS[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--card-border)',
          background: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--rose)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,134,149,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--card-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span style={{ fontFamily: selected.css, fontSize: '1.05rem', color: 'var(--ink-soft)', fontWeight: 600 }}>
          {previewText || selected.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray)',
            background: 'var(--gray-light)', padding: '2px 8px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-body)',
          }}>
            {selected.label}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>✎</span>
        </div>
      </button>

      {showPicker && (
        <FontPickerModal
          value={value}
          onChange={onChange}
          onClose={() => setShowPicker(false)}
          previewText={previewText}
        />
      )}
    </>
  );
}

/* ─── EditSetModal ─── */
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

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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
      <div className="card modal" style={{ maxWidth: 520, overflowY: 'auto' }}>

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
            <ColorPicker presets={BG_PRESETS} value={bgColor} onChange={setBgColor} />
          </div>

          <div className="field">
            <label>Cor do texto</label>
            <ColorPicker presets={FONT_COLOR_PRESETS} value={fontColor} onChange={setFontColor} />
          </div>

          <div className="field">
            <label>Fonte do título</label>
            <FontSelector
              value={fontStyle.value}
              onChange={(opt) => setFontStyle(opt)}
              previewText={form.title || 'Título do set'}
            />
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