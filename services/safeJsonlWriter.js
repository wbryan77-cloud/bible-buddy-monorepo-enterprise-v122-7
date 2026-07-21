/**
 * Phase 4F — Safe JSONL append (never crash request on log failure).
 */

const fs = require('fs');
const path = require('path');

const MAX_LOG_LINE_BYTES = Number(process.env.BIBLEBUDDY_MAX_JSONL_LINE_BYTES || process.env.BIBLEBUDDY_MAX_LOG_LINE_BYTES || 12000);
const MAX_JSONL_FILE_BYTES = Number(process.env.BIBLEBUDDY_MAX_JSONL_BYTES || 5 * 1024 * 1024);
// Architecture Verification cleanup finding: rotation previously kept every
// `.bak` forever (one file grew to >1GB locally before being noticed).
// Bounded retention keeps the safety net without unbounded disk growth.
const MAX_ROTATED_BACKUPS = Number(process.env.BIBLEBUDDY_MAX_JSONL_BACKUPS || 3);

function truncateForLog(value, maxBytes = MAX_LOG_LINE_BYTES) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
  return `${str.slice(0, Math.max(0, maxBytes - 20))}…[truncated]`;
}

function slimEntry(entry = {}) {
  const out = { ...entry };
  if (out.message) out.message = truncateForLog(out.message, 400);
  if (out.reply) out.reply = truncateForLog(out.reply, 600);
  if (out.structured) delete out.structured;
  if (out.runtimeContext) delete out.runtimeContext;
  if (out.responseBody) delete out.responseBody;
  if (out.coreDebug) delete out.coreDebug;
  if (out.liveRequestTrace) delete out.liveRequestTrace;
  return out;
}

function pruneOldBackups(filePath) {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const prefix = `${base}.`;
    const backups = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.bak'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    backups.slice(MAX_ROTATED_BACKUPS).forEach(({ name }) => {
      fs.unlinkSync(path.join(dir, name));
    });
  } catch (e) {
    console.warn('[safeJsonl] prune old backups failed:', e.message);
  }
}

function rotateIfNeeded(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size <= MAX_JSONL_FILE_BYTES) return;
    const rotated = `${filePath}.${Date.now()}.bak`;
    fs.renameSync(filePath, rotated);
    pruneOldBackups(filePath);
  } catch (e) {
    console.warn('[safeJsonl] rotate failed:', e.message);
  }
}

function appendJsonlSafe(filePath, entry = {}) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    rotateIfNeeded(filePath);
    const slim = slimEntry(entry);
    const line = truncateForLog({ ts: new Date().toISOString(), ...slim });
    fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    return true;
  } catch (e) {
    console.warn(`[safeJsonl] write failed (${path.basename(filePath)}):`, e.message);
    return false;
  }
}

module.exports = {
  MAX_LOG_LINE_BYTES,
  truncateForLog,
  slimEntry,
  appendJsonlSafe,
};
