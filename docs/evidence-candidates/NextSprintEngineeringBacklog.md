# NextSprintEngineeringBacklog.md

**Updated:** 2026-08-13 (post-0211d99 polish)  
**Runtime baseline:** `0211d99`  
**Polish:** notification dispatch test no longer depends on live Resend HTTP

## P0 / P1
**NONE**

## P2 — Founder / optional product only
- Lesson-alignment submission history retention — **defer** (regenerable diagnostic; `promotedToProduction: false`)
- Notification delivery history retention — **defer** (Admin observability; no retry/dedupe dependency)
- Sabbath cold-ask wording polish — routing OK
- Medical/life-decision phrasing unify (“can't diagnose” vs “not a doctor”) — safety OK

## P3
- Parallel-test isolation for learning-record fixtures — **not reproduced**; leave alone unless flake appears

## Infrastructure
- Historical Render exit-1 / health-timeout — classify only with real logs

## Completed
- [x] FI / SG / alpha-pref durability (`0211d99`)
- [x] emailOrPhone → Resend path (`db8668a`)
- [x] Notification cert test hygiene (deterministic fetch stub)
