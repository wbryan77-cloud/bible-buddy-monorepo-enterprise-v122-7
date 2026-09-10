# Holy Testaments → BibleBuddy Diagnostic and Integration Report

## Executive decision

The three volumes are useful as a **claim-discovery and cross-reference source**, but they should not be loaded into BibleBuddy as doctrine or as a trusted historical database. They contain many Scripture chains worth testing, alongside high-risk conclusions involving identity, cosmology, medicine, salvation, marriage, the Godhead, and prophecy. The correct use is: extract claims → independently verify → create evidence cards → human approve → then activate narrowly.

## Verified corpus facts

- 3 distinct EPUB volumes.
- 84 ordered sections: Volume 1 = 26, Volume 2 = 24, Volume 3 = 34.
- Programmatic extraction found **1,713 explicit book/chapter/verse occurrences** (Volume 1: 601; Volume 2: 494; Volume 3: 618).
- 1,466 unique normalized reference strings were identified. Reference normalization still requires human review for malformed typography, implied continuations, and citations written without a repeated book name.

## What BibleBuddy can use now

1. The 84-section map as a research queue.
2. The 1,713-occurrence Scripture ledger as candidate evidence links, not conclusions.
3. The unique-reference index for deduplication and coverage analysis.
4. The external-reference candidate ledger to locate books, websites, historical claims, and scientific claims requiring verification.
5. The ingestion JSONL to register each chapter as an attributed secondary source with strict authority limits.
6. The evidence-card schema to route claims into the existing governance system.

## Non-negotiable guardrails

- Never answer “the Bible says” when the source is only Sha-hid Ealy’s interpretation.
- Every doctrine must be grounded in the biblical passage itself, its immediate context, the whole book, and the full canon.
- Every Hebrew/Greek claim must cite a recognized text/lexicon and account for grammar, not only a Strong’s number.
- Historical, ethnic, genetic, scientific, and medical claims require independent specialist evidence.
- Contested conclusions must be labeled as contested and show meaningful counterevidence.
- High-risk chapters must remain sandbox-only until human approval.

## Highest-priority review clusters

### Critical: factual harm or major misinformation risk
- Flat Earth
- Jesus in the Sky Approximately Six Months
- Physical Israel’s Color; Israel Slavery; Who Is Israel?; Hebrew Is Israel Only; Chosen People; Esau’s Demise
- Healing and Health

### High: major doctrinal consequences
- Sabbath Day; Dietary Law; Holy Feast Days
- No Man to the 3rd Heaven
- Jesus Is God; The Holy Ghost; The Godhead
- Not Saved by Grace
- Multiple Wives; Homosexuality
- Spiritual Israel; Will Only Israel Get Salvation?
- Becoming Gods
- Holy Bible Inspired by God

## Required verification workflow

1. Parse each chapter into atomic claims.
2. Link every claim to exact source location and cited verses.
3. Retrieve full KJV context plus OSHB/SBLGNT where wording matters.
4. Build supporting and challenging canonical chains from Genesis through Revelation.
5. Verify factual claims against primary and academic sources.
6. Assign confidence and uncertainty.
7. Require human approval.
8. Activate only the approved claim/evidence pair; preserve author attribution in provenance.

## BibleBuddy policy insertion

Treat Holy Testaments Volumes 1–3 as attributed secondary commentary. Use them to discover questions, claims, and possible Scripture chains. Never adopt a conclusion solely because it appears in these books. Verify each claim from the biblical text in context, full-canon cross-references, original-language evidence where material, and independent historical/scientific sources where applicable. Clearly distinguish explicit Scripture, inference, tradition, history, and speculation. Surface substantial counterevidence and uncertainty. Do not make medical, ethnic-identity, scientific, or salvation-status conclusions from these books without human-approved evidence cards.

## Production gates

- `source_ingested=true` does not imply `claim_verified=true`.
- `claim_verified=true` requires evidence review.
- `humanApproved=true` is mandatory for doctrine activation.
- `productionApplied=false` by default.
- Any update affecting identity, medicine, sexuality, salvation, cosmology, or interfaith claims requires enhanced review.

## Section inventory summary

### Volume 1
SABBATH DAY; DIETARY LAW; NO MAN TO THE 3RD HEAVEN; JESUS IS GOD; DREADFUL JESUS/GOD; DIVIDING FAMILIES; HUSBAND’S DUTIES; WIFE’S DUTIES; CHILDREN’S DUTIES; MARRIAGE (MAN AND WOMAN); MULTIPLE WIVES; HOMOSEXUALITY; OPEN REBUKE; COMMANDMENTS; NOT SAVED BY GRACE; HOLY BIBLE INSPIRED BY GOD; PHYSICAL ISRAEL’S COLOR; ISRAEL SLAVERY; MARRIAGE (GOD AND ISRAEL); SPIRITUAL ISRAEL; WILL ONLY ISRAEL GET SALVATION?; BECOMING GODS; LAKE OF FIRE; JESUS REIGN OF EARTH.

### Volume 2
EATING (HEARING & READING) DOCTRINE; FORNICATION (FLESH); FILTHY COMMUNICATION; TALEBEARERS (AND FALSE WITNESSES); EVIL SPIRITS (ANGELS); HOW TO PRAY; TRUE WISDOM; LAST DAYS; THE WILDERNESS; SATAN’S WORLD POWER; FALSE PROPHETS; PRIESTS OF ISRAEL; WINE & STRONG DRINK; ACTUAL BORN AGAIN; SIN AND DISOBEDIENCE; BAPTISM; THE HOLY GHOST; SPEAKING IN TONGUES; TRUE RICHES & WEALTH; PERFECTION TO GOD; MELCHIZEDEK (JESUS); THE GODHEAD.

### Volume 3
FRUIT OF THE SPIRIT; GOD’S NAME IN VAIN; FASTING; PROPHECY OF JESUS; WHO IS ISRAEL?; HOLY ANGELS; UNDERSTANDING LAW; FAITH; GOD’S REWARDS; TRADITIONS OF MAN; HOLY FEAST DAYS; FOUR BEASTS; HEAVEN & EARTH ARE DIFFERENT; ANIMAL SACRIFICES STOP; CIRCUMCISION; FLAT EARTH; CHRISTIAN PERSECUTION; ISRAEL’S BLESSINGS; ISRAEL’S CURSES; TITHES AND OFFERING; WEARING FRINGES; DEBATING ABOUT GOD’S WORD; JESUS’ APPEARANCE; SONS OF GOD; HEBREW IS ISRAEL ONLY; CHOSEN PEOPLE; ESAU’S DEMISE; JESUS IN THE SKY APPROX. 6 MONTHS; TATTOOS AND CUTTING HAIR/BEARDS; UNBELIEVING JEW IS NOT A GENTILE; HEALING AND HEALTH; REPENTANCE.

## Status

Extraction and triage are complete. Verse-by-verse doctrinal adjudication, historical source recovery, original-language analysis, scientific/medical verification, and human approval remain separate gates. This file must not be interpreted as doctrine promotion.
