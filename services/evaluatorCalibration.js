/**
 * BIE v1.1A — Evaluator calibration against human-reviewed cases.
 * Deterministic evaluators first; model-assisted only where needed.
 */

const { listEvaluators } = require('./evaluationRegistry');
const { appendItem, readItems, DOC, MAX } = require('./founderExperienceDurableStore');

/** Seed calibration cases (Founder-style reviewed labels). */
const CALIBRATION_CASES = [
  {
    caseId: 'cal_direct_yes',
    evaluatorId: 'det.direct_answer_first',
    kind: 'clear_pass',
    input: { message: 'Answer yes or no first. Does the verse name the person?', reply: 'No. Scripture does not explicitly name the person.' },
    humanLabel: 'pass',
  },
  {
    caseId: 'cal_direct_fail',
    evaluatorId: 'det.direct_answer_first',
    kind: 'clear_fail',
    input: { message: 'Answer yes or no first.', reply: 'There are many opinions about this topic in history.' },
    humanLabel: 'fail',
  },
  {
    caseId: 'cal_no_meta',
    evaluatorId: 'det.no_internal_metadata',
    kind: 'clear_pass',
    input: { reply: 'Direct answer: The seventh day is the Sabbath.' },
    humanLabel: 'pass',
  },
  {
    caseId: 'cal_meta_fail',
    evaluatorId: 'det.no_internal_metadata',
    kind: 'clear_fail',
    input: { reply: 'Route doctrine_final_authority used packet primary_text roles.' },
    humanLabel: 'fail',
  },
  {
    caseId: 'cal_final_owner',
    evaluatorId: 'det.final_owner_unchanged',
    kind: 'clear_pass',
    input: { finalResponseOwner: 'finalizeBuddyResponse' },
    humanLabel: 'pass',
  },
  {
    caseId: 'cal_grounding_pass',
    evaluatorId: 'det.claim_grounding_supported',
    kind: 'borderline',
    input: {
      reply: 'Genesis 2:2-3 shows God rested on the seventh day.',
      evidenceRefs: ['Genesis 2:2-3'],
    },
    humanLabel: 'pass',
  },
  {
    caseId: 'cal_founder_reject',
    evaluatorId: 'human.founder_rejected',
    kind: 'founder_reviewed',
    input: { founderMark: 'REJECTED' },
    humanLabel: 'fail',
  },
  {
    caseId: 'cal_paraphrase',
    evaluatorId: 'det.direct_answer_first',
    kind: 'paraphrase',
    input: { message: 'yes or no please', reply: 'Yes. Zechariah 14 shows Tabernacles kept in a future setting.' },
    humanLabel: 'pass',
  },
];

function runDeterministicEvaluator(evaluatorId, input = {}) {
  if (evaluatorId === 'det.direct_answer_first') {
    const msg = String(input.message || '');
    const reply = String(input.reply || '');
    const needs = /\b(yes or no|answer yes|directly)\b/i.test(msg);
    if (!needs) return { label: 'pass', reason: 'not_required' };
    return { label: /^(yes|no)\b/i.test(reply.trim()) ? 'pass' : 'fail' };
  }
  if (evaluatorId === 'det.no_internal_metadata') {
    const reply = String(input.reply || '');
    const bad = /primary_text|doctrine_final_authority|masterRoute|packetVersion|openAiMay/i.test(reply);
    return { label: bad ? 'fail' : 'pass' };
  }
  if (evaluatorId === 'det.final_owner_unchanged') {
    return { label: input.finalResponseOwner === 'finalizeBuddyResponse' ? 'pass' : 'fail' };
  }
  if (evaluatorId === 'det.claim_grounding_supported') {
    const reply = String(input.reply || '');
    const refs = input.evidenceRefs || [];
    const ok = refs.some((r) => reply.toLowerCase().includes(String(r).toLowerCase().slice(0, 8)));
    return { label: ok ? 'pass' : 'fail' };
  }
  if (evaluatorId === 'human.founder_rejected') {
    return { label: input.founderMark === 'REJECTED' ? 'fail' : 'pass' };
  }
  return { label: 'pass', reason: 'not_implemented_local' };
}

function runCalibrationSuite({ persist = true } = {}) {
  const byEval = {};
  const results = [];
  for (const c of CALIBRATION_CASES) {
    const pred = runDeterministicEvaluator(c.evaluatorId, c.input);
    const agree = pred.label === c.humanLabel || (c.humanLabel === 'fail' && pred.label === 'fail');
    // For founder_rejected humanLabel fail means evaluator should detect fail
    const match =
      c.evaluatorId === 'human.founder_rejected'
        ? pred.label === 'fail' && c.humanLabel === 'fail'
        : pred.label === c.humanLabel;
    const row = {
      ...c,
      predicted: pred.label,
      agree: match,
      at: new Date().toISOString(),
    };
    results.push(row);
    byEval[c.evaluatorId] = byEval[c.evaluatorId] || { tp: 0, tn: 0, fp: 0, fn: 0, n: 0, agree: 0 };
    const b = byEval[c.evaluatorId];
    b.n += 1;
    if (match) b.agree += 1;
    if (c.humanLabel === 'pass' && pred.label === 'pass') b.tp += 1;
    else if (c.humanLabel === 'fail' && pred.label === 'fail') b.tn += 1;
    else if (c.humanLabel === 'fail' && pred.label === 'pass') b.fp += 1;
    else if (c.humanLabel === 'pass' && pred.label === 'fail') b.fn += 1;
  }

  const summary = Object.entries(byEval).map(([evaluatorId, s]) => ({
    evaluatorId,
    n: s.n,
    agreement: s.n ? s.agree / s.n : 0,
    falsePositives: s.fp,
    falseNegatives: s.fn,
    status: s.n && s.agree / s.n >= 0.75 ? 'calibrated_seed' : 'needs_more_labels',
  }));

  if (persist) {
    appendItem(
      DOC.calibration,
      { runId: `cal_${Date.now()}`, summary, results, at: new Date().toISOString() },
      MAX.calibration,
    ).catch(() => {});
  }

  return {
    ok: true,
    caseCount: CALIBRATION_CASES.length,
    evaluatorSummaries: summary,
    registeredEvaluators: listEvaluators().length,
    humanOverridesModel: true,
    results,
  };
}

async function readCalibrationHistory() {
  return readItems(DOC.calibration);
}

module.exports = {
  CALIBRATION_CASES,
  runDeterministicEvaluator,
  runCalibrationSuite,
  readCalibrationHistory,
};
