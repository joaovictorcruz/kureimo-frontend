import { useState, useRef, useEffect } from 'react';
import { setsApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import ImageCropModal from './ImageCropModal';
import {
  X,
  Image as ImageIcon,
  Type,
  Palette,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Scissors,
  Search,
} from 'lucide-react';

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
const ALLOWED_IMAGE_EXTS  = '.jpg,.jpeg,.png,.webp';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE      = 5 * 1024 * 1024;

const loadedFonts = new Set(['Nunito', 'DM Serif Display']);
function ensureFont(fontName) {
  if (!fontName || loadedFonts.has(fontName) || fontName === 'Courier New') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}
function preloadAllFonts() { FONT_OPTIONS.forEach((f) => ensureFont(f.value)); }

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
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(raw.trim())) onChange(raw.trim());
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button key={p.value} type="button" title={p.label} onClick={() => onChange(p.value)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: p.value, border: value.toLowerCase() === p.value.toLowerCase() ? '3px solid var(--rose-dark)' : '2px solid rgba(0,0,0,0.12)', cursor: 'pointer', transition: 'transform 0.12s', transform: value.toLowerCase() === p.value.toLowerCase() ? 'scale(1.18)' : 'scale(1)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div onClick={() => pickerRef.current?.click()} style={{ flex: 1, height: 42, borderRadius: 'var(--radius-sm)', background: value, border: '1.5px solid var(--card-border)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace', color: isLight(value) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)', pointerEvents: 'none' }}>
            <Palette size={12} />
            abrir seletor
          </span>
          <input ref={pickerRef} type="color" value={value.length === 7 ? value : '#' + value.replace('#','').padEnd(6,'0')} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
        </div>
        <input type="text" className="input" value={hexInput} onChange={(e) => handleHexChange(e.target.value)} placeholder="#FFFFFF" maxLength={7} style={{ width: 100, fontFamily: 'monospace', fontSize: '0.88rem', textTransform: 'uppercase', flexShrink: 0 }} />
      </div>
    </div>
  );
}

/* ─── FontPickerModal ─── */
function FontPickerModal({ value, onChange, onClose, previewText }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const searchRef = useRef();
  useEffect(() => { preloadAllFonts(); setTimeout(() => searchRef.current?.focus(), 50); }, []);
  const filtered = FONT_OPTIONS.filter((f) => {
    return f.label.toLowerCase().includes(search.toLowerCase()) && (category === 'Todos' || f.category === category);
  });
  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '78vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', animation: 'scale-in 0.22s ease' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1.5px solid var(--card-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Type size={18} strokeWidth={2} />
              Escolher fonte
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
            <input ref={searchRef} type="text" className="input" placeholder="Pesquisar fonte..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '4px 13px', borderRadius: 'var(--radius-pill)', border: '1.5px solid', borderColor: category === cat ? 'var(--rose)' : 'var(--card-border)', background: category === cat ? 'var(--rose-light)' : 'transparent', color: category === cat ? 'var(--rose-dark)' : 'var(--gray)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px 14px' }}>
          {filtered.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => { onChange(opt); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 'var(--radius-sm)', border: isSelected ? '1.5px solid var(--rose)' : '1.5px solid transparent', background: isSelected ? 'var(--rose-light)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 4, gap: 12 }}>
                <span style={{ fontFamily: opt.css, fontSize: '1.1rem', color: isSelected ? 'var(--rose-dark)' : 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewText || opt.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isSelected ? 'var(--rose-dark)' : 'var(--gray)', fontFamily: 'var(--font-body)', background: isSelected ? 'rgba(242,134,149,0.15)' : 'var(--gray-light)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>{opt.label}</span>
                  {isSelected && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--rose-dark)' }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── FontSelector ─── */
function FontSelector({ value, onChange, previewText }) {
  const [showPicker, setShowPicker] = useState(false);
  const selected = FONT_OPTIONS.find((f) => f.value === value) || FONT_OPTIONS[0];
  return (
    <>
      <button type="button" onClick={() => setShowPicker(true)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--card-border)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: selected.css, fontSize: '1.05rem', color: 'var(--ink-soft)', fontWeight: 600 }}>{previewText || selected.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray)', background: 'var(--gray-light)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)' }}>{selected.label}</span>
          <Type size={13} style={{ color: 'var(--gray)' }} />
        </div>
      </button>
      {showPicker && <FontPickerModal value={value} onChange={onChange} onClose={() => setShowPicker(false)} previewText={previewText} />}
    </>
  );
}

/* ─── ImageUploadField ─── */
function ImageUploadField({ imagePreview, onFileSelected, onClear, required }) {
  const inputRef = useRef();
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { alert('Formato inválido. Use JPG, JPEG, PNG ou WEBP.'); e.target.value = ''; return; }
    if (file.size > MAX_IMAGE_SIZE) { alert('A imagem deve ter no máximo 5MB.'); e.target.value = ''; return; }
    onFileSelected(file);
    e.target.value = '';
  };
  return (
    <div className="field">
      <label>Imagem do set {required && '*'}</label>
      {imagePreview ? (
        <div style={{ position: 'relative' }}>
          <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--gray-light)' }}>
            <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <button type="button" onClick={onClear} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Scissors size={12} strokeWidth={2} />
            Recortar / Trocar
          </button>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()} style={{ border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.5)', transition: 'border-color 0.15s, background 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.background = 'var(--rose-light)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <ImageIcon size={28} strokeWidth={1.5} style={{ color: 'var(--gray)' }} />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-soft)' }}>Clique para selecionar</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--gray)', marginTop: 3 }}>JPG, JPEG, PNG ou WEBP · máx 5MB</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept={ALLOWED_IMAGE_EXTS} onChange={handleChange} style={{ display: 'none' }} />
    </div>
  );
}

/* ═══════════════════════════════
   CreateSetModal
═══════════════════════════════ */
export default function CreateSetModal({ onClose, onCreated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({ title: '', description: '', claimOpensAt: '' });

  const [rawFile, setRawFile]           = useState(null);
  const [cropSrc, setCropSrc]           = useState(null);
  const [croppedBlob, setCroppedBlob]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [bgColor,   setBgColor]   = useState('#F2BFB4');
  const [fontColor, setFontColor] = useState('#3B2028');
  const [fontStyle, setFontStyle] = useState(FONT_OPTIONS[0]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFileSelected = (file) => {
    setRawFile(file);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = (blob) => {
    setCroppedBlob(blob);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(blob));
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setRawFile(null);
  };

  const handleCropCancel = () => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setRawFile(null);
  };

  const handleClearImage = () => {
    setCroppedBlob(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim())  { toast.error('Dá um título pro set!'); return; }
    if (!form.claimOpensAt)  { toast.error('Defina quando o claim abre!'); return; }
    if (!croppedBlob)        { toast.error('Selecione uma imagem para o set!'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title',           form.title.trim());
      formData.append('claimOpensAt',    new Date(form.claimOpensAt).toISOString());
      formData.append('backgroundColor', bgColor);
      formData.append('fontColor',       fontColor);
      formData.append('fontStyle',       fontStyle.value);
      formData.append('image',           croppedBlob, 'set-image.jpg');
      if (form.description.trim()) formData.append('description', form.description.trim());

      const newSet = await setsApi.create(formData);
      onCreated(newSet);
    } catch (err) {
      toast.error(err?.message || 'Erro ao criar o set.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="card modal" style={{ maxWidth: 520, overflowY: 'auto' }}>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.35rem' }}>{step === 1 ? 'Informações do set' : 'Visual do post'}</h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[1, 2].map((s) => (
                  <div key={s} style={{ width: 28, height: 4, borderRadius: 2, background: step >= s ? 'var(--rose)' : 'var(--gray-light)', transition: 'background 0.2s' }} />
                ))}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label>Título *</label>
                <input className="input" placeholder="ex: BTS Butter — Junho 2025" value={form.title}
                  onChange={(e) => setF('title', e.target.value)} autoFocus />
              </div>

              <ImageUploadField
                imagePreview={imagePreview}
                onFileSelected={handleFileSelected}
                onClear={handleClearImage}
                required
              />

              <div className="field">
                <label>Descrição / detalhes</label>
                <textarea className="input" placeholder={"Insira suas observações e comentários que você considera\nnecessários sobre o set."}
                  value={form.description} onChange={(e) => setF('description', e.target.value)}  
                  rows={4} style={{ resize: 'vertical' }} />
              </div>

              <button className="btn btn-primary" onClick={() => setStep(2)}
                disabled={!form.title.trim() || !croppedBlob}
                style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Próximo: Visual
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Live preview */}
              <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1.5px solid var(--card-border)' }}>
                <div style={{ background: bgColor, padding: '20px 18px', transition: 'background 0.2s' }}>
                  {imagePreview && (
                    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                      <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ fontFamily: fontStyle.css, fontSize: '1.1rem', fontWeight: 700, color: fontColor }}>
                    {form.title || 'Título do set'}
                  </div>
                </div>
              </div>

              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={14} strokeWidth={2} />
                  Cor de fundo
                </label>
                <ColorPicker presets={BG_PRESETS} value={bgColor} onChange={setBgColor} />
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={14} strokeWidth={2} />
                  Cor do texto
                </label>
                <ColorPicker presets={FONT_COLOR_PRESETS} value={fontColor} onChange={setFontColor} />
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Type size={14} strokeWidth={2} />
                  Fonte do título
                </label>
                <FontSelector value={fontStyle.value} onChange={(opt) => setFontStyle(opt)} previewText={form.title || 'Título do set'} />
                </div>
                
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} strokeWidth={2} />
                  Claim abre em *
                </label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.claimOpensAt}
                  onChange={(e) => setF('claimOpensAt', e.target.value)}
                  style={{ colorScheme: 'light' }}
                />
                <span style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>
                  O stream em tempo real abre automaticamente 10 min antes e depois deste horário.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ChevronLeft size={16} strokeWidth={2.5} />
                  Voltar
                </button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading
                    ? <><Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Criando...</>
                    : <><Check size={16} strokeWidth={2.5} /> Criar set</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          shape="rect"
          aspect={16 / 9}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}