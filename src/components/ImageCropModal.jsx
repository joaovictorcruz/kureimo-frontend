import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Compõe uma imagem (possivelmente com áreas transparentes, sobrando "vão" na
 * moldura) sobre um fundo sólido.
 *
 * Usado para aplicar a cor de fundo do post na imagem final do set — sempre
 * com a cor MAIS ATUAL (a que está selecionada no momento de salvar), e não
 * a cor que estava selecionada no momento em que o recorte em si foi feito.
 * Isso evita que a imagem fique com uma cor "presa" de um estado antigo do
 * formulário.
 *
 * A saída é sempre JPEG: depois de composta com uma cor de fundo sólida, a
 * imagem não tem mais nenhuma área transparente, então não há motivo pra
 * pagar o preço (arquivo bem maior) de manter PNG — JPEG comprime fotografia
 * com detalhe de forma muito mais eficiente.
 */
export function compositeWithBackground(blob, bgColor) {
  return new Promise((resolve, reject) => {
    if (!blob || !bgColor) { resolve(blob); return; }

    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((finalBlob) => {
        URL.revokeObjectURL(url);
        if (finalBlob) resolve(finalBlob);
        else reject(new Error('Falha ao compor a imagem final.'));
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a imagem para composição.'));
    };

    img.src = url;
  });
}

// Enquadramento inicial "cover": centraliza a imagem cobrindo o frame inteiro.
// Usado tanto no primeiro carregamento quanto no botão de redefinir.
function computeCoverBox(natW, natH, fw, fh) {
  const scale = Math.max(fw / natW, fh / natH);
  const w = natW * scale;
  const h = natH * scale;
  return { x: (fw - w) / 2, y: (fh - h) / 2, w, h };
}

/**
 * Corrige um retângulo de origem (sx, sy, sw, sh) que se estende PRA FORA dos
 * limites naturais da imagem (sx/sy negativos, ou sx+sw/sy+sh além de
 * natW/natH) — situação que acontece sempre que a imagem foi encolhida
 * dentro da moldura, deixando "vão" visível de um ou mais lados.
 *
 * Isso é necessário por causa de um bug conhecido do WebKit/Safari (iOS
 * Safari e qualquer navegador em iOS, já que todos usam a mesma engine): o
 * Canvas 2D drawImage() com sx/sy negativos NÃO reposiciona a origem como
 * define a spec (e como Chrome/Firefox fazem) — em vez disso o Safari
 * "zera" a origem pra (0,0) e, com isso, desloca o corte inteiro pro canto
 * superior esquerdo da imagem original, ignorando a posição/tamanho reais
 * que o usuário ajustou. É exatamente o comportamento visto em mobile:
 * a imagem "salta" de volta pro canto superior esquerdo ao confirmar.
 * https://bugs.webkit.org/show_bug.cgi?id=... (bug histórico e recorrente
 * de drawImage com sub-retângulo parcialmente fora da imagem no WebKit)
 *
 * A correção: nunca passar sx/sy negativos (nem sw/sh que estourem
 * natW/natH) pro drawImage. Em vez disso, recorta-se o retângulo de origem
 * pra caber dentro da imagem real, e desloca/encolhe proporcionalmente o
 * retângulo de destino (dx/dy/dw/dh) pra compensar — o resultado visual é
 * idêntico (o "vão" continua saindo transparente/preto, só que calculado
 * a partir do destino em vez de pedir uma origem inválida pro navegador).
 */
function clampSourceRect(sx, sy, sw, sh, natW, natH, dx, dy, dw, dh) {
  let rSx = sx, rSy = sy, rSw = sw, rSh = sh;
  let rDx = dx, rDy = dy, rDw = dw, rDh = dh;

  // Eixo X — corta o que sobra à esquerda (sx < 0)
  if (rSw > 0 && rSx < 0) {
    const cut = -rSx;
    const frac = Math.min(1, cut / rSw);
    rDx += frac * rDw;
    rDw -= frac * rDw;
    rSw += rSx; // rSx é negativo, então isso reduz rSw em `cut`
    rSx = 0;
  }
  // Eixo X — corta o que sobra à direita (sx + sw > natW)
  if (rSw > 0 && rSx + rSw > natW) {
    const over = rSx + rSw - natW;
    const frac = Math.min(1, over / rSw);
    rDw -= frac * rDw;
    rSw -= over;
  }
  // Eixo Y — corta o que sobra em cima (sy < 0)
  if (rSh > 0 && rSy < 0) {
    const cut = -rSy;
    const frac = Math.min(1, cut / rSh);
    rDy += frac * rDh;
    rDh -= frac * rDh;
    rSh += rSy;
    rSy = 0;
  }
  // Eixo Y — corta o que sobra embaixo (sy + sh > natH)
  if (rSh > 0 && rSy + rSh > natH) {
    const over = rSy + rSh - natH;
    const frac = Math.min(1, over / rSh);
    rDh -= frac * rDh;
    rSh -= over;
  }

  return {
    sx: rSx, sy: rSy,
    sw: Math.max(0, rSw), sh: Math.max(0, rSh),
    dx: rDx, dy: rDy,
    dw: Math.max(0, rDw), dh: Math.max(0, rDh),
  };
}

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
 *  - bgColor: string?           (cor de fundo do post — usada só como pano de
 *                                 fundo visual da área de edição, pra você já
 *                                 ver a cor certa enquanto ajusta a imagem.
 *                                 O "vão" da imagem final SEMPRE sai
 *                                 transparente daqui pra shape="rect"; quem
 *                                 aplica a cor de verdade é o
 *                                 compositeWithBackground(), no momento de
 *                                 salvar. Não é usada para shape="circle".)
 *  - onConfirm: (blob) => void
 *  - onCancel: () => void
 */
export default function ImageCropModal({
  src,
  shape = 'rect',
  aspect,
  crossOrigin,
  bgColor,
  onConfirm,
  onCancel,
}) {
  const defaultAspect = aspect ?? (shape === 'circle' ? 1 : 16 / 9);

  const frameRef  = useRef(null); // wrapper NÃO clipado — onde ficam bordas/handles
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  // Posição/tamanho da IMAGEM em pixels de tela, relativos ao frame
  const [imgBox, setImgBox] = useState(null); // { x, y, w, h }
  const [frameSize, setFrameSize] = useState(null); // { w, h } — só pra desenhar as alças
  // Espelha imgBox num ref, lido durante o arrasto — evita que onPointerMove
  // precise de imgBox no closure (o que forçava recriar a função — e
  // reanexar os listeners da window — a cada frame do arrasto).
  const imgBoxRef = useRef(null);
  // Tamanho da moldura MEDIDO UMA ÚNICA VEZ, no carregamento da imagem, e
  // reaproveitado em todo o resto (arrasto, redefinir, e principalmente na
  // hora de confirmar). Isso é de propósito: remedir a moldura via
  // getBoundingClientRect() em momentos diferentes (durante o ajuste vs. no
  // clique em "Confirmar") é sensível a pequenas variações de layout comuns
  // em celular (barra de endereço, teclado, etc.) — se a medida usada pra
  // posicionar a imagem na tela for diferente da medida usada pra calcular o
  // recorte final, o resultado sai deslocado em relação ao que foi mostrado
  // durante o ajuste. Usar sempre a MESMA medida elimina essa divergência.
  const frameSizeRef = useRef(null);
  const dragRef = useRef(null); // { mode, startX, startY, origBox }
  const [rendering, setRendering] = useState(false);
  const [ready, setReady] = useState(false);

  const updateImgBox = (box) => {
    imgBoxRef.current = box;
    setImgBox(box);
  };

  // ── Alças ficam um pouco fora da moldura visível pra sempre estarem
  //     alcançáveis — só que isso só funciona se a área que "escuta" cliques
  //     também cobrir essa faixa. Por isso o frame tem `padding: HANDLE_MARGIN`
  //     (box-sizing content-box: o padding fica FORA do tamanho especificado,
  //     então a proporção da imagem final não é afetada) — a getBoundingClientRect()
  //     do frame já inclui esse padding, e por isso é sempre subtraído abaixo. ──
  const HANDLE_MARGIN = 28;

  // Medição FRESCA e completa (posição + tamanho) — usada só na primeira
  // medição, quando ainda não existe nada em frameSizeRef pra reaproveitar.
  const measureFrameRect = () => {
    const r = frameRef.current.getBoundingClientRect();
    return {
      left: r.left + HANDLE_MARGIN,
      top: r.top + HANDLE_MARGIN,
      width: r.width - HANDLE_MARGIN * 2,
      height: r.height - HANDLE_MARGIN * 2,
    };
  };

  // Posição atual da moldura na tela (isso sim precisa ser sempre fresco —
  // é o que muda legitimamente se a página rolar durante o arrasto).
  const getFramePos = () => {
    const r = frameRef.current.getBoundingClientRect();
    return { left: r.left + HANDLE_MARGIN, top: r.top + HANDLE_MARGIN };
  };

  // ── Reseta o estado sempre que a imagem (src) mudar — mesmo que o componente
  //     seja reaproveitado sem desmontar entre duas sessões de recorte diferentes ──
  useEffect(() => {
    updateImgBox(null);
    setFrameSize(null);
    frameSizeRef.current = null;
    setReady(false);
    dragRef.current = null;
  }, [src]);

  // ── Quando a imagem carrega: centraliza cobrindo o frame inteiro (estilo "cover").
  //     Adia a medição pro próximo frame — a imagem (objectURL) às vezes carrega tão
  //     rápido que o layout do frame (aspect-ratio) ainda não tinha terminado, e aí a
  //     medição vinha errada, fazendo a imagem cair pro tamanho real dela sem escala. ──
  const handleImgLoad = () => {
    const measure = (attemptsLeft) => {
      const img = imgRef.current;
      if (!img || !frameRef.current) return;
      const { width: fw, height: fh } = measureFrameRect();

      if ((!fw || !fh) && attemptsLeft > 0) {
        requestAnimationFrame(() => measure(attemptsLeft - 1));
        return;
      }

      frameSizeRef.current = { w: fw, h: fh };
      setFrameSize({ w: fw, h: fh });
      updateImgBox(computeCoverBox(img.naturalWidth, img.naturalHeight, fw, fh));
      setReady(true);
    };

    requestAnimationFrame(() => measure(5));
  };

  // ── Redefinir: volta a imagem pro enquadramento inicial (cover, centralizada),
  //     desfazendo qualquer arrasto/redimensionamento acidental sem perder
  //     nada da imagem original — ela nunca foi alterada, só a posição dela. ──
  const handleReset = () => {
    const img = imgRef.current;
    if (!img || !frameSizeRef.current) return;
    const { w: fw, h: fh } = frameSizeRef.current;
    updateImgBox(computeCoverBox(img.naturalWidth, img.naturalHeight, fw, fh));
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

  // ── Pontos das alças, sempre presos numa faixa alcançável perto da moldura —
  //     mesmo quando a imagem é bem maior e o canto real dela está longe daqui.
  //     O arrasto usa a posição do MOUSE (delta), não a da alça, então isso não
  //     afeta o redimensionamento em si, só onde a bolinha fica visível/clicável. ──
  const clampHandleCoord = (v, max) => Math.max(-HANDLE_MARGIN, Math.min(max + HANDLE_MARGIN, v));

  const getHandlePoints = (b, fw, fh) => {
    let left   = clampHandleCoord(b.x, fw);
    let right  = clampHandleCoord(b.x + b.w, fw);
    let top    = clampHandleCoord(b.y, fh);
    let bottom = clampHandleCoord(b.y + b.h, fh);

    // Evita que duas alças opostas fiquem grudadas/sobrepostas — cada uma
    // precisa de uma área própria pra ser clicável com folga
    const MIN_GAP = 46;
    if (right - left < MIN_GAP) {
      const mid = (right + left) / 2;
      left = mid - MIN_GAP / 2;
      right = mid + MIN_GAP / 2;
    }
    if (bottom - top < MIN_GAP) {
      const mid = (bottom + top) / 2;
      top = mid - MIN_GAP / 2;
      bottom = mid + MIN_GAP / 2;
    }

    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return {
      nw: { x: left,  y: top },
      n:  { x: midX,  y: top },
      ne: { x: right, y: top },
      e:  { x: right, y: midY },
      se: { x: right, y: bottom },
      s:  { x: midX,  y: bottom },
      sw: { x: left,  y: bottom },
      w:  { x: left,  y: midY },
    };
  };

  // ── Detecta em qual alça (ou "mover") o ponteiro está ──
  const getHandleAt = (mx, my, b, fw, fh) => {
    const HIT = 20;
    const points = getHandlePoints(b, fw, fh);
    for (const name of Object.keys(points)) {
      const p = points[name];
      if (Math.abs(mx - p.x) < HIT && Math.abs(my - p.y) < HIT) return name;
    }
    if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) return 'move';
    return null;
  };

  // ── Correção de zoom do Safari/WebKit mobile ────────────────────────────
  // getBoundingClientRect() é sempre relativo ao viewport de LAYOUT. Em
  // certas condições no WebKit iOS (usado por baixo tanto no Safari quanto
  // no Chrome/Firefox pra iOS — é exigência da Apple), o clientX/clientY
  // reportado pelo toque pode vir relativo ao viewport VISUAL, que só
  // diverge do viewport de layout quando há zoom/pan ativo (comum quando um
  // campo de texto com font-size < 16px foi focado pouco antes). Sem
  // correção, os dois sistemas de coordenadas ficam dessincronizados.
  // window.visualViewport dá esse deslocamento diretamente; no caso normal
  // (sem zoom) ele é 0, então essa correção não tem efeito nenhum fora dessa
  // situação específica.
  const getViewportCorrection = () => {
    const vv = window.visualViewport;
    if (!vv) return { dx: 0, dy: 0 };
    return { dx: vv.offsetLeft, dy: vv.offsetTop };
  };

  const toFrameCoords = (e) => {
    const { left, top } = getFramePos();
    const { dx, dy } = getViewportCorrection();
    return { x: e.clientX + dx - left, y: e.clientY + dy - top };
  };

  // Tira o foco de qualquer campo de texto que tenha ficado ativo antes de
  // abrir este modal (ex: título/descrição do set) — ajuda o Safari a
  // desfazer o zoom automático de foco antes do usuário começar a arrastar.
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // ── Arrasto: unificado em Pointer Events (cobre mouse, touch e caneta com
  //     a mesma API). Não duplica em onTouchStart/touchmove/touchend — ter os
  //     dois sistemas escutando o mesmo gesto ao mesmo tempo é uma fonte
  //     clássica de comportamento errático em touch. ──
  const onPointerDown = (e) => {
    if (!imgBoxRef.current || !frameSizeRef.current) return;
    e.preventDefault();
    const { x, y } = toFrameCoords(e);
    const { w: fw, h: fh } = frameSizeRef.current;
    const mode = getHandleAt(x, y, imgBoxRef.current, fw, fh);
    if (!mode) return;
    frameRef.current?.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, startX: x, startY: y, origBox: { ...imgBoxRef.current } };
  };

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !imgBoxRef.current || !frameSizeRef.current) return;
    e.preventDefault();
    const { x: mx, y: my } = toFrameCoords(e);
    const { mode, startX, startY, origBox: o } = dragRef.current;
    const dx = mx - startX;
    const dy = my - startY;
    const { w: fw, h: fh } = frameSizeRef.current;

    let next = { ...o };

    if (mode === 'move') {
      next.x = o.x + dx;
      next.y = o.y + dy;
    } else if (mode.length === 2) {
      // Alça de canto: redimensiona proporcionalmente (mantém a proporção da
      // imagem, sem distorcer), ancorada no canto oposto ao que está sendo arrastado
      const signX = mode.includes('e') ? 1 : -1;
      const signY = mode.includes('s') ? 1 : -1;
      const avgDelta = (dx * signX + dy * signY) / 2;
      const scale = Math.max(0.02, (o.w + avgDelta) / o.w);
      const newW = o.w * scale;
      const newH = o.h * scale;
      const anchorX = signX === 1 ? o.x : o.x + o.w;
      const anchorY = signY === 1 ? o.y : o.y + o.h;
      next.w = newW;
      next.h = newH;
      next.x = signX === 1 ? anchorX : anchorX - newW;
      next.y = signY === 1 ? anchorY : anchorY - newH;
    } else {
      // Alça de borda: só move o eixo correspondente — a outra dimensão fica travada
      if (mode === 'e') next.w = o.w + dx;
      if (mode === 'w') { next.w = o.w - dx; next.x = o.x + dx; }
      if (mode === 's') next.h = o.h + dy;
      if (mode === 'n') { next.h = o.h - dy; next.y = o.y + dy; }
    }

    updateImgBox(clampBox(next, fw, fh));
  }, [clampBox]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const getCursor = useCallback((e) => {
    if (!imgBoxRef.current || !frameSizeRef.current || !frameRef.current) return;
    const { x, y } = toFrameCoords(e);
    const { w: fw, h: fh } = frameSizeRef.current;
    const handle = getHandleAt(x, y, imgBoxRef.current, fw, fh);
    const cursors = {
      nw: 'nwse-resize', se: 'nwse-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      n: 'ns-resize', s: 'ns-resize',
      e: 'ew-resize', w: 'ew-resize',
      move: 'move',
    };
    frameRef.current.style.cursor = cursors[handle] || 'default';
  }, []);

  // ── Confirmar: renderiza no canvas exatamente o que está visível no frame,
  //     usando a MESMA medida de moldura (frameSizeRef) usada durante todo o
  //     ajuste — nunca remede na hora de confirmar, pra não correr o risco de
  //     pegar um valor diferente do que foi mostrado na tela.
  //
  //     Para shape="rect" (imagem do set), o "vão" (espaço não coberto pela
  //     imagem, se ela foi encolhida) fica transparente aqui de propósito —
  //     quem aplica a cor de fundo do post é o compositeWithBackground(), no
  //     momento de salvar, sempre com a cor mais atual. Por isso a saída
  //     continua sendo PNG (precisa preservar a transparência pra isso
  //     funcionar depois).
  //
  //     Para shape="circle" (foto de perfil), não existe nenhuma etapa de
  //     composição posterior — o círculo final já é sempre recortado
  //     visualmente via CSS (border-radius) em todo lugar que a foto
  //     aparece, então a transparência do PNG nunca fazia diferença nenhuma
  //     ali. A saída sai direto em JPEG, bem mais leve pra fotografia. ──
  const handleConfirm = useCallback(() => {
    if (!imgBox || !imgRef.current || !canvasRef.current || !frameSizeRef.current) return;
    setRendering(true);

    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const { w: fw, h: fh } = frameSizeRef.current;

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
      // JPEG não tem canal alpha — preenche explicitamente de preto o que
      // sobrar fora do círculo (e qualquer "vão", se a imagem foi encolhida),
      // em vez de depender do comportamento padrão de cada navegador.
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outW, outH);
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // ── FIX (bug do drawImage no Safari/iOS) ───────────────────────────
    // Sempre que a imagem foi encolhida dentro da moldura (natCropX/Y < 0
    // ou natCropW/H > natW/H), o retângulo de origem calculado acima "vaza"
    // pra fora dos limites reais da imagem. No Chrome/Firefox isso é
    // tratado corretamente (a origem é reposicionada como manda a spec),
    // mas no WebKit/Safari (todo navegador em iOS) a origem negativa é
    // zerada e o corte inteiro salta pro canto superior esquerdo da
    // imagem original — exatamente o bug relatado só em mobile. Por isso
    // NUNCA passamos um retângulo de origem fora dos limites da imagem pro
    // drawImage: ele é recortado aqui, e o retângulo de destino é ajustado
    // na mesma proporção pra preservar visualmente o mesmo resultado
    // (o "vão" continua saindo transparente/preto do mesmo jeito).
    const clamped = clampSourceRect(
      natCropX, natCropY, natCropW, natCropH,
      natW, natH,
      0, 0, outW, outH,
    );

    if (clamped.sw > 0 && clamped.sh > 0 && clamped.dw > 0 && clamped.dh > 0) {
      ctx.drawImage(
        img,
        clamped.sx, clamped.sy, clamped.sw, clamped.sh,
        clamped.dx, clamped.dy, clamped.dw, clamped.dh,
      );
    }

    const mimeType = shape === 'circle' ? 'image/jpeg' : 'image/png';
    const quality  = shape === 'circle' ? 0.9 : undefined;

    canvas.toBlob((blob) => {
      setRendering(false);
      onConfirm(blob);
    }, mimeType, quality);
  }, [imgBox, shape, onConfirm]);

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const handleStyle = (name) => {
    const b = imgBox;
    if (!b || !frameSize) return { display: 'none' };
    const pos = getHandlePoints(b, frameSize.w, frameSize.h)[name];
    return {
      position: 'absolute',
      left: HANDLE_MARGIN + pos.x - 11,
      top: HANDLE_MARGIN + pos.y - 11,
      width: 22,
      height: 22,
      background: 'white',
      border: '3px solid var(--rose)',
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
              Cantos redimensionam proporcionalmente · bordas esticam um lado só · arraste dentro pra mover
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleReset}
              disabled={!ready}
              title="Redefinir posição e tamanho"
              style={{ padding: '6px 10px' }}
            >
              <RotateCcw size={15} strokeWidth={2} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: '6px 10px' }}>✕</button>
          </div>
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
              padding: HANDLE_MARGIN,
              boxSizing: 'content-box',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={getCursor}
          >
            {/* Viewport clipado — só o que está aqui dentro entra no resultado final.
                inset = HANDLE_MARGIN pra alinhar com a caixa de conteúdo (a moldura de
                verdade), já que o container posicionado inclui o padding também.
                O fundo reflete a bgColor do post (quando informada) só pra já mostrar
                aqui, durante a edição, como vai ficar o "vão" depois de composto. */}
            <div
              style={{
                position: 'absolute',
                inset: HANDLE_MARGIN,
                overflow: 'hidden',
                borderRadius: shape === 'circle' ? '50%' : 8,
                background: bgColor || '#0d0518',
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

            {/* Borda — mesmo inset acima, fica exatamente na borda da moldura real */}
            <div
              style={{
                position: 'absolute',
                inset: HANDLE_MARGIN,
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