// admin/js/dashboard.js
// Bible Buddy Admin Dashboard logic:
// - Loads self-test & provider status from /admin/api
// - Displays simple cards
// - Generates "AI-style" guidance for the admin

async function apiGet(path) {
  const res = await fetch(`/admin/api/${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(`/admin/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST error: ${res.status}`);
  return await res.json();
}

// Elements
const elVersion = document.getElementById("bbVersion");
const elHealthChip = document.getElementById("healthStatusChip");
const elHealthBody = document.getElementById("healthStatusBody");
const elProvidersChip = document.getElementById("providersStatusChip");
const elProvidersBody = document.getElementById("providersStatusBody");
const elQueueChip = document.getElementById("queueStatusChip");
const elQueueBody = document.getElementById("queueStatusBody");
const elAdviceIntro = document.getElementById("aiAdviceIntro");
const elAdviceList = document.getElementById("aiAdviceList");

const btnSelfTest = document.getElementById("runSelfTestBtn");
const btnRefresh = document.getElementById("refreshBtn");

function setChip(el, state) {
  if (!el) return;
  el.classList.remove("status-ok", "status-warn", "status-err");
  if (state === "ok") el.classList.add("status-ok");
  else if (state === "err") el.classList.add("status-err");
  else el.classList.add("status-warn");
  el.textContent =
    state === "ok" ? "OK" : state === "err" ? "Action Needed" : "Check";
}

function buildGuidance(selftest, providers) {
  const tips = [];

  // Health guidance
  if (!selftest || selftest.health !== "ok") {
    tips.push(
      "Health: Self-test is not fully OK. Review recent changes or restart the service if issues persist."
    );
  } else {
    tips.push("Health: System looks healthy. No immediate action required.");
  }

  // Provider guidance
  const detail = (providers && providers.detail) || "";
  const lower = detail.toLowerCase();

  if (lower.includes("resend (missing keys)")) {
    tips.push(
      "Email (Resend): Add RESEND_API_KEY in Render → Environment so email sending can be enabled."
    );
  } else if (lower.includes("email: resend")) {
    tips.push("Email (Resend): Keys appear configured.");
  }

  if (lower.includes("twilio (missing keys)")) {
    tips.push(
      "SMS (Twilio): Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Render → Environment to enable SMS."
    );
  } else if (lower.includes("sms: twilio")) {
    tips.push("SMS (Twilio): Keys appear configured.");
  }

  if (lower.includes("queue: memory")) {
    tips.push(
      "Queue: Currently using in-memory queue. For heavier load, consider moving to Redis in a future version."
    );
  }

  if (tips.length === 0) {
    tips.push("All systems look fine. Focus on product testing and user feedback.");
  }

  return tips;
}

async function loadDashboard() {
  try {
    const [selftest, providers] = await Promise.all([
      apiGet("selftest"),
      apiGet("providers"),
    ]);

    // Version
    if (elVersion) {
      elVersion.textContent =
        selftest.version || "v122.x (version not reported)";
    }

    // Health card
    if (elHealthChip && elHealthBody) {
      const state = selftest.health === "ok" ? "ok" : "warn";
      setChip(elHealthChip, state);
      elHealthBody.textContent =
        selftest.health === "ok"
          ? "Self-test health is OK."
          : selftest.health || "Health status not reported.";
    }

    // Providers card
    if (elProvidersChip && elProvidersBody) {
      const detail = providers.detail || "";
      const lower = detail.toLowerCase();
      let state = "ok";
      if (lower.includes("missing keys")) state = "warn";
      setChip(elProvidersChip, state);
      elProvidersBody.textContent = detail || "No provider details.";
    }

    // Queue card (taken from selftest.queue if present)
    if (elQueueChip && elQueueBody) {
      const q = selftest.queue || { ok: true, detail: "count=1" };
      const state = q.ok ? "ok" : "warn";
      setChip(elQueueChip, state);
      elQueueBody.textContent = q.detail || "No queue details.";
    }

    // AI-style guidance
    const tips = buildGuidance(selftest, providers);
    if (elAdviceIntro) {
      elAdviceIntro.textContent = "Here are the next suggested steps:";
    }
    if (elAdviceList) {
      elAdviceList.innerHTML = "";
      tips.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        elAdviceList.appendChild(li);
      });
    }
  } catch (e) {
    console.error("Dashboard load error", e);
    if (elHealthBody) {
      elHealthBody.textContent = `Error loading dashboard: ${e.message}`;
      setChip(elHealthChip, "err");
    }
  }
}

async function runSelfTest() {
  if (!btnSelfTest) return;
  btnSelfTest.disabled = true;
  const original = btnSelfTest.textContent;
  btnSelfTest.textContent = "Running…";

  try {
    // For now just re-run loadDashboard; you can extend to a deeper self-test later.
    await loadDashboard();
    alert("Self-test refreshed. Check the cards and guidance below.");
  } catch (e) {
    alert("Self-test failed: " + e.message);
  } finally {
    btnSelfTest.disabled = false;
    btnSelfTest.textContent = original;
  }
}

// Hook up buttons
if (btnSelfTest) btnSelfTest.addEventListener("click", runSelfTest);
if (btnRefresh) btnRefresh.addEventListener("click", loadDashboard);

// Initial load
loadDashboard();
