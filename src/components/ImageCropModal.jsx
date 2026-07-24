import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * ImageCropModal
 *
 * Modelo: a moldura (o quadro onde a imagem final vai aparecer) tem tamanho
 * FIXO — sempre na proporção de `aspect`. A imagem em si é livre: pode ser
 * movida e redimensionada (inclusive esticada, sem travar proporção) dentro
 * dessa moldura. Ela nunca pode deixar espaço vazio — o tamanho mínimo dela
 * é sempre o suficiente pra cobrir a moldura inteira.
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
  crossOrigin,
  onConfirm,
  onCancel,
}) {
  const defaultAspect = aspect ?? (shape === 'circle' ? 1 : 16 / 9);

  const frameRef  = useRef(null); // wrapper NÃO clipado — onde ficam bordas/handles
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  // Posição/tamanho da IMAGEM em pixels de tela, relativos ao frame
  const [imgBox, setImgBox] = useState(null); // { x, y, w, h }
  const dragRef = useRef(null); // { mode, startX, startY, origBox }
  const [rendering, setRendering] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Quando a imagem carrega: centraliza cobrindo o frame inteiro (estilo "cover") ──
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img || !frameRef.current) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const { width: fw, height: fh } = frameRef.current.getBoundingClientRect();

    const scale = Math.max(fw / natW, fh / natH);
    const w = natW * scale;
    const h = natH * scale;

    setImgBox({ x: (fw - w) / 2, y: (fh - h) / 2, w, h });
    setReady(true);
  };

  // ── Só evita sumir a imagem de vista — não força mais "cobrir a moldura inteira",
  //     senão (como o encaixe inicial já cobre exatamente) não sobrava espaço pra encolher ──
  const clampBox = useCallback((b, fw, fh) => {
    let { x, y, w, h } = b;
    const minSize = 40;
    if (w < minSize) w = minSize;
    if (h < minSize) h = minSize;
    const maxW = fw * 6;
    const maxH = fh * 6;
    if (w > maxW) w = maxW;
    if (h > maxH) h = maxH;
    // mantém pelo menos um pedaço da imagem visível dentro da moldura
    const minVisible = 24;
    if (x > fw - minVisible) x = fw - minVisible;
    if (y > fh - minVisible) y = fh - minVisible;
    if (x + w < minVisible) x = minVisible - w;
    if (y + h < minVisible) y = minVisible - h;
    return { x, y, w, h };
  }, []);

  // ── Detecta em qual alça (ou "mover") o ponteiro está ──
  const getHandleAt = (mx, my, b) => {
    const HIT = 14;
    const midX = b.x + b.w / 2;
    const midY = b.y + b.h / 2;
    const points = [
      { name: 'nw', px: b.x,       py: b.y },
      { name: 'ne', px: b.x + b.w, py: b.y },
      { name: 'sw', px: b.x,       py: b.y + b.h },
      { name: 'se', px: b.x + b.w, py: b.y + b.h },
      { name: 'n',  px: midX,      py: b.y },
      { name: 's',  px: midX,      py: b.y + b.h },
      { name: 'w',  px: b.x,       py: midY },
      { name: 'e',  px: b.x + b.w, py: midY },
    ];
    for (const p of points) {
      if (Math.abs(mx - p.px) < HIT && Math.abs(my - p.py) < HIT) return p.name;
    }
    if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) return 'move';
    return null;
  };

  const toFrameCoords = (e) => {
    const rect = frameRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (!imgBox) return;
    e.preventDefault();
    const { x, y } = toFrameCoords(e);
    const mode = getHandleAt(x, y, imgBox);
    if (!mode) return;
    dragRef.current = { mode, startX: x, startY: y, origBox: { ...imgBox } };
  };

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !imgBox || !frameRef.current) return;
    e.preventDefault();
    const { x: mx, y: my } = toFrameCoords(e);
    const { mode, startX, startY, origBox: o } = dragRef.current;
    const dx = mx - startX;
    const dy = my - startY;
    const { width: fw, height: fh } = frameRef.current.getBoundingClientRect();

    let next = { ...o };

    if (mode === 'move') {
      next.x = o.x + dx;
      next.y = o.y + dy;
    } else {
      // Redimensiona livremente — largura e altura são independentes, sem travar proporção
      if (mode.includes('e')) next.w = o.w + dx;
      if (mode.includes('w')) { next.w = o.w - dx; next.x = o.x + dx; }
      if (mode.includes('s')) next.h = o.h + dy;
      if (mode.includes('n')) { next.h = o.h - dy; next.y = o.y + dy; }
    }

    setImgBox(clampBox(next, fw, fh));
  }, [imgBox, clampBox]);

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

  const getCursor = useCallback((e) => {
    if (!imgBox || !frameRef.current) return;
    const { x, y } = toFrameCoords(e);
    const handle = getHandleAt(x, y, imgBox);
    const cursors = {
      nw: 'nwse-resize', se: 'nwse-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      n: 'ns-resize', s: 'ns-resize',
      e: 'ew-resize', w: 'ew-resize',
      move: 'move',
    };
    frameRef.current.style.cursor = cursors[handle] || 'default';
  }, [imgBox]);

  // ── Confirmar: renderiza no canvas exatamente o que está visível no frame ──
  const handleConfirm = useCallback(() => {
    if (!imgBox || !imgRef.current || !canvasRef.current || !frameRef.current) return;
    setRendering(true);

    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const { width: fw, height: fh } = frameRef.current.getBoundingClientRect();

    // Escala tela → natural, por eixo (podem ser diferentes, já que a imagem pode estar esticada)
    const scaleX = natW / imgBox.w;
    const scaleY = natH / imgBox.h;

    const natCropX = (0 - imgBox.x) * scaleX;
    const natCropY = (0 - imgBox.y) * scaleY;
    const natCropW = fw * scaleX;
    const natCropH = fh * scaleY;

    // Resolução de saída, mantendo a proporção do frame (o "esticamento" já foi
    // aplicado visualmente e é reproduzido aqui pelo próprio drawImage)
    const outMax = 1200;
    let outW = fw;
    let outH = fh;
    const upscale = outMax / Math.max(outW, outH);
    if (upscale > 1) { outW *= upscale; outH *= upscale; }
    outW = Math.round(outW);
    outH = Math.round(outH);

    const canvas = canvasRef.current;
    canvas.width = outW;
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
  }, [imgBox, shape, onConfirm]);

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const handleStyle = (name) => {
    const b = imgBox;
    if (!b) return { display: 'none' };
    const midX = b.x + b.w / 2;
    const midY = b.y + b.h / 2;
    const pos = {
      nw: { left: b.x,       top: b.y },
      n:  { left: midX,      top: b.y },
      ne: { left: b.x + b.w, top: b.y },
      e:  { left: b.x + b.w, top: midY },
      se: { left: b.x + b.w, top: b.y + b.h },
      s:  { left: midX,      top: b.y + b.h },
      sw: { left: b.x,       top: b.y + b.h },
      w:  { left: b.x,       top: midY },
    }[name];
    return {
      position: 'absolute',
      left: pos.left - 9,
      top: pos.top - 9,
      width: 18,
      height: 18,
      background: 'white',
      border: '2.5px solid var(--rose)',
      borderRadius: '50%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      zIndex: 10,
      pointerEvents: 'none',
    };
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, alignItems: 'center' }}>
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
              Ajustar imagem
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray)' }}>
              Arraste as bordas pra redimensionar livremente · Arraste dentro pra mover
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        {/* Área de ajuste */}
        <div style={{ padding: '28px 24px', background: '#1A0A2E', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div
            ref={frameRef}
            style={{
              position: 'relative',
              width: shape === 'circle' ? 260 : '100%',
              maxWidth: '100%',
              aspectRatio: String(defaultAspect),
              userSelect: 'none',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={getCursor}
            onTouchStart={onPointerDown}
          >
            {/* Viewport clipado — só o que está aqui dentro entra no resultado final */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                borderRadius: shape === 'circle' ? '50%' : 8,
                background: '#0d0518',
              }}
            >
              {imgBox ? (
                <img
                  ref={imgRef}
                  src={src}
                  crossOrigin={crossOrigin}
                  onLoad={handleImgLoad}
                  style={{
                    position: 'absolute',
                    left: imgBox.x,
                    top: imgBox.y,
                    width: imgBox.w,
                    height: imgBox.h,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                  alt="ajustar"
                  draggable={false}
                />
              ) : (
                // Precisa existir mesmo antes do primeiro layout, pra disparar o onLoad
                <img
                  ref={imgRef}
                  src={src}
                  crossOrigin={crossOrigin}
                  onLoad={handleImgLoad}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  alt=""
                  draggable={false}
                />
              )}
            </div>

            {/* Borda + alças — ficam FORA do clip, pra nunca sumir mesmo com a imagem ampliada */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '2px solid white',
                borderRadius: shape === 'circle' ? '50%' : 8,
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            />
            {ready && handles.map((h) => <div key={h} style={handleStyle(h)} />)}
          </div>
        </div>

        {/* Canvas oculto usado só pra gerar o blob final */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1.5px solid var(--card-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!imgBox || rendering} style={{ flex: 2 }}>
            {rendering
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : 'Confirmar'
            }
          </button>
        </div>
      </div>
    </div>
  );
}