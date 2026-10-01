// Detecção de plataforma e navegadores embutidos (WebViews).
// Suporte a ?os=windows|android|mac|ios|linux para forçar plataforma em testes.

export function detectPlatform() {
  const forced = new URLSearchParams(location.search).get('os');
  if (forced && /^(windows|android|mac|ios|linux)$/i.test(forced)) {
    return forced.toLowerCase();
  }

  const ua = navigator.userAgent || '';
  const hint = (navigator.userAgentData?.platform || '').toLowerCase();

  // 1. Android primeiro: o UA do Android frequentemente inclui a palavra "Linux".
  if (hint === 'android' || /android/i.test(ua)) {
    return 'android';
  }

  // 2. iOS e iPadOS (iPadOS se identifica como "Macintosh", mas possui múltiplos pontos de toque).
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // 3. Windows (exclui o antigo Windows Phone).
  if (hint === 'windows' || (/windows/i.test(ua) && !/windows phone/i.test(ua))) {
    return 'windows';
  }

  // 4. macOS desktop tradicional.
  if (hint === 'macos' || /macintosh|mac os/i.test(ua)) {
    return 'mac';
  }

  // 5. Linux / ChromeOS.
  if (hint === 'linux' || hint === 'chrome os' || /linux|cros/i.test(ua)) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Detecta navegadores embutidos (Instagram, Facebook, TikTok, Line, WeChat ou Android WebView).
 * Mostra uma faixa informativa caso o usuário esteja em um webview restrito.
 */
export function checkInAppBrowser(toastCallback) {
  const ua = navigator.userAgent || '';
  const isInApp = /instagram|fbav|fban|tiktok|line\/|micromessenger|; wv\)/i.test(ua);

  if (!isInApp) return;

  const banner = document.getElementById('in-app-banner');
  if (!banner) return;

  banner.hidden = false;

  const copyBtn = banner.querySelector('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (toastCallback) toastCallback('Link copiado para a área de transferência.');
      } catch {
        /* fallback silencioso */
      }
    });
  }

  const dismissBtn = banner.querySelector('[data-dismiss-banner]');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.hidden = true;
    });
  }
}
