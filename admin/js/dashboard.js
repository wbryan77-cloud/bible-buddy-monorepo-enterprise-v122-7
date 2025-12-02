// dashboard.js — Clean, fixed, fully wired Admin Dashboard for Bible Buddy v122+

// Utility: simple GET helper
async function apiGet(path) {
    const res = await fetch(`/admin/api/${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

// Utility: POST helper
async function apiPost(path, body = {}) {
    const res = await fetch(`/admin/api/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API POST error: ${res.status}`);
    return await res.json();
}

// Elements
const statusTable = document.getElementById("statusTable");
const selfTestBtn = document.getElementById("runSelfTestBtn");
const coachBtn = document.getElementById("aiCoachBtn");
const testerBtn = document.getElementById("testerChatBtn");

// Load dashboard status
async function loadStatus() {
    statusTable.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

    try {
        const [health, providers, queue] = await Promise.all([
            apiGet("selftest"),
            apiGet("providers"),
            apiGet("queue")
        ]);

        statusTable.innerHTML = `
            <tr>
                <td>health</td>
                <td>${health.ok ? "✔️" : "❌"}</td>
                <td>${health.detail || "OK"}</td>
            </tr>
            <tr>
                <td>providers</td>
                <td>${providers.ok ? "✔️" : "❌"}</td>
                <td>${providers.detail}</td>
            </tr>
            <tr>
                <td>queue</td>
                <td>${queue.ok ? "✔️" : "❌"}</td>
                <td>count=${queue.count}</td>
            </tr>
        `;

    } catch (e) {
        statusTable.innerHTML = `
            <tr><td colspan="3">Error loading dashboard: ${e.message}</td></tr>
        `;
    }
}

// Run self test
async function runSelfTest() {
    selfTestBtn.disabled = true;
    selfTestBtn.innerText = "Running…";

    try {
        const result = await apiGet("selftest?force=1");
        alert("Self-test finished:\n" + JSON.stringify(result, null, 2));
    } catch (e) {
        alert("Self-test failed:\n" + e.message);
    }

    selfTestBtn.disabled = false;
    selfTestBtn.innerText = "Run Self-Test";
}

// AI Deployment Coach
async function openAICoach() {
    const res = await apiGet("coach");
    alert("AI Deployment Coach:\n" + res.message);
}

// Tester Chat
async function openTesterChat() {
    const res = await apiGet("tester");
    alert("Tester Chat:\n" + res.message);
}

// Hook up buttons
if (selfTestBtn) selfTestBtn.onclick = runSelfTest;
if (coachBtn) coachBtn.onclick = openAICoach;
if (testerBtn) testerBtn.onclick = openTesterChat;

// Initial load
loadStatus();
