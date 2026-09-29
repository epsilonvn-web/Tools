'use strict';

const MODULE_NAME = 'tools';
const EE_HOME = 'https://epsilonvn-web.github.io/Epsilon-Edu/';
const EE_CONFIG = EE_HOME + 'assets/data/config.json';
const SESSION_KEY = 'epsilon_session';

const TOOL_CATALOG = [
  {
    id: 'calculator',
    name: 'Esilon Calculator',
    description: 'Máy tính khoa học cho học tập: lượng giác, logarit, lũy thừa, căn, giai thừa và lịch sử 5 phép tính gần nhất.',
    icon: '🧮',
    route: 'calculator',
    category: 'Math',
    enabled: true,
    script: 'assets/js/tools/calculator.js'
  },
  {
    id: 'pdf-studio',
    name: 'PDF Studio',
    description: 'Bộ công cụ xử lý PDF. Chức năng sẽ được mở sau khi hoàn tất phân tích khả thi trên browser.',
    icon: '📄',
    route: 'pdf-studio',
    category: 'Document',
    enabled: false,
    script: 'assets/js/tools/pdf-studio.js'
  }
];

const loadedScripts = new Map();
const registeredTools = new Map();
let accessGranted = false;

const stageEl = document.getElementById('stage');
const statusEl = document.getElementById('status');

document.getElementById('back-btn').addEventListener('click', () => {
  location.href = EE_HOME;
});
window.addEventListener('DOMContentLoaded', boot);
window.addEventListener('hashchange', () => {
  if (accessGranted) route();
});

window.EpsilonTools = Object.freeze({
  registerTool(id, renderer) {
    if (!id || typeof renderer !== 'function') return;
    registeredTools.set(id, renderer);
  },
  goHome() {
    if (location.hash) location.hash = '';
    else renderCatalog();
  },
  openTool(id) {
    const tool = TOOL_CATALOG.find(item => item.id === id && item.enabled);
    if (!tool) return;
    location.hash = tool.route;
  }
});

async function boot() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    location.replace(EE_HOME + '?return=' + encodeURIComponent(location.href));
    return;
  }

  try {
    const cfg = await loadJson(EE_CONFIG);
    const result = await api(cfg.apiUrl, 'valueModuleAccessGet', { module: MODULE_NAME, token });
    if (!result.allowed) {
      showStatus('Tools dành cho Admin hoặc tài khoản đang có Trial/VIP ở ít nhất một môn học.', 'denied');
      return;
    }

    accessGranted = true;
    statusEl.classList.add('hidden');
    stageEl.classList.remove('hidden');
    route();
  } catch (err) {
    showStatus(err.message || 'Không thể xác minh quyền truy cập.', 'error');
  }
}

function route() {
  const routeName = decodeURIComponent(location.hash.replace(/^#/, '').trim());
  if (!routeName) {
    renderCatalog();
    return;
  }

  const tool = TOOL_CATALOG.find(item => item.route === routeName && item.enabled);
  if (!tool) {
    renderCatalog();
    return;
  }

  openTool(tool);
}

function renderCatalog() {
  stageEl.innerHTML = `
    <section class="catalog" aria-labelledby="catalog-title">
      <div class="catalog-head">
        <div>
          <h2 id="catalog-title">Tool Catalog</h2>
          <p>Chọn công cụ cần sử dụng. Mỗi tool được tải riêng khi mở.</p>
        </div>
      </div>
      <div class="tool-grid">
        ${TOOL_CATALOG.map(renderToolCard).join('')}
      </div>
    </section>`;

  stageEl.querySelectorAll('[data-tool-id]').forEach(button => {
    button.addEventListener('click', () => window.EpsilonTools.openTool(button.dataset.toolId));
  });
}

function renderToolCard(tool) {
  if (!tool.enabled) {
    return `
      <article class="tool-card disabled" aria-disabled="true">
        <div class="tool-icon" aria-hidden="true">${tool.icon}</div>
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.description)}</p>
        <div class="tool-meta"><span>${escapeHtml(tool.category)}</span><span class="soon">Sắp có</span></div>
      </article>`;
  }

  return `
    <button class="tool-card" type="button" data-tool-id="${escapeHtml(tool.id)}" aria-label="Mở ${escapeHtml(tool.name)}">
      <div class="tool-icon" aria-hidden="true">${tool.icon}</div>
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${escapeHtml(tool.description)}</p>
      <div class="tool-meta"><span>${escapeHtml(tool.category)}</span><span>Mở tool →</span></div>
    </button>`;
}

async function openTool(tool) {
  stageEl.innerHTML = '<div class="tool-loading"><div>Đang tải công cụ...</div></div>';
  try {
    await loadScript(tool.script);
    const renderer = registeredTools.get(tool.id);
    if (!renderer) throw new Error('Tool chưa đăng ký đúng module.');
    renderer(stageEl, { tool });
  } catch (err) {
    stageEl.innerHTML = `
      <div class="catalog">
        <div class="status error">${escapeHtml(err.message || 'Không thể tải công cụ.')}</div>
        <button class="back" type="button" id="tool-load-back">← Tool Catalog</button>
      </div>`;
    document.getElementById('tool-load-back')?.addEventListener('click', () => window.EpsilonTools.goHome());
  }
}

function loadScript(src) {
  if (loadedScripts.has(src)) return loadedScripts.get(src);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Không tải được module của công cụ.'));
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Không tải được cấu hình Epsilon Edu.');
  try {
    return await response.json();
  } catch (_) {
    throw new Error('Cấu hình Epsilon Edu đang phản hồi chưa ổn định.');
  }
}

async function api(url, action, data) {
  const body = new URLSearchParams();
  body.set('payload', JSON.stringify({ action, ...data }));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
      signal: controller.signal,
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    });
    const raw = await response.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (_) {
      throw new Error('Máy chủ đang phản hồi chưa ổn định. Vui lòng thử lại sau vài giây.');
    }
    if (!json || typeof json !== 'object' || !json.ok) {
      throw new Error(json?.error || 'Không thể xác minh quyền truy cập.');
    }
    return json.data || {};
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    if (err instanceof TypeError) throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
