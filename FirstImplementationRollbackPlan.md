# First Implementation Rollback Plan

**Phase:** 2K Part H
**Date:** 2026-06-09T03:09:13.754Z

## services/evidenceCards/sabbath.card.js
- Candidates: exp_0001, exp_0007
- Instruction: Remove from supportingScriptures: Acts 13:42-44, Revelation 14:12

## services/evidenceCards/deathState.card.js
- Candidates: rec_0017, rec_0006
- Instruction: Remove from supportingScriptures: Genesis 3:19, Job 14:10-15, Psalm 6:5, Psalm 115:17, Psalm 146:3-4, Ecclesiastes 3:19-21, Ecclesiastes 9:4-10, Daniel 12:2-3

## services/approvedSupportGraph.js
- Candidates: exp_0005
- Instruction: Delete edge block with id 'rev1_alpha_omega_logos_g2r_batch'

**Full revert:** `git checkout -- services/evidenceCards/sabbath.card.js services/evidenceCards/deathState.card.js services/approvedSupportGraph.js`
