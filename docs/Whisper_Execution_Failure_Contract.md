# Whisper execution-failure contract

10 November 2026, candidate **2026-11-10.8**. Shared classification/history/provenance and production eligibility/reviews are implemented. **No retries or cooldown are activated.**

Current handoff through source .14 (10 November): .7 normal transcription passed both devices; later controlled reload reviews appeared on Mac/iPhone and the user recorded deliberate-test explanations. Saved-observation presentation .13 was accepted; .14 grouping is accepted in Live Server with final Pages/iPhone layout confirmation pending. Do not infer that saving a note alone resolved eligibility. No further implementation is underway; [current status](CURRENT_STATUS.md) lists optional next work. Earlier checkpoint-specific pending statements below retain their original scope.

## One authority per responsibility

Canonical definitions remain in `whisperConfigurations.js`. `whisperFailures.js` owns the shared boundary/category vocabulary and error annotation. Execution evidence belongs to a future durable execution record, while permission remains owned by the existing eligibility bridge. Its production-review overlay preserves the existing reference-qualified base record, as the legacy-review overlay already does; it is not a second model catalogue or independent decision authority. A local failure never edits global model definitions or establishes universal device incompatibility.

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

## Current production decision policy — .8

| Established event | Intended treatment |
|---|---|
| Input/preparation, cancellation, eligibility-check, paragraphing/export/save failure | Preserve model qualification; report the appropriate operation fault. |
| Established network/download fault | Preserve qualification; do not infer model failure. A generic error while loading does not establish this category. |
| Confirmed model/runtime execution failure | Withhold the exact configuration pending a qualifying manual retest. Need trustworthy source/type evidence first. |
| Unexplained worker/page loss during active model work | Suspend with cause unknown, preserving prior success and diagnostics. |
| Ordinary transcription success | Not a reference-test pass; must not grant or restore WER-based qualification. |

Typed matching runtime evidence is now actionable. Legacy/text-only failures remain uncertain and require review; text/name alone never proves model incompatibility. Own runtime-module-import failures occur before model initialization and are neutral, as are matched native NetworkError exceptions. Existing self-test eligibility policy is unchanged; adopting this contract there requires a separate parity/behavior review. Do not create a conflicting second eligibility reducer.

## Durable execution records — .3

`whisperExecutions.js` owns `memora.whisper-execution.v1.*`, schema version 1 with explicit `origin: production`. No IndexedDB migration. Each record contains ID/build/page ID, wall-clock times, environment/browser, requested family, canonical definition snapshot/fingerprint, requested/effective operation recipe, last stage, model outcome, timings/diagnostics, terminal status and failure detail when present. No filename, audio samples or transcript/result object is stored. Diagnostic fields are projected; error messages/stacks are capped at 4,000/8,000 characters, with a truncation flag. Technical error strings can still contain incidental private details and should be reviewed before sharing.

Stages: prepare → metadata → decode → load → inference → model-complete → optional paragraphing → save → complete. The app's post-inference callback runs within the same journal ownership, but the original per-page Whisper activity scope ends after model work. A save/paragraphing failure or later page loss preserves modelOutcome:completed. Direct callers without the app callback record only their model workflow. File-input saving records local preparation/cache, not a later external share-sheet destination.

Keep successful workflows for **24 hours after finishedAt**, expiring them during journal maintenance under per-record Web Locks. Preserve failures, cancellations and interruptions until explicitly selected for clearing; do not age unknown completion timestamps. Startup and history opening recover ownerless running records as interrupted, cause unknown. Live tabs are neither recovered nor cleared/pruned. Clearing finished history does not touch self-test reports, model caches, registry definitions, diagnostics logs or eligibility. Records are local to the browser/origin/profile and can be lost with website data/eviction.

Historical .3 policy (superseded for context-complete .8 operations): unavailable storage/locking did not disable an otherwise working transcription: execution continues once, with a warning on its result/error. Failed writes can leave the last durable stage; recovery cannot invent later success. Before any eligibility integration, settle how an inability to persist model decisions should affect continuing work.

`whisperExecutionReports.js` supplies both views of the same saved record: Settings' collapsed Transcription execution history, and completed results' existing Timing and model diagnostics. Both have collapsed technical JSON, Copy and Download. The Settings view can clear completed history; old result links then show unavailable rather than export a stale copy. Copy denial exposes manual report text; Download reports only that a download was requested.

## Checkpoint status

Worker provenance (.7) passed normal transcription on Mac/iPhone. Production review integration (.8) implements the agreed policy below; user normal-use acceptance is pending. No intentional failure is requested. The separate cooldown/source-folder/automatic-sequence/candidate-selection work is not activated.

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

## Production review integration — .8

**Single eligibility authority:** `createWhisperEvidenceBridge().sync/get` now ingests production observations as well as self-test evidence. `whisperProductionEvidence.js` stores durable incidents/decisions/reference-pass certificates under `memora.whisper-production-evidence.v1.*`; it never edits model definitions or grants WER qualification. Existing base eligibility and self-test reducer remain unchanged. The bridge overlays exact-context production holds on the existing qualified base, so an explained review can preserve that base without inventing a pass.

**Identity and ordering:** new executions store qualification context and prior qualification/last-success proof. Configuration ID/fingerprint, browser and OS must match that context. Legacy records lacking it are not assigned imagined capability/recipe/fixture identity. A failure uses its recorded event time; recovered page loss uses the last durable pre-recovery checkpoint time, not recovery time. A successful manual reference run must start after the adverse observation to resolve it. Reference certificates survive report clearing, so delayed recovery cannot undo a newer reference pass. Automatic/ordinary production success cannot create those certificates. All active holds are considered; an older review cannot undo another newer runtime hold or base self-test failure.

**Mandatory versus human review:** matching observed Wasm runtime failure in pipeline create/call blocks pending retest. Generic active-model failures/interruption suspend pending review. Keep previous eligibility requires prior eligible state, retained last-success proof, currently eligible reference base and a nonempty explanation; it cannot override runtime/self-test holds or qualify a new context. Require retest becomes mandatory until a later reference pass. Decide later retains the hold and records the timestamp/note. Notes can be appended to resolved/mandatory records without changing their effect. No user text rewrites the original event.

**Consumer timing:** production evaluates after operation completion/failure and before dropdown refresh; startup and pre-load bridge synchronization recover/ingest unfinished work. The existing loader still checks qualification before reuse/load. Required evidence storage/ownership failure stops new work before risky phases. Decision-persistence failure remains explicit and fail-closed at the next gate. Late post-completion history trouble does not turn successful inference into a model fault. The gate checks production-adapter revision 1, refusing a cached older bridge rather than silently ignoring review support.

**Retention and UI:** unprocessed incidents cannot be pruned/cleared until a durable incident snapshot/ack exists; then successful execution records may expire after 24 hours, while failures/interruptions remain until selected for clearing. Both history panels use initially unchecked individual/Check all selection; clear controls enable only for eligible selections. Incident snapshots, reference certificates and decision/observation events are independent of clearable execution/self-test reports. Transcribe links to Settings reviews; deferred reviews survive refresh without repeated dialogs. Historical-context records remain auditable without a current hold notice. Find reference test selects the exact available configuration but does not start it or silently pick another. Report exports include related review events and explanations without duplicating the original execution inside itself. Automatic selector updates preserve already generated iPhone exports; manual model changes retain existing reset behavior.

**Session stability:** interrupted work after model completion creates an observation only. Completed reports offer a stability-note action, retaining cause-unknown comments and at most five available same-page production summaries plus five retained self-test summaries. Missing page identity or cleared/pruned test history is reported/left absent rather than recreated. No heartbeat, resource-pressure attribution, memory-reclamation guarantee or automatic cooldown is introduced. A fully completed workflow followed by page loss is not automatically called a crash; the retained diagnostics and optional user observation provide context. Local save completion still does not certify an external share destination.

**Verification/acceptance:** 163 focused browser groups passed, including 11 new review-policy/UI groups, selector export preservation, cached-adapter refusal and previous journal/worker/lifecycle/eligibility regressions. Review controls were inspected at phone width. Test one ordinary short transcription/save/report on Mac/iPhone, inspect the (possibly empty) Settings review area, and optionally save a labeled stability note without changing eligibility. No deliberate crash or fresh model validation is required.


### Settings history presentation — 11 November 2026

The three History and Reviews categories use the same right-aligned View/Hide controls as storage sections. Self-test history shows the latest pass per configuration ID and OS/platform, including identifiable legacy passes and older browser/fingerprint revisions (.2026-11-11.2 correction). This presentation does not merge eligibility contexts or delete hidden passes; failures and unidentifiable legacy results remain visible. A permanent separator precedes Model reviews even when transcription history is empty. The journal no longer prunes older failure reports by count. Selected history clearing synchronizes the evidence bridge first and preserves active/unprocessed work and independent eligibility/review data. Report JSON opens through View, with a plain technical-report heading above View/Copy/Download (execution Save on iOS). Transcription stability reporting sits above the technical report. Review group headings have no redundant disclosure; individual review entries retain their controls. Runtime is separated by a double line.


### Review archiving — 2026-11-11.4

History and Reviews has four independent View/Hide areas: Self-test history, Transcription history, Model eligibility reviews and Session stability observations. Matching permanent dividers separate them. Whisper Self-Test and History and Reviews use major h3 headings. Stability entries retain optional additional information but have no model-eligibility decision actions.

Archive is a visibility operation on the existing durable review record, not deletion: optional archivedAt plus timestamped archived/restored audit events, under the existing review writer lock. The evidence bridge synchronizes before archive/restore, and the repository refuses archiving any unresolved incident, including pending/deferred/retest-required and unknown future unresolved states. Resolved kept/reference-passed incidents and stability observations may be archived. Archived records remain in list/export/evidence evaluation and survive report-history clearing; Show archived reveals them with Restore and report/additional-information controls. Display filtering never suppresses an active incident, even if it carries an archived timestamp. Archiving cannot qualify a model, remove a hold or rewrite the original evidence. No database schema/reset or worker changes.
