import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * ImageCropModal
 *
 * Props:
 *  - src: string (objectURL da imagem)
 *  - shape: 'rect' | 'circle'   (padrão: 'rect')
 *  - aspect: number             (padrão: 16/9 para rect, 1 para circle)
 *  - onConfirm: (blob) => void
 *  - onCancel: () => void
 */
export default function ImageCropModal({
  src,
  shape = 'rect',
  aspect,
  onConfirm,
  onCancel,
}) {
  const defaultAspect = aspect ?? (shape === 'circle' ? 1 : 16 / 9);

  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const canvasRef    = useRef(null);

  // naturalWidth/Height da imagem
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  // Dimensões do container de exibição (display)
  const [dispSize, setDispSize] = useState({ w: 0, h: 0 });
  // Crop em coordenadas de DISPLAY (pixels na tela)
  const [crop, setCrop] = useState(null); // { x, y, w, h }
  const dragRef  = useRef(null); // { mode, startX, startY, origCrop }
  const [rendering, setRendering] = useState(false);

  // ── Calcula tamanho do container de display ──
  const measureContainer = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDispSize({ w: rect.width, h: rect.height });
  }, []);

  useEffect(() => {
    measureContainer();
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, [measureContainer]);

  // ── Quando a imagem carrega, inicializa o crop centralizado ──
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    // Calcula crop inicial que ocupa 80% da menor dimensão
    let cw2, ch2;
    if (defaultAspect >= 1) {
      cw2 = cw * 0.8;
      ch2 = cw2 / defaultAspect;
    } else {
      ch2 = ch * 0.8;
      cw2 = ch2 * defaultAspect;
    }
    // Garante que não ultrapassa o container
    if (cw2 > cw * 0.9) { cw2 = cw * 0.9; ch2 = cw2 / defaultAspect; }
    if (ch2 > ch * 0.9) { ch2 = ch * 0.9; cw2 = ch2 * defaultAspect; }

    setCrop({
      x: (cw - cw2) / 2,
      y: (ch - ch2) / 2,
      w: cw2,
      h: ch2,
    });
  };

  // ── Helpers de clamp ──
  const clampCrop = useCallback((c, cw, ch) => {
    let { x, y, w, h } = c;
    // mantém aspect
    h = w / defaultAspect;
    // clamp tamanho mínimo
    const minSize = 40;
    if (w < minSize) { w = minSize; h = w / defaultAspect; }
    if (h < minSize) { h = minSize; w = h * defaultAspect; }
    // clamp posição
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > cw) x = cw - w;
    if (y + h > ch) y = ch - h;
    // clamp de novo depois de ajustar posição
    if (w > cw) { w = cw; h = w / defaultAspect; }
    if (h > ch) { h = ch; w = h * defaultAspect; }
    return { x, y, w, h };
  }, [defaultAspect]);

  // ── Drag: mover ou redimensionar ──
  const getHandleAt = (mx, my, c) => {
    const HIT = 14;
    const corners = [
      { name: 'nw', cx: c.x,       cy: c.y },
      { name: 'ne', cx: c.x + c.w, cy: c.y },
      { name: 'sw', cx: c.x,       cy: c.y + c.h },
      { name: 'se', cx: c.x + c.w, cy: c.y + c.h },
    ];
    for (const corner of corners) {
      if (Math.abs(mx - corner.cx) < HIT && Math.abs(my - corner.cy) < HIT) {
        return corner.name;
      }
    }
    // inside crop = move
    if (mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h) return 'move';
    return null;
  };

  const toContainerCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (!crop) return;
    e.preventDefault();
    const { x, y } = toContainerCoords(e);
    const mode = getHandleAt(x, y, crop);
    if (!mode) return;
    dragRef.current = { mode, startX: x, startY: y, origCrop: { ...crop } };
  };

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !crop) return;
    e.preventDefault();
    const { x: mx, y: my } = toContainerCoords(e);
    const { mode, startX, startY, origCrop: o } = dragRef.current;
    const dx = mx - startX;
    const dy = my - startY;
    const cw = containerRef.current?.clientWidth  || dispSize.w;
    const ch = containerRef.current?.clientHeight || dispSize.h;

    let next = { ...o };

    if (mode === 'move') {
      next.x = o.x + dx;
      next.y = o.y + dy;
    } else {
      // Resize — anchor oposto ao handle
      if (mode === 'se') {
        next.w = o.w + dx;
      } else if (mode === 'sw') {
        next.x = o.x + dx;
        next.w = o.w - dx;
      } else if (mode === 'ne') {
        next.y = o.y + dy;
        next.h = o.h - dy;
        next.w = next.h * defaultAspect;
      } else if (mode === 'nw') {
        next.x = o.x + dx;
        next.y = o.y + dy;
        next.w = o.w - dx;
        next.h = next.w / defaultAspect;
      }
      // Keep aspect
      next.h = next.w / defaultAspect;
    }

    setCrop(clampCrop(next, cw, ch));
  }, [crop, dispSize, clampCrop, defaultAspect]);

  const onPointerUp = () => { dragRef.current = null; };

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointerMove]);

  // ── Cursor baseado na posição do mouse ──
  const getCursor = useCallback((e) => {
    if (!crop || !containerRef.current) return;
    const { x, y } = toContainerCoords(e);
    const handle = getHandleAt(x, y, crop);
    const cursors = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', move: 'move' };
    containerRef.current.style.cursor = cursors[handle] || 'default';
  }, [crop]);

  // ── Confirmar: renderiza no canvas e gera blob ──
  const handleConfirm = useCallback(() => {
    if (!crop || !imgRef.current || !canvasRef.current) return;
    setRendering(true);

    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    // Escala: proporção display → natural
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;
    // Offset da imagem dentro do container (object-fit: contain)
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const imgOffX = (containerW - dispW) / 2;
    const imgOffY = (containerH - dispH) / 2;

    const scaleX = natW / dispW;
    const scaleY = natH / dispH;

    // Crop em pixels naturais
    const natCropX = (crop.x - imgOffX) * scaleX;
    const natCropY = (crop.y - imgOffY) * scaleY;
    const natCropW = crop.w * scaleX;
    const natCropH = crop.h * scaleY;

    // Tamanho de saída (max 1200px)
    const outMax = 1200;
    const outW = Math.min(natCropW, outMax);
    const outH = outW / defaultAspect;

    const canvas = canvasRef.current;
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, natCropX, natCropY, natCropW, natCropH, 0, 0, outW, outH);

    canvas.toBlob((blob) => {
      setRendering(false);
      onConfirm(blob);
    }, 'image/jpeg', 0.9);
  }, [crop, shape, defaultAspect, onConfirm]);

  // ── Render ──
  const c = crop;

  // Cursor style para handles
  const handleStyle = (corner) => {
    const pos = {
      nw: { top: -8,       left: -8 },
      ne: { top: -8,       right: -8 },
      sw: { bottom: -8,    left: -8 },
      se: { bottom: -8,    right: -8 },
    }[corner];
    return {
      position: 'absolute',
      width: 18,
      height: 18,
      background: 'white',
      border: '2.5px solid var(--rose)',
      borderRadius: shape === 'circle' ? '50%' : 4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      zIndex: 10,
      ...pos,
    };
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1100, alignItems: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 600,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'scale-in 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1.5px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
              ✂️ Recortar imagem
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray)' }}>
              Arraste os cantos para redimensionar · Arraste dentro para mover
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: 360,
            background: '#1A0A2E',
            overflow: 'hidden',
            flexShrink: 0,
            userSelect: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={getCursor}
          onTouchStart={onPointerDown}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={handleImgLoad}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            alt="crop"
            draggable={false}
          />

          {/* Overlay escuro fora do crop */}
          {c && (
            <>
              {/* Top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: c.y, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Bottom */}
              <div style={{ position: 'absolute', top: c.y + c.h, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Left */}
              <div style={{ position: 'absolute', top: c.y, left: 0, width: c.x, height: c.h, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Right */}
              <div style={{ position: 'absolute', top: c.y, left: c.x + c.w, right: 0, height: c.h, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />

              {/* Crop border + handles */}
              <div
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  width: c.w,
                  height: c.h,
                  border: '2px solid white',
                  borderRadius: shape === 'circle' ? '50%' : 6,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              >
                {/* Grid lines (rule of thirds) */}
                {shape !== 'circle' && (
                  <>
                    <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  </>
                )}
              </div>

              {/* Handles (pointer-events: all) */}
              {['nw','ne','sw','se'].map((h) => (
                <div key={h} style={{
                  ...handleStyle(h),
                  left: h.includes('w') ? c.x - 9 : undefined,
                  right: h.includes('e') ? (containerRef.current?.clientWidth - c.x - c.w - 9) : undefined,
                  top:    h.includes('n') ? c.y - 9 : undefined,
                  bottom: h.includes('s') ? (containerRef.current?.clientHeight - c.y - c.h - 9) : undefined,
                  position: 'absolute',
                }} />
              ))}
            </>
          )}
        </div>

        {/* Hidden canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1.5px solid var(--card-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!crop || rendering} style={{ flex: 2 }}>
            {rendering
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : 'Confirmar recorte'
            }
          </button>
        </div>
      </div>
    </div>
  );
}