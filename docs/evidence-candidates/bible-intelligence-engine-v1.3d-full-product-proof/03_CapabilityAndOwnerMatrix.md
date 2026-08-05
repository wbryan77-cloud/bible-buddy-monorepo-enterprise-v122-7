# BIE V1.3D — Capability and Owner Matrix

**Status:** EVIDENCE-BASED

| Capability | Logical owner | Transport | Evidence |
|---|---|---|---|
| Chat response | `liveResponseOwner.finalizeLiveResponse` | `routes/buddy.js` POST `/chat` | traced path |
| Stream response | final response path | `routes/buddy.js` `/stream` | local repair pending deploy |
| Companion routing | `bibleCompanionOrchestrator` | chat runtime | corpus/memory logs |
| Admin authorization | shared `checkAdminAuth` | Mission Control / Command Center | auth probe |
