// Ponto de entrada da aplicação.
document.documentElement.classList.add('js');

import { detectPlatform, checkInAppBrowser } from './platform.js';
import { initRelease } from './release.js';
import { initMock } from './mock.js';
import { initUI, showToast } from './ui.js';

// 1. Detecção de plataforma
const platform = detectPlatform();
document.documentElement.dataset.platform = platform;

// Mensagem para plataformas sem versão oficial (iOS, macOS, Linux)
const unsupportedNames = { ios: 'iOS', mac: 'macOS', linux: 'Linux' };
const unsupported = unsupportedNames[platform];
if (unsupported) {
  const strip = document.getElementById('unsupported');
  if (strip) {
    const textSpan = strip.querySelector('span');
    if (textSpan) {
      textSpan.textContent = `Você está no ${unsupported}. O ZReader ainda não está disponível para esta plataforma: hoje só existem versões para Windows e Android.`;
    }
    strip.hidden = false;
  }
}

// 2. Ano dinâmico no rodapé
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// 3. Inicialização dos módulos
initUI(platform);
initMock();
initRelease(showToast);
checkInAppBrowser(showToast);
