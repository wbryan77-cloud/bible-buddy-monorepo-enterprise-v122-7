(function () {
  const sessionList = document.getElementById('sessionList');
  const detailPanel = document.getElementById('detailPanel');
  const tokenInput = document.getElementById('tokenInput');
  const cohortFilter = document.getElementById('cohortFilter');

  const savedToken = localStorage.getItem('betaReviewToken');
  if (savedToken) tokenInput.value = savedToken;

  function authHeaders() {
    const token = tokenInput.value.trim();
    if (token) localStorage.setItem('betaReviewToken', token);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function ratingLine(fb) {
    return [
      'felt heard: ' + fb.feltHeard,
      'usefulness: ' + fb.usefulness,
      'biblical faithfulness: ' + fb.biblicalFaithfulness,
      'naturalness: ' + fb.naturalness,
      'would use again: ' + fb.wouldUseAgain,
    ].join(' · ');
  }

  function renderFeedback(feedbackList) {
    if (!feedbackList || !feedbackList.length) {
      return '<p class="empty">No feedback for this session.</p>';
    }
    return feedbackList
      .map(
        (fb) =>
          '<div class="feedback-block">' +
          '<div><strong>Feedback</strong> · ' +
          (fb.createdAt || '') +
          '</div>' +
          '<div class="ratings">' +
          ratingLine(fb) +
          '</div>' +
          (fb.comment ? '<p>' + escapeHtml(fb.comment) + '</p>' : '') +
          '</div>'
      )
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function loadSessions() {
    sessionList.innerHTML = '<p class="empty">Loading…</p>';
    const cohort = cohortFilter.value;
    const qs = cohort ? '?cohort=' + encodeURIComponent(cohort) : '';
    const res = await fetch('/api/beta/review' + qs, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      sessionList.innerHTML = '<p class="empty">' + escapeHtml(data.error || 'Load failed') + '</p>';
      return;
    }
    const sessions = data.sessions || [];
    if (!sessions.length) {
      sessionList.innerHTML = '<p class="empty">No sessions found.</p>';
      return;
    }
    sessionList.innerHTML = '';
    sessions.forEach((s) => {
      const div = document.createElement('div');
      div.className = 'session-item';
      div.innerHTML =
        '<strong>' +
        escapeHtml(s.testerId || 'unknown') +
        '</strong>' +
        '<small>' +
        escapeHtml(s.sessionId) +
        '</small>' +
        '<small>' +
        s.turnCount +
        ' turns · ' +
        escapeHtml(s.lastAt || '') +
        '</small>';
      div.addEventListener('click', () => {
        document.querySelectorAll('.session-item').forEach((el) => el.classList.remove('active'));
        div.classList.add('active');
        loadSessionDetail(s.sessionId);
      });
      sessionList.appendChild(div);
    });
  }

  async function loadSessionDetail(sessionId) {
    detailPanel.innerHTML = '<p class="empty">Loading transcript…</p>';
    const res = await fetch('/api/beta/review/session/' + encodeURIComponent(sessionId), {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      detailPanel.innerHTML = '<p class="empty">' + escapeHtml(data.error || 'Not found') + '</p>';
      return;
    }
    const t = data.transcript;
    let html =
      '<h2>' +
      escapeHtml(t.testerId) +
      '</h2>' +
      '<p><code>' +
      escapeHtml(t.sessionId) +
      '</code> · cohort: ' +
      escapeHtml(t.cohort || '—') +
      '</p>';
    html += renderFeedback(data.feedback);
    html += '<h3>Transcript</h3>';
    (t.turns || []).forEach((turn, i) => {
      html +=
        '<div class="turn">' +
        '<div class="role">Turn ' +
        (i + 1) +
        ' · user · ' +
        escapeHtml(turn.createdAt || '') +
        '</div>' +
        '<div class="text">' +
        escapeHtml(turn.message) +
        '</div>' +
        '<div class="role" style="margin-top:8px;">Buddy</div>' +
        '<div class="text">' +
        escapeHtml(turn.reply) +
        '</div>' +
        '</div>';
    });
    detailPanel.innerHTML = html;
  }

  document.getElementById('loadBtn').addEventListener('click', loadSessions);
})();
