// admin/js/activity.js
// Simple viewer for /admin/api/activity

async function loadActivity() {
  const tbody = document.getElementById("activityBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;

  try {
    const res = await fetch("/admin/api/activity");
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No activity recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    rows
      .slice()
      .reverse() // newest first
      .forEach((r) => {
        const tr = document.createElement("tr");
        const cells = [
          r.timestamp || "",
          r.tenant || "",
          r.theme || "",
          r.label || "",
          r.action || "",
        ];
        cells.forEach((c) => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">Error loading activity: ${e.message}</td></tr>`;
  }
}

const btnRefresh = document.getElementById("refreshActivity");
if (btnRefresh) btnRefresh.addEventListener("click", loadActivity);

loadActivity();
