# Whisper execution-failure contract

10 November 2026, candidate **2026-11-10.7**. Shared classification (.2), separate durable history/recovery (.3) and structured worker provenance (.7) are implemented. **No new eligibility decisions, retries or cooldown are activated.**

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

Production wrapper annotations cover both platform reply/event handlers, local posting/state failures, load failure cleanup/rethrow, metadata/decode and app paragraph/save calls. Errors remain visible through the existing console/UI path. They are saved in the separate production execution journal and **never in the self-test report journal**. Legacy replies may lack typed details; the .7 envelope below preserves original error provenance conservatively. Production watchdog/messageerror behavior remains unchanged. Existing model reuse, messages, model parameters and worker/fingerprint revisions are unchanged.

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

## Next checkpoints — agreed 10 November 2026

1. **Reliable worker failure provenance—implemented in .7, acceptance pending; eligibility unchanged.** Preserve original error details and load/inference origin, exact canonical configuration and a versioned structured payload across both workers and parent adapters. Reuse `whisperFailures.js`; legacy messages remain unknown. Do not infer cause from wording or treat a generic JavaScript error name as proof of model incompatibility. Use injected worker/runtime/network/unknown/abort cases and normal success, avoiding intentional crashes. Explicitly review worker revisions/fingerprint freshness before changing the worker contract.
2. **Connect production observations to shared eligibility.** Evaluate on failure immediately and on startup recovery; refresh the dropdown after decisions. Existing loader rechecks and manual reference-pass recovery remain authoritative. Preserve eligibility for non-model faults, withhold only confirmed model failures, and suspend uncertain active-model interruption. Preserve completed model outcomes across postprocessing/page loss. Settle durable-write failure handling, event ordering and manual-pass precedence before activation. Ordinary success never becomes a reference pass.
3. Keep candidate discovery/preferred-variant selection, source-folder investigation, cooldown, automatic sequences/retry and production cancellation/deadline policies separate. No manual registry rebuild or external AI process is needed to consume evidence once checkpoint 2 is connected.

Classification/history/reporting are implemented. User confirmed the iOS .5 report-save fix and accepted .6 save-button emphasis. Mac execution JSON from Settings matched the completed transcript diagnostics. Dedicated refresh persistence was not explicitly reported; do not invent that result. No further code change is authorized by this contract alone.

## Verification

Build .3: 44 focused browser groups passed—seven execution journal/UI/navigation, four failure/workflow, six worker diagnostics, eight Settings, seven database integration, six production eligibility and six loader groups. Includes true page replacement while inference/save is active, another live owner, original save-failure classification, 20-record retention, storage/lock faults and shared Copy/Download/clear views. No real models or user-profile evidence changes. User .3 acceptance pending.


Thirty-four isolated browser groups passed: four failure-contract/workflow, six loader-gate (simulated iOS/desktop replies/events/posting failures, exact identity, reuse and cleanup), six worker/timing diagnostics, eight Settings, six production eligibility and four selector groups. Tests use injected dependencies, no real model execution or eligibility changes in the user's profile. The real worker scripts and canonical definitions are untouched. Device acceptance: one already-qualified short transcription on Mac and iPhone after publishing, including the usual save path; no deliberate Large/Medium crash or fresh self-test needed.

## iOS execution-report export — .5 follow-up

Execution report Save report uses the iOS file share sheet with a JSON File; desktop keeps Download report. There is no iOS blob-link fallback, after the user observed complete session loss on report download. Unsupported sharing offers Copy/inline text, cancellation is neutral, and completion means sharing returned, not independently verified destination. The same action is shared by normal-transcription diagnostics and Settings execution history. This does not change self-test export, model lifetime, eligibility or recording-source loading. The user subsequently confirmed the report-save fix preserves the iPhone session. Eight execution-report groups had passed with injected sharing paths. The separate 120-file source-folder symptom remains unresolved.

## Worker failure envelope — .7

Workers add `failure` beside legacy `type:error`/`message`. Envelope schema version 1 records exact configuration ID, stage, owning boundary (module-import/pipeline-create/pipeline-call/worker-state), observed kind (wasm-runtime-error/dom-exception/javascript-error/thrown-value) and original error name/message/stack/code. It does not alter inference requests, library selection, model loading, disposal or successful replies. Worker execution/protocol revisions remain 2 and declared fingerprints stay unchanged; the diagnostic envelope is separately versioned and does not require qualification invalidation.

Production decoders match ID and stage, validate stage/boundary consistency and schema, whitelist fields, then attach `workerEvidence` to the existing failure description. Missing legacy payloads, malformed/future payloads and identity mismatches receive explicit legacy/invalid/mismatched status and retain unknown cause. Worker ErrorEvent details preserve available original error/script location with event-only status, not runtime-cause certainty.

The worker distinguishes actual WebAssembly.RuntimeError instances from generic names/text. Matching observed runtime instances are described as runtime-failure/type-observed, not universal incompatibility or an identified memory/hardware fault. TypeError and NetworkError alone remain uncertain; no keyword parsing or automatic eligibility decisions are added. Production preserves original AbortError without assigning user intent. Self-tests retain the legacy outer Error/verdict semantics, attaching richer diagnostics as `result.error.failure`; a worker AbortError/TimeoutError must not silently become a user cancellation/deadline verdict. Ordinary production success still cannot qualify a model.

Production journal truncation covers both root and nested worker diagnostics. The self-test eligibility reducer is unchanged; richer fields are observational until the separately reviewed integration. .7 verification: 104 focused browser groups passed, including actual worker source with injected load/inference/module-import faults, typed parent round-trip, legacy/mismatch handling and self-test verdict parity. User Mac/iPhone normal transcription/save acceptance is pending; no real failure or fresh reference test is requested.
