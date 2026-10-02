// Mockup interativo e fluido da interface do ZReader com prints reais do app.
// Gerencia a troca de abas (WAI-ARIA Tabs), sincronização com cards de interface,
// flutuação suave e tilt 3D com LERP a 60fps.

export function initMock() {
  const stage = document.querySelector('.mock-stage');
  const mockContainer = document.querySelector('.mock');
  const tiltEl = document.querySelector('.mock-tilt');
  const floatEl = document.querySelector('.mock-float');
  const tabBtns = document.querySelectorAll('.mock-tab-btn');
  const screens = document.querySelectorAll('.mock__screen');

  if (!mockContainer || !tiltEl || !stage) return;

  // Marca como pronto para evitar FOUC
  mockContainer.classList.add('is-ready');

  // 1. Alternância de Telas (Tabs WAI-ARIA)
  const switchScreen = (targetId) => {
    tabBtns.forEach(btn => {
      const match = btn.getAttribute('data-mock-target') === targetId;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
      btn.tabIndex = match ? 0 : -1;
    });

    screens.forEach(screen => {
      const match = screen.getAttribute('data-screen') === targetId;
      screen.classList.toggle('is-active', match);
    });
  };

  // Eventos de clique nas abas
  tabBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-mock-target');
      if (target) switchScreen(target);
    });

    // Navegação por teclado segundo WAI-ARIA Tabs
    btn.addEventListener('keydown', (e) => {
      const btns = Array.from(tabBtns);
      let nextIndex = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (index + 1) % btns.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (index - 1 + btns.length) % btns.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = btns.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        btns[nextIndex].focus();
        const target = btns[nextIndex].getAttribute('data-mock-target');
        if (target) switchScreen(target);
      }
    });
  });

  // Gatilhos externos (ex: botões "Ver no mockup" na seção #interface)
  document.querySelectorAll('[data-switch-mock]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const target = trigger.getAttribute('data-switch-mock');
      if (target) {
        switchScreen(target);
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const targetTab = document.querySelector(`.mock-tab-btn[data-mock-target="${target}"]`);
        if (targetTab) {
          targetTab.focus({ preventScroll: true });
        }
      }
    });
  });

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
