// Mockup interativo e fluido da interface do ZReader.
// Gerencia a escala vetorial precisa via ResizeObserver, flutuação e tilt 3D com LERP.

export function initMock() {
  const stage = document.querySelector('.mock-stage');
  const mockContainer = document.querySelector('.mock');
  const tiltEl = document.querySelector('.mock-tilt');
  const floatEl = document.querySelector('.mock-float');

  if (!mockContainer || !tiltEl || !stage) return;

  // 1. Escala Fluida via ResizeObserver
  const updateScale = () => {
    const isCompact = window.innerWidth < 720;
    const targetW = isCompact ? 760 : 1280;
    const targetH = isCompact ? 720 : 800;

    const containerW = mockContainer.clientWidth;
    if (containerW <= 0) return;

    const scale = containerW / targetW;

    mockContainer.style.setProperty('--mock-w', targetW);
    mockContainer.style.setProperty('--mock-h', targetH);
    mockContainer.style.setProperty('--mock-scale', scale.toFixed(5));

    if (!mockContainer.classList.contains('is-ready')) {
      mockContainer.classList.add('is-ready');
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    updateScale();
  });
  resizeObserver.observe(mockContainer);
  window.addEventListener('resize', updateScale, { passive: true });
  updateScale();

  // 2. Pausa da flutuação quando fora do viewport ou aba em segundo plano
  if (floatEl) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      floatEl.style.animationPlayState = entry.isIntersecting && !document.hidden ? 'running' : 'paused';
    }, { threshold: 0.05 });
    visibilityObserver.observe(stage);

    document.addEventListener('visibilitychange', () => {
      floatEl.style.animationPlayState = !document.hidden ? 'running' : 'paused';
    });
  }

  // 3. Efeito 3D Tilt suave com LERP (apenas mouse fino e sem reduced-motion)
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canHover && !prefersReduced) {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let isMoving = false;
    let rafId = null;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const tiltLoop = () => {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);

      tiltEl.style.transform = `rotateX(${currentX.toFixed(3)}deg) rotateY(${currentY.toFixed(3)}deg)`;

      // Continua rodando se ainda houver diferença perceptível ou cursor sobre o elemento
      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01 || isMoving) {
        rafId = requestAnimationFrame(tiltLoop);
      } else {
        tiltEl.style.transform = 'none';
        rafId = null;
      }
    };

    stage.addEventListener('pointerenter', () => {
      isMoving = true;
      if (!rafId) rafId = requestAnimationFrame(tiltLoop);
    });

    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const xNorm = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 a 0.5
      const yNorm = (e.clientY - rect.top) / rect.height - 0.5;

      // Limita a inclinação a 3 graus
      targetX = -yNorm * 3;
      targetY = xNorm * 3;

      if (!rafId) rafId = requestAnimationFrame(tiltLoop);
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
      isMoving = false;
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(tiltLoop);
    });
  }
}
