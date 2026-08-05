# 24 — Security Threat Review

| Threat | Mitigation |
|---|---|
| Learning bypasses governance | mutationFlags forced false; approval ≠ deploy |
| Admin AI self-approve | no self-approve path; human Decision Queue required |
| Private data leak via telemetry | fingerprints/redaction; admin-auth on read APIs |
| Unapproved evidence activation | shadow lab cannot promote; Decision Queue cannot activate evidence from FEL approve |
| Auth bypass on Founder APIs | `checkAdminAuth` fail-closed |
