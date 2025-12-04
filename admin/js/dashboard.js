// admin/js/dashboard.js
// Admin Dashboard logic with real AI helper:
// - Loads selftest + providers
// - Shows cards
// - Calls /admin/api/ai/helper to get AI summary + next steps

async function apiGetAdmin(path) {
  const res = await fetch(`/admin/api/${path}`);
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return await res.json();
}

async function apiPostAdmin(path, body = {}) {
  const res = await fetch(`/admin/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Admin API POST error: ${res.status}`);
  return await res.json();
}

// Elements
const elVersion = document.getElementById('bbVersion');
const elHealthChip = document.getElementById('healthStatusChip');
const elHealthBody = document.getElementById('healthStatusBody');
const elProvidersChip = document.getElementById('providersStatusChip');
const elProvidersBody = document.getElementById('providersStatusBody');
const elQueueChip = document.getElementById('queueStatusChip');
const elQueueBody = document.getElementById('queueStatusBody');

const elAdviceIntro = document.getElementById('aiAdviceIntro');
const elAdviceList = document.getElementById('aiAdviceList');

const btnSelfTest = document.getElementById('runSelfTestBtn');
const btnRefresh = document.getElementById('refreshBtn');

function setChip(el, state) {
  if (!el) return;
  el.classList.remove('status-ok', 'status-warn', 'status-err');
  if (state === 'ok') el.classList.add('status-ok');
  else if (state === 'err') el.classList.add('status-err');
  else el.classList.add('status-warn');
  el.textContent =
    state === 'ok' ? 'OK' : state === 'err' ? 'Action Needed' : 'Check';
}

let lastSelftest = null;
let lastProviders = null;

async function loadDashboard() {
  try {
    const [selftest, providers] = await Promise.all([
      apiGetAdmin('selftest'),
      apiGetAdmin('providers'),
    ]);

    lastSelftest = selftest;
    lastProviders = providers;

    // Version
    if (elVersion) {
      elVersion.textContent =
        selftest.version || 'v122.x (version not reported)';
    }

    // Health
    if (elHealthChip && elHealthBody) {
      const state = selftest.health === 'ok' ? 'ok' : 'warn';
      setChip(elHealthChip, state);
      elHealthBody.textContent =
        selftest.health === 'ok'
          ? 'Self-test health is OK.'
          : selftest.health || 'Health status not reported.';
    }

    // Providers
    if (elProvidersChip && elProvidersBody) {
      const detail = providers.detail || '';
      const lower = detail.toLowerCase();
      let state = 'ok';
      if (lower.includes('missing keys')) state = 'warn';
      setChip(elProvidersChip, state);
      elProvidersBody.textContent = detail || 'No provider details.';
    }

    // Queue (from selftest.queue)
    if (elQueueChip && elQueueBody) {
      const q = selftest.queue || { ok: true, detail: 'count=1' };
      const state = q.ok ? 'ok' : 'warn';
      setChip(elQueueChip, state);
      elQueueBody.textContent = q.detail || 'No queue details.';
    }

    // After cards load, call AI helper
    await loadAiHelper();
  } catch (e) {
    console.error('Dashboard load error', e);
    if (elHealthBody) {
      elHealthBody.textContent = `Error loading dashboard: ${e.message}`;
      setChip(elHealthChip, 'err');
    }
  }
}

async function loadAiHelper() {
  if (!lastSelftest || !lastProviders) return;

  if (elAdviceIntro) {
    elAdviceIntro.textContent = 'Bible Buddy (Admin) is reviewing your status...';
  }
  if (elAdviceList) {
    elAdviceList.innerHTML = '';
  }

  try {
    const result = await apiPostAdmin('ai/helper', {
      selftest: lastSelftest,
      providers: lastProviders,
    });

    const { summary, actions } = result;

    if (elAdviceIntro) {
      elAdviceIntro.textContent = summary || 'No summary available.';
    }
    if (elAdviceList) {
      elAdviceList.innerHTML = '';
      (actions || []).forEach((a) => {
        const li = document.createElement('li');
        li.textContent = a;
        elAdviceList.appendChild(li);
      });
      if (!actions || actions.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No specific actions right now. Focus on testing and user feedback.';
        elAdviceList.appendChild(li);
      }
    }
  } catch (e) {
    console.error('AI helper error', e);
    if (elAdviceIntro) {
      elAdviceIntro.textContent = 'Error getting AI guidance: ' + e.message;
    }
  }
}

async function runSelfTest() {
  if (!btnSelfTest) return;
  btnSelfTest.disabled = true;
  const original = btnSelfTest.textContent;
  btnSelfTest.textContent = 'Running…';

  try {
    await loadDashboard();
    alert('Self-test refreshed. Check the cards and AI guidance.');
  } catch (e) {
    alert('Self-test failed: ' + e.message);
  } finally {
    btnSelfTest.disabled = false;
    btnSelfTest.textContent = original;
  }
}

if (btnSelfTest) btnSelfTest.addEventListener('click', runSelfTest);
if (btnRefresh) btnRefresh.addEventListener('click', loadDashboard);

loadDashboard();
