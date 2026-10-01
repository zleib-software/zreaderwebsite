// Lógica de download do ZReader: consulta a API pública do GitHub e atualiza a interface.
// Testes locais sem chamar a API: ?release=demo|empty|error|ratelimit|offline|slow

const REPO = 'https://github.com/zleib-software/ZReader/releases';
const API = 'https://api.github.com/repos/zleib-software/ZReader/releases';
const CACHE_KEY = 'zreader:release:v1';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
const SKIP_PATTERN = /\.(blockmap|ya?ml|sha256|sha512|sig|asc|txt|json)$/i;

const $$ = (selector) => [...document.querySelectorAll(selector)];

// Dados de demonstração para preview visual imediato e testes de QA
const DEMO_RELEASE = {
  tag_name: 'v1.0.0',
  published_at: '2026-06-12T12:00:00Z',
  html_url: REPO,
  prerelease: false,
  assets: [
    {
      name: 'ZReader Setup 1.0.0.exe',
      size: 88400000,
      browser_download_url: `${REPO}/download/v1.0.0/ZReader.Setup.1.0.0.exe`,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    {
      name: 'ZReader 1.0.0.exe',
      size: 82100000,
      browser_download_url: `${REPO}/download/v1.0.0/ZReader.1.0.0.exe`
    },
    {
      name: 'ZReader-1.0.0-win.zip',
      size: 85300000,
      browser_download_url: `${REPO}/download/v1.0.0/ZReader-1.0.0-win.zip`
    },
    {
      name: 'ZReader-1.0.0.apk',
      size: 44200000,
      browser_download_url: `${REPO}/download/v1.0.0/ZReader-1.0.0.apk`,
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
    },
    {
      name: 'ZReader-1.0.0-arm64.apk',
      size: 38500000,
      browser_download_url: `${REPO}/download/v1.0.0/ZReader-1.0.0-arm64.apk`
    }
  ]
};

/**
 * Função pura e testável para seleção inteligente de arquivos por plataforma.
 */
export function pickAssets(assets = []) {
  // Filtra arquivos auxiliares e garante segurança das URLs
  const valid = assets.filter((asset) => {
    if (!asset || !asset.name) return false;
    if (SKIP_PATTERN.test(asset.name)) return false;
    const url = asset.browser_download_url || '';
    return url.startsWith('https://github.com/zleib-software/ZReader/releases/download/') || url === REPO;
  });

  const normalized = valid.map((a) => ({
    ...a,
    normName: a.name.toLowerCase().replace(/[\s._-]+/g, ' ')
  }));

  const byExt = (ext) => normalized.filter((a) => a.name.toLowerCase().endsWith(ext));

  // Android
  const apks = byExt('.apk');
  const nonDebugApks = apks.filter((a) => !a.normName.includes('debug'));
  const apkPool = nonDebugApks.length ? nonDebugApks : apks;
  const androidAsset = apkPool.find((a) => a.normName.includes('universal'))
    || apkPool.find((a) => a.normName.includes('arm64'))
    || apkPool[0];

  // Windows Installer
  const exes = byExt('.exe');
  const windowsInstaller = exes.find((a) => /setup|installer/.test(a.normName))
    || exes.find((a) => !a.normName.includes('portable'));

  // Windows Portable
  const windowsPortable = exes.find((a) => a !== windowsInstaller && a.normName.includes('portable'))
    || exes.find((a) => a !== windowsInstaller);

  // Windows ZIP
  const zips = byExt('.zip');
  const windowsZip = zips.find((a) => a.normName.includes('win')) || zips[0];

  // Outros arquivos úteis que não sejam os primários
  const primaryUrls = new Set([
    androidAsset?.browser_download_url,
    windowsInstaller?.browser_download_url
  ].filter(Boolean));

  const otherAssets = valid.filter((a) => !primaryUrls.has(a.browser_download_url));

  return {
    android: androidAsset,
    windows: windowsInstaller,
    windowsPortable,
    windowsZip,
    otherAssets
  };
}

/** Formata bytes para exibição amigável em pt-BR (KB ou MB). */
export function formatSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1048576) {
    const kb = (bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return `${kb} KB`;
  }
  const mb = (bytes / 1048576).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${mb} MB`;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.payload ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      payload
    }));
  } catch {
    /* Mudo em modo anônimo ou se cota excedida */
  }
}

async function fetchRelease() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Somente o header Accept padrão para evitar preflight de CORS
  const fetchEndpoint = (endpoint) => fetch(API + endpoint, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: controller.signal
  });

  try {
    let response = await fetchEndpoint('/latest');

    // 404 pode significar que só existem pré-lançamentos
    if (response.status === 404) {
      response = await fetchEndpoint('?per_page=5');
      if (response.ok) {
        const list = (await response.json()).filter((item) => !item.draft);
        return list.length ? { state: 'ready', release: list[0] } : { state: 'empty' };
      }
    }

    if (response.status === 403 || response.status === 429) {
      return { state: 'rate-limited' };
    }

    if (!response.ok) {
      return { state: 'error' };
    }

    const releaseData = await response.json();
    return releaseData.draft ? { state: 'empty' } : { state: 'ready', release: releaseData };
  } catch {
    return { state: navigator.onLine ? 'error' : 'offline' };
  } finally {
    clearTimeout(timeoutId);
  }
}

const MESSAGES = {
  empty: 'Ainda não há uma versão publicada. Acompanhe o repositório para ser avisado.',
  error: 'Não foi possível buscar a versão mais recente agora. Você será levado à página de releases no GitHub.',
  'rate-limited': 'Não foi possível buscar a versão mais recente agora. Você será levado à página de releases no GitHub.',
  offline: 'Você está offline. Conecte-se para baixar.'
};

/**
 * Função de renderização pura e idempotente:
 * Não recria nós da DOM, garantindo zero layout shift.
 */
function render(state, release = null, isDemo = false) {
  const root = document.documentElement;
  const isReady = state === 'ready' && !!release;
  const picked = isReady ? pickAssets(release.assets) : { otherAssets: [] };
  const rawVersion = isReady ? (release.tag_name || '') : '';
  const version = rawVersion ? `v${rawVersion.replace(/^v/i, '')}` : '';
  const activeOs = root.dataset.platform === 'android' ? 'android' : 'windows';

  root.dataset.release = state;

  // 1. Pílula de status do Hero
  $$('[data-bind="status"]').forEach((el) => {
    if (isReady) {
      const pre = release.prerelease ? ' (pré-lançamento)' : '';
      el.textContent = `${version} · já disponível${pre}`;
    } else if (state === 'empty') {
      el.textContent = 'Primeira versão em breve';
    } else {
      el.textContent = 'Open source · Licença MIT';
    }
  });

  // 2. Metadados do Hero e dos Cards
  $$('[data-meta]').forEach((el) => {
    el.hidden = !isReady;
  });

  $$('[data-bind="version"]').forEach((el) => {
    el.textContent = version;
    el.classList.remove('sk');
  });

  $$('[data-bind="date"]').forEach((timeEl) => {
    timeEl.classList.remove('sk');
    if (!isReady || !release.published_at) return;
    const dateObj = new Date(release.published_at);
    timeEl.dateTime = release.published_at;
    timeEl.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(dateObj);
    const diffDays = Math.round((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    timeEl.title = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffDays, 'day');
  });

  $$('[data-size]').forEach((el) => {
    const targetOs = el.dataset.size === 'auto' ? activeOs : el.dataset.size;
    const asset = picked[targetOs];
    el.textContent = asset ? formatSize(asset.size) : '';
    el.classList.remove('sk');
  });

  // 3. Link de Notas da Versão
  $$('[data-bind="notes"]').forEach((link) => {
    if (isReady && release.html_url?.startsWith('https://github.com/zleib-software/ZReader/')) {
      link.href = release.html_url;
    } else {
      link.href = REPO;
    }
  });

  // 4. Botões principais de Download
  ['windows', 'android'].forEach((osKey) => {
    const asset = picked[osKey];
    $$(`[data-dl="${osKey}"]`).forEach((btn) => {
      const textSpan = btn.querySelector('.btn__t');
      if (textSpan) {
        textSpan.dataset.def ??= textSpan.textContent;
      }
      let label = textSpan?.dataset.def || 'Baixar';
      let href = `${REPO}/latest`;
      let isDisabled = false;

      if (state === 'empty') {
        label = 'Em breve';
        isDisabled = true;
      } else if (state === 'error' || state === 'rate-limited') {
        label = 'Abrir página de downloads';
      } else if (isReady && !asset) {
        label = 'Indisponível nesta versão';
        isDisabled = true;
      } else if (isReady && asset) {
        href = isDemo ? `${REPO}/latest` : asset.browser_download_url;
      }

      btn.href = href;
      if (textSpan) textSpan.textContent = label;

      if (isDisabled) {
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.removeAttribute('aria-disabled');
      }

      if (isReady && asset) {
        const osLabel = osKey === 'windows' ? 'Windows' : 'Android';
        const cleanVer = version.replace(/^v/, '');
        const sizeReadable = formatSize(asset.size).replace('MB', 'megabytes');
        btn.setAttribute('aria-label', `Baixar ZReader para ${osLabel}, versão ${cleanVer}, ${sizeReadable}`);
      } else {
        btn.removeAttribute('aria-label');
      }
    });
  });

  // 5. Links secundários do Windows (Portátil e ZIP)
  const portableLink = document.getElementById('link-win-portable');
  if (portableLink) {
    if (isReady && picked.windowsPortable) {
      portableLink.href = isDemo ? `${REPO}/latest` : picked.windowsPortable.browser_download_url;
      portableLink.hidden = false;
    } else {
      portableLink.hidden = true;
    }
  }

  const zipLink = document.getElementById('link-win-zip');
  if (zipLink) {
    if (isReady && picked.windowsZip) {
      zipLink.href = isDemo ? `${REPO}/latest` : picked.windowsZip.browser_download_url;
      zipLink.hidden = false;
    } else {
      zipLink.hidden = true;
    }
  }

  // 6. Verificação de integridade (SHA-256)
  ['windows', 'android'].forEach((osKey) => {
    const details = document.getElementById(`integrity-${osKey}`);
    if (!details) return;
    const asset = picked[osKey];
    const hash = asset?.sha256;
    if (isReady && hash) {
      details.hidden = false;
      const codeEl = details.querySelector('code');
      if (codeEl) codeEl.textContent = hash;
      const cmdEl = details.querySelector('.cmd-check');
      if (cmdEl) {
        cmdEl.textContent = osKey === 'windows'
          ? `Get-FileHash .\\${asset.name} -Algorithm SHA256`
          : `sha256sum ${asset.name}`;
      }
    } else {
      details.hidden = true;
    }
  });

  // 7. Detalhes de "Outros arquivos desta versão"
  const otherFilesDetails = document.getElementById('other-files');
  const otherList = document.getElementById('other-files-list');
  if (otherFilesDetails && otherList) {
    if (isReady && picked.otherAssets && picked.otherAssets.length > 0) {
      otherFilesDetails.hidden = false;
      otherList.innerHTML = '';
      picked.otherAssets.forEach((file) => {
        const li = document.createElement('li');
        li.className = 'other-item';
        const a = document.createElement('a');
        a.href = isDemo ? `${REPO}/latest` : file.browser_download_url;
        a.textContent = file.name;
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'file-size';
        sizeSpan.textContent = formatSize(file.size);
        li.appendChild(a);
        li.appendChild(sizeSpan);
        otherList.appendChild(li);
      });
    } else {
      otherFilesDetails.hidden = true;
    }
  }

  // 8. Mensagem de erro / nota geral
  const noteBox = document.getElementById('note');
  const noteMessage = MESSAGES[state] || '';
  $$('[data-bind="note"]').forEach((el) => {
    el.textContent = noteMessage;
  });
  $$('[data-when]').forEach((el) => {
    el.hidden = el.dataset.when !== state;
  });
  if (noteBox) noteBox.hidden = !noteMessage;

  // Remove estado de carregamento dos cards
  $$('[data-card]').forEach((c) => c.setAttribute('aria-busy', 'false'));
}

async function simulateMode(mode) {
  if (mode === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  const modeMap = {
    empty: 'empty',
    error: 'error',
    ratelimit: 'rate-limited',
    offline: 'offline'
  };
  render(modeMap[mode] || 'ready', DEMO_RELEASE, true);
}

async function load() {
  const queryParam = new URLSearchParams(location.search).get('release');
  if (queryParam) {
    return simulateMode(queryParam.toLowerCase());
  }

  // Stale-While-Revalidate: exibe o cache instantaneamente sem layout shift
  const cached = readCache();
  if (cached) {
    render('ready', cached.payload);
  }

  // Se o cache tiver menos de 10 min, não precisa revalidar imediatamente
  if (cached && (Date.now() - cached.savedAt < CACHE_TTL)) {
    return;
  }

  const result = await fetchRelease();
  if (result.state === 'ready') {
    writeCache(result.release);
    render('ready', result.release);
  } else if (!cached) {
    render(result.state);
    if (result.state === 'offline') {
      window.addEventListener('online', load, { once: true });
    }
  }
}

export function initRelease(toastCallback) {
  // Listener de clique para feedback visual imediato (< 100ms) sem bloquear navegação
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-dl]');
    if (!link) return;

    if (link.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      return;
    }

    if (document.documentElement.dataset.release !== 'ready' || link.dataset.state === 'started') {
      return;
    }

    const textSpan = link.querySelector('.btn__t');
    if (!textSpan) return;

    const previousLabel = textSpan.textContent;
    link.dataset.state = 'started';
    textSpan.textContent = 'Download iniciado';

    setTimeout(() => {
      textSpan.textContent = previousLabel;
      delete link.dataset.state;
    }, 4000);

    if (toastCallback) {
      toastCallback('Download iniciado.', '#como-instalar', 'Ver como instalar');
    }
  });

  return load();
}
