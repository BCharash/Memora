# Whisper execution-failure contract

10 November 2026, candidate **2026-11-10.2**. First checkpoint implemented: pure shared classification and production error annotations. **No new eligibility decisions, persistence, interruption recovery, retries or cooldown are activated.**

## One authority per responsibility

Canonical definitions remain in `whisperConfigurations.js`. `whisperFailures.js` owns the shared boundary/category vocabulary and error annotation. Execution evidence belongs to a future durable execution record, while permission remains owned by the existing eligibility system. A local failure never edits global model definitions or establishes universal device incompatibility.

The first checkpoint keeps original user-facing error messages and attaches `error.whisperFailure`. Original error identity/details are retained through `cause` and serialized name/message/stack. The description and diagnostic payload are frozen. Outer workflow catches preserve more specific inner worker evidence. No audio/transcript bytes are included in this description.

## Implemented description, schema version 1

| Field | Meaning |
|---|---|
| `stage` | metadata, decode, eligibility, load, inference, paragraphing or save. |
| `source` | workflow, eligibility, worker-reply, worker-event or loader boundary. |
| `configurationId` | Canonical exact ID when the loader knows it; null where not yet established. Never invent one from a family name. |
| `category` | input-preparation, post-processing, eligibility-check, aborted, worker-failure or unknown. |
| `certainty` | boundary-known or unknown. A known stage does not establish the underlying root cause. |
| `error` | Original name/message/stack where available; thrown non-Error values remain representable. |

Metadata/decode errors are preparation boundaries. Paragraphing/save errors occur after Whisper work. Qualification/storage refusal at the production gate is an eligibility-check error, not model execution evidence. Worker replies/events are reported failures with unknown root cause. A load error might arise from downloads, scripts, resources or inference-library setup. Error-message keyword matching is deliberately absent. `AbortError` means aborted, with unknown intent; it is not proof that the user clicked Cancel. Normal production does not currently expose a cancellation protocol.

Production wrapper annotations cover both platform reply/event handlers, local posting/state failures, load failure cleanup/rethrow, metadata/decode and app paragraph/save calls. Errors remain visible through the existing console/UI path. They are **not saved to the self-test report journal**. Unmodified worker replies still lack reliable structured runtime/network cause, and production watchdog/messageerror behavior is not added in this checkpoint. Existing model reuse, messages, model parameters and worker/fingerprint revisions are unchanged.

## Future decision policy — not activated

| Established event | Intended treatment |
|---|---|
| Input/preparation, cancellation, eligibility-check, paragraphing/export/save failure | Preserve model qualification; report the appropriate operation fault. |
| Established network/download fault | Preserve qualification; do not infer model failure. A generic error while loading does not establish this category. |
| Confirmed model/runtime execution failure | Withhold the exact configuration pending a qualifying manual retest. Need trustworthy source/type evidence first. |
| Unexplained worker/page loss during active model work | Suspend with cause unknown, preserving prior success and diagnostics. |
| Ordinary transcription success | Not a reference-test pass; must not grant or restore WER-based qualification. |

The present classifier does not pretend to distinguish confirmed model runtime errors from network failures when current workers only provide text. Review structured worker/library evidence before applying either rule. Existing self-test eligibility policy is unchanged; adopting this contract there requires a separate parity/behavior review. Do not create a conflicting second eligibility reducer.

## Next checkpoints

1. Review this classification checkpoint and a normal successful transcription. No deliberate failures or model revalidation are required.
2. Extend trustworthy error provenance as needed and connect reviewed production evidence to the shared eligibility policy, using injected faults. Production outcomes must carry an explicit origin/type and must never be interpreted as legacy manual self-test passes. A success without reference WER is not qualifying evidence.
3. Add separate durable production ownership/stage recovery, scoped to exact identity. Checkpoint before load/inference and finish model work before paragraphing/saving, so a later export/page fault cannot suspend Whisper incorrectly. Protect live tabs, preserve ordering and report persistence failures. Existing self-test journaling/reducer assumptions cannot be reused blindly.

Automatic sequences, normal-transcription cancellation/timeouts and cooldown are separate scope. No storage/schema reset is needed.

## Verification

Thirty-four isolated browser groups passed: four failure-contract/workflow, six loader-gate (simulated iOS/desktop replies/events/posting failures, exact identity, reuse and cleanup), six worker/timing diagnostics, eight Settings, six production eligibility and four selector groups. Tests use injected dependencies, no real model execution or eligibility changes in the user's profile. The real worker scripts and canonical definitions are untouched. Device acceptance: one already-qualified short transcription on Mac and iPhone after publishing, including the usual save path; no deliberate Large/Medium crash or fresh self-test needed.
