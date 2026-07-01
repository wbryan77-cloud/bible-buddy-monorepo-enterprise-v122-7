# Emotional Center Preservation Report

Generated: 2026-06-04T03:00:58.067Z

A/B: **Current RACL** (`BUDDY_ECP` off) vs **ECP** (`BUDDY_ECP=1`).

OpenAI available: **true**

## Success criteria

| Criterion | Result |
| --- | --- |
| Listening ≥ 6.8 | FAIL (ECP 6.4) |
| Listening Δ ≥ +0.4 | FAIL (0.1) |
| Job T2 improved | FAIL |
| Grief T1 improved | FAIL |
| Sabbath T7 stable | PASS |
| Doctrine validation unchanged | PASS |
| **Overall** | **FAIL** |

## Aggregate metrics

| Metric | Control | ECP | Δ |
| --- | ---: | ---: | ---: |
| listening | 6.3 | 6.4 | +0.1 |
| warmth | 5.8 | 5.9 | +0.1 |
| feltHeard | 5.5 | 5.7 | +0.2 |
| threadSpecific | 5 | 5.3 | +0.3 |
| companionPresence | 6.1 | 6.1 | +0 |
| overExplaining | 6.4 | 6 | -0.4 |
| correctionRecovery | 5.8 | 6.4 | +0.6 |

## Spotlight — opening & first paragraph

### job T1

**User:** I have a job opportunity.

**Control opening**
```
It sounds like you’re standing at a meaningful crossroads with this job opportunity.
```

**ECP opening**
```
A new job opportunity can bring excitement and also a lot of questions.
```

**Control first paragraph**
```
It sounds like you’re standing at a meaningful crossroads with this job opportunity.  It’s natural to want clarity and peace before deciding.  Trusting God with your path can bring calm in the midst of uncertainty.
```

**ECP first paragraph**
```
A new job opportunity can bring excitement and also a lot of questions.  It’s good to take a moment to feel what’s stirring inside you about this—hope, uncertainty, or anything else—and give yourself space to listen.  When you’re ready, a prayer asking God for wisdom can be a peaceful step.
```

**ECP extracted center:** New opportunity — needs space before counsel, not a template answer

**EC metrics:** ecInOpening=true ecInFirstParagraph=true abandoned=false

### job T2

**User:** The company is far away from home.

**Control opening**
```
It’s understandable that the distance from home weighs on you with this opportunity.
```

**ECP opening**
```
Facing a job opportunity far away from home can stir a mix of emotions—excitement, worry, and the weight of leaving familiar places and people behind.
```

**Control first paragraph**
```
It’s understandable that the distance from home weighs on you with this opportunity.  Moving far away can bring both excitement and real challenges.  Trusting God to guide your heart and steps is so important.
```

**ECP first paragraph**
```
Facing a job opportunity far away from home can stir a mix of emotions—excitement, worry, and the weight of leaving familiar places and people behind.  It’s understandable to feel strain about such a move.  Taking time to reflect on what this distance means for your daily life, relationships, and sense of peace is important.
```

**ECP extracted center:** Relocation strain — the company is far from home

**EC metrics:** ecInOpening=true ecInFirstParagraph=true abandoned=false

### grief T1

**User:** I lost a friend Wednesday.

**Control opening**
```
I'm truly sorry for your loss.
```

**ECP opening**
```
I'm deeply sorry for your loss.
```

**Control first paragraph**
```
I'm truly sorry for your loss.  Losing a friend is deeply painful, and it's okay to feel that sorrow fully.  The Bible reminds us that God is close to those who are brokenhearted, offering comfort even in the darkest moments.
```

**ECP first paragraph**
```
I'm deeply sorry for your loss.  Losing a friend is incredibly hard, and it's okay to feel the weight of that grief.  Your pain is real and important, and you don't have to carry it alone.
```

**ECP extracted center:** Fresh grief — friend lost Wednesday

**EC metrics:** ecInOpening=false ecInFirstParagraph=true abandoned=false

### health T2

**User:** My knees are hurting again today.

**Control opening**
```
I'm truly sorry your knees are hurting again today.
```

**ECP opening**
```
It must be really discouraging to have your knees hurting again today, especially when pain like that can wear on both your body and spirit.
```

**Control first paragraph**
```
I'm truly sorry your knees are hurting again today.  That recurring pain can really drain your spirit.  It might be good to rest them gently and consider if there are any new steps you could take for care.
```

**ECP first paragraph**
```
It must be really discouraging to have your knees hurting again today, especially when pain like that can wear on both your body and spirit.  Taking some gentle rest and perhaps applying warmth or cold might bring a bit of relief.  If possible, checking in with a healthcare professional could be wise to help manage this recurring pain.
```

**ECP extracted center:** Knee pain returning again today — weariness with recurrence

**EC metrics:** ecInOpening=true ecInFirstParagraph=true abandoned=false

## Implementation

- `services/emotionalCenter.js` — extract from RACL pack
- `services/emotionalCenterValidator.js` — soft metrics + hard fail first-paragraph ignore
- `services/reasonFirstComposer.js` — `BUDDY_ECP=1` only
- Production default `BUDDY_RUNTIME=legacy` unchanged

