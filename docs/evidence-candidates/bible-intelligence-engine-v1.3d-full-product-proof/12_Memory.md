# BIE V1.3D — Memory and Forget Semantics

**Status:** PASS / REPAIR PENDING DEPLOY

Memory certification passed 16/16. The corpus forget case failed due to selector/routing/ack wording, not a demonstrated persistence failure. Local repair broadens `isForgetRequest`, emits a forget/memory acknowledgement, routes through `companion_personal_forget`, and treats “forget what I told” as `memory_update`.
