# Phase 5B Live Route Trace Report

**Date:** 2026-06-14T05:48:17.022Z

## Route Owner

- **routeFile:** routes/buddy.js
- **exportedHandler:** POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime
- **runtimeCalled:** openAiFirstCompanionRuntime (buddyBrain.runBuddy hard cutover)

## Module Manifest

- **manifestOk:** true
- **gitCommit:** ce0826827cca

## Per-Message Traces

### OK — "Can we eat pork?"

```json
{
  "message": "Can we eat pork?",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": true,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "No. According to Scripture, pork is unclean. Leviticus 11:7 and Deuteronomy 14:8 say the swine is unclean and shall not be eaten. Scripture distinguishes clean ",
  "metadata": {
    "ok": true,
    "masterRoute": "doctrine_final_authority",
    "orchestratorLane": "strict_doctrine",
    "phase5A": true,
    "openAiCalled": false,
    "doctrineTopic": "dietary_law"
  }
}
```

### OK — "Acts 10"

```json
{
  "message": "Acts 10",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": true,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "Absolutely — staying with the Bible text: Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people",
  "metadata": {
    "ok": true,
    "masterRoute": "doctrine_final_authority",
    "orchestratorLane": "strict_doctrine",
    "phase5A": true,
    "openAiCalled": false,
    "doctrineTopic": "acts_10"
  }
}
```

### OK — "I had a bad day today."

```json
{
  "message": "I had a bad day today.",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": false,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "I'm sorry today was hard. I'm here with you. Want to tell me what happened?",
  "metadata": {
    "ok": true,
    "masterRoute": "companion_doctrine_release",
    "orchestratorLane": "companion_release",
    "openAiCalled": false,
    "doctrineTopic": null
  }
}
```

### OK — "Can we have sex without marriage?"

```json
{
  "message": "Can we have sex without marriage?",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": false,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "No. Scripture calls sexual relations outside marriage fornication and commands believers to flee it. 1 Corinthians 6:18 says flee fornication, 1 Thessalonians 4",
  "metadata": {
    "ok": true,
    "masterRoute": "bible_wide_reasoning",
    "orchestratorLane": "bible_wide",
    "phase5A": true,
    "openAiCalled": false,
    "doctrineTopic": null,
    "bibleConcept": "fornication_sexual_sin"
  }
}
```

### OK — "show me another verse about fornication?"

```json
{
  "message": "show me another verse about fornication?",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": false,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "Here is another Scripture witness on this topic: 1 Corinthians 6:18; 1 Thessalonians 4:3-5; Hebrews 13:4. No. Scripture calls sexual relations outside marriage ",
  "metadata": {
    "ok": true,
    "masterRoute": "bible_wide_continuation",
    "orchestratorLane": "bible_wide",
    "phase5A": true,
    "openAiCalled": false,
    "doctrineTopic": null,
    "bibleConcept": "fornication_sexual_sin"
  }
}
```

### OK — "Can you give me more scriptures with man staying on earth and the kingdom coming?"

```json
{
  "message": "Can you give me more scriptures with man staying on earth and the kingdom coming?",
  "routeFile": "routes/buddy.js",
  "exportedHandler": "POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime",
  "runtimeCalled": "openAiFirstCompanionRuntime",
  "orchestratorCalled": true,
  "strictGateCalled": false,
  "companionRouterCalled": true,
  "openAiFirstCalled": true,
  "reasonFirstCalled": false,
  "fallbackSource": null,
  "error": null,
  "replyPreview": "Here is another Scripture witness on this topic: Matthew 6:10; Revelation 5:10; Revelation 21:1-3. Yes — Scripture points to God’s kingdom coming to earth, not ",
  "metadata": {
    "ok": true,
    "masterRoute": "bible_wide_continuation",
    "orchestratorLane": "bible_wide",
    "phase5A": true,
    "openAiCalled": false,
    "doctrineTopic": "kingdom",
    "bibleConcept": "kingdom_on_earth"
  }
}
```

## Summary

- Traces: 6
- Fallbacks: 0
- Manifest OK: true