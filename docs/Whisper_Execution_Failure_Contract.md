# Whisper execution-failure contract

10 November 2026, candidate **2026-11-10.3**. Shared classification (.2) and separate durable execution history/recovery (.3) are implemented. **No new eligibility decisions, retries or cooldown are activated.**

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

Production wrapper annotations cover both platform reply/event handlers, local posting/state failures, load failure cleanup/rethrow, metadata/decode and app paragraph/save calls. Errors remain visible through the existing console/UI path. They are saved in the separate production execution journal and **never in the self-test report journal**. Unmodified worker replies still lack reliable structured runtime/network cause, and production watchdog/messageerror behavior is not added in this checkpoint. Existing model reuse, messages, model parameters and worker/fingerprint revisions are unchanged.

## Future decision policy — not activated

| Established event | Intended treatment |
|---|---|
| Input/preparation, cancellation, eligibility-check, paragraphing/export/save failure | Preserve model qualification; report the appropriate operation fault. |
| Established network/download fault | Preserve qualification; do not infer model failure. A generic error while loading does not establish this category. |
| Confirmed model/runtime execution failure | Withhold the exact configuration pending a qualifying manual retest. Need trustworthy source/type evidence first. |
| Unexplained worker/page loss during active model work | Suspend with cause unknown, preserving prior success and diagnostics. |
| Ordinary transcription success | Not a reference-test pass; must not grant or restore WER-based qualification. |

The present classifier does not pretend to distinguish confirmed model runtime errors from network failures when current workers only provide text. Review structured worker/library evidence before applying either rule. Existing self-test eligibility policy is unchanged; adopting this contract there requires a separate parity/behavior review. Do not create a conflicting second eligibility reducer.

## Durable execution records — .3

`whisperExecutions.js` owns `memora.whisper-execution.v1.*`, schema version 1 with explicit `origin: production`. No IndexedDB migration. Each record contains ID/build/page ID, wall-clock times, environment/browser, requested family, canonical definition snapshot/fingerprint, requested/effective operation recipe, last stage, model outcome, timings/diagnostics, terminal status and failure detail when present. No filename, audio samples or transcript/result object is stored. Diagnostic fields are projected; error messages/stacks are capped at 4,000/8,000 characters, with a truncation flag. Technical error strings can still contain incidental private details and should be reviewed before sharing.

Stages: prepare → metadata → decode → load → inference → model-complete → optional paragraphing → save → complete. The app's post-inference callback runs within the same journal ownership, but the original per-page Whisper activity scope ends after model work. A save/paragraphing failure or later page loss preserves modelOutcome:completed. Direct callers without the app callback record only their model workflow. File-input saving records local preparation/cache, not a later external share-sheet destination.

Keep the latest **20 terminal records plus active work**, pruning oldest terminal records under per-record Web Locks. Startup and history opening recover ownerless running records as interrupted, cause unknown. Live tabs are neither recovered nor cleared/pruned. Clearing finished history does not touch self-test reports, model caches, registry definitions, diagnostics logs or eligibility. Records are local to the browser/origin/profile and can be lost with website data/eviction.

In this observation-only checkpoint, unavailable storage/locking does not disable an otherwise working transcription: execution continues once, with a warning on its result/error. Failed writes can leave the last durable stage; recovery cannot invent later success. Before any eligibility integration, settle how an inability to persist model decisions should affect continuing work.

`whisperExecutionReports.js` supplies both views of the same saved record: Settings' collapsed Transcription execution history, and completed results' existing Timing and model diagnostics. Both have collapsed technical JSON, Copy and Download. The Settings view can clear completed history; old result links then show unavailable rather than export a stale copy. Copy denial exposes manual report text; Download reports only that a download was requested.

## Next checkpoints

1. Accept .3 with a short normal transcription/save and linked report/history/refresh check on Mac/iPhone. Do not manufacture crashes or revalidate models for this checkpoint.
2. Review trustworthy cause evidence and persistence-failure policy, then connect production records to the shared eligibility system. Ordinary success must not become a WER-qualified manual self-test. Known input/network/postprocessing faults must not disqualify a model. Unknown worker/page loss must retain uncertainty.
3. Keep cooldown, automatic retry/sequences, new production deadlines/cancellation and deeper resource diagnosis separately authorized.

## Verification

Build .3: 44 focused browser groups passed—seven execution journal/UI/navigation, four failure/workflow, six worker diagnostics, eight Settings, seven database integration, six production eligibility and six loader groups. Includes true page replacement while inference/save is active, another live owner, original save-failure classification, 20-record retention, storage/lock faults and shared Copy/Download/clear views. No real models or user-profile evidence changes. User .3 acceptance pending.


Thirty-four isolated browser groups passed: four failure-contract/workflow, six loader-gate (simulated iOS/desktop replies/events/posting failures, exact identity, reuse and cleanup), six worker/timing diagnostics, eight Settings, six production eligibility and four selector groups. Tests use injected dependencies, no real model execution or eligibility changes in the user's profile. The real worker scripts and canonical definitions are untouched. Device acceptance: one already-qualified short transcription on Mac and iPhone after publishing, including the usual save path; no deliberate Large/Medium crash or fresh self-test needed.
