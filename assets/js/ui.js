// Módulo de interface (UI): header, scrollspy, abas acessíveis, toast, reveal e spotlight.

export function initUI(currentPlatform) {
  const root = document.documentElement;

  // 1. Header Sticky com Sentinel (Zero listener de scroll)
  const topSentinel = document.getElementById('top');
  if (topSentinel) {
    const headerObserver = new IntersectionObserver(([entry]) => {
      root.classList.toggle('stuck', !entry.isIntersecting);
    });
    headerObserver.observe(topSentinel);
  }

  // 2. Scrollspy da navegação
  const sections = document.querySelectorAll('main > section[id]');
  const navLinks = document.querySelectorAll('.nav a[href^="#"]');

  if (sections.length && navLinks.length) {
    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const isCurrent = link.getAttribute('href') === `#${id}`;
            if (isCurrent) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    }, { rootMargin: '-20% 0px -55% 0px', threshold: 0.1 });

    sections.forEach((sec) => spyObserver.observe(sec));
  }

  // 3. Navegação por âncoras com gestão de foco acessível
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const targetId = anchor.getAttribute('href').slice(1);
    if (!targetId || targetId === 'top') return;

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const heading = targetEl.querySelector('h2, h3, [tabindex="-1"]');
      if (heading) {
        setTimeout(() => {
          heading.focus({ preventScroll: true });
        }, 300);
      }
    }
  });

  // 4. Reveal ao rolar com escalonamento (--i até 6)
  document.querySelectorAll('.cards, .grid, .cols, .screens-grid').forEach((group) => {
    [...group.children].forEach((child, idx) => {
      child.style.setProperty('--i', Math.min(idx, 6));
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // 5. Abas WAI-ARIA em #como-instalar (Mobile < 768px)
  const tablist = document.querySelector('#como-instalar .tablist');
  const tabs = document.querySelectorAll('#como-instalar .tab-btn');
  const panels = document.querySelectorAll('#como-instalar [role="tabpanel"]');
  const tabIndicator = document.querySelector('#como-instalar .tab-indicator');

  if (tablist && tabs.length && panels.length) {
    const isMobileQuery = window.matchMedia('(max-width: 767px)');

    const switchTab = (selectedTab) => {
      const targetPanelId = selectedTab.getAttribute('aria-controls');

      tabs.forEach((t) => {
        const isSelected = t === selectedTab;
        t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        t.setAttribute('tabindex', isSelected ? '0' : '-1');
      });

      panels.forEach((p) => {
        if (isMobileQuery.matches) {
          p.hidden = p.id !== targetPanelId;
        } else {
          p.hidden = false;
        }
      });

      // Indicador deslizante: 0% para Windows (aba 0), 100% para Android (aba 1)
      if (tabIndicator) {
        const index = [...tabs].indexOf(selectedTab);
        tabIndicator.style.transform = `translateX(${index * 100}%)`;
      }
    };

    // Pré-seleciona plataforma detectada
    const initialIndex = currentPlatform === 'android' ? 1 : 0;
    if (tabs[initialIndex]) switchTab(tabs[initialIndex]);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab));

      tab.addEventListener('keydown', (e) => {
        const tabArray = [...tabs];
        const curIndex = tabArray.indexOf(tab);
        let nextTab = null;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          nextTab = tabArray[(curIndex + 1) % tabArray.length];
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          nextTab = tabArray[(curIndex - 1 + tabArray.length) % tabArray.length];
        } else if (e.key === 'Home') {
          nextTab = tabArray[0];
        } else if (e.key === 'End') {
          nextTab = tabArray[tabArray.length - 1];
        }

        if (nextTab) {
          e.preventDefault();
          nextTab.focus();
          switchTab(nextTab);
        }
      });
    });

    const handleBreakpoint = (e) => {
      if (!e.matches) {
        // Desktop: exibe ambas as colunas
        panels.forEach((p) => { p.hidden = false; });
      } else {
        // Mobile: volta para a aba selecionada
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
        switchTab(activeTab);
      }
    };

    isMobileQuery.addEventListener('change', handleBreakpoint);
    handleBreakpoint(isMobileQuery);
  }

  // 6. Efeito Spotlight nos cards de recursos (#recursos)
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canHover && !prefersReduced) {
    document.querySelectorAll('.feat').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mx', `${x.toFixed(1)}px`);
        card.style.setProperty('--my', `${y.toFixed(1)}px`);
      }, { passive: true });
    });
  }

  // 7. Botões de Copiar Hash e Comandos
  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    if (!copyBtn) return;
    const targetSelector = copyBtn.dataset.copy;
    const targetEl = document.querySelector(targetSelector);
    if (!targetEl) return;

    try {
      await navigator.clipboard.writeText(targetEl.textContent.trim());
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copiado!';
      showToast('Copiado para a área de transferência.');
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } catch {
      /* Fallback gracioso */
    }
  });

  // 8. Acordeão Fluido do FAQ (Abertura e Fechamento com Web Animations API a 60fps)
  const faqGroup = document.querySelector('.faq');
  if (faqGroup) {
    const detailsList = faqGroup.querySelectorAll('details');

    detailsList.forEach((details) => {
      const summary = details.querySelector('summary');
      const content = details.querySelector('p');
      if (!summary || !content) return;

      let animation = null;
      let isClosing = false;
      let isOpening = false;

      const closeDetails = () => {
        isClosing = true;
        details.classList.add('is-closing');
        details.classList.remove('is-open');

        const startHeight = `${details.offsetHeight}px`;
        const endHeight = `${summary.offsetHeight}px`;

        if (animation) animation.cancel();

        animation = details.animate({
          height: [startHeight, endHeight]
        }, {
          duration: 250,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });

        content.animate({
          opacity: [1, 0],
          transform: ['translateY(0)', 'translateY(-6px)']
        }, {
          duration: 180,
          easing: 'ease-out'
        });

        animation.onfinish = () => {
          details.open = false;
          animation = null;
          isClosing = false;
          details.classList.remove('is-closing');
          details.style.height = '';
        };
        animation.oncancel = () => {
          isClosing = false;
          details.classList.remove('is-closing');
          details.style.height = '';
        };
      };

      const openDetails = () => {
        // Fecha suavemente outros itens abertos no mesmo grupo FAQ
        detailsList.forEach((other) => {
          if (other !== details && other.open && !other.classList.contains('is-closing')) {
            if (other._closeDetails) other._closeDetails();
            else other.open = false;
          }
        });

        details.style.height = `${details.offsetHeight}px`;
        details.open = true;
        details.classList.add('is-open');
        details.classList.remove('is-closing');

        window.requestAnimationFrame(() => {
          isOpening = true;
          const startHeight = `${details.offsetHeight}px`;
          const endHeight = `${summary.offsetHeight + content.offsetHeight}px`;

          if (animation) animation.cancel();

          animation = details.animate({
            height: [startHeight, endHeight]
          }, {
            duration: 280,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
          });

          content.animate({
            opacity: [0, 1],
            transform: ['translateY(-6px)', 'translateY(0)']
          }, {
            duration: 240,
            delay: 40,
            easing: 'ease-out',
            fill: 'both'
          });

          animation.onfinish = () => {
            animation = null;
            isOpening = false;
            details.style.height = '';
          };
          animation.oncancel = () => {
            isOpening = false;
            details.style.height = '';
          };
        });
      };

      details._closeDetails = closeDetails;

      summary.addEventListener('click', (e) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        e.preventDefault();

        if (isClosing || !details.open) {
          openDetails();
        } else if (isOpening || details.open) {
          closeDetails();
        }
      });
    });
  }
}

// 9. Sistema de Toast (role="status", aria-live="polite")
let toastTimer = null;

export function showToast(message, actionHref = null, actionLabel = null) {
  const toastBox = document.getElementById('toast');
  if (!toastBox) return;

  toastBox.innerHTML = '';
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toastBox.appendChild(textSpan);

  if (actionHref && actionLabel) {
    const link = document.createElement('a');
    link.href = actionHref;
    link.textContent = actionLabel;
    link.className = 'toast__link';
    toastBox.appendChild(link);
  }

  toastBox.classList.add('on');

  const startTimer = () => {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastBox.classList.remove('on');
    }, 6000);
  };

  startTimer();

  // Pausa ao focar ou passar o cursor
  toastBox.onmouseenter = () => clearTimeout(toastTimer);
  toastBox.onmouseleave = startTimer;
  toastBox.onfocusin = () => clearTimeout(toastTimer);
  toastBox.onfocusout = startTimer;
}

// Fecha toast com tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const toastBox = document.getElementById('toast');
    if (toastBox) toastBox.classList.remove('on');
  }
});
