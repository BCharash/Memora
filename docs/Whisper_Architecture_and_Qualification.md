# Whisper architecture, qualification and self-test reporting

Current-source reference, **21 November 2026**, commit **8d4cf88**, candidate application **2026-11-21.11**, database schema **10**. This consolidates registry, catalogue, testing and reporting guidance. Candidate .11 separately repairs the Settings registry-cache View action; canonical Whisper execution/qualification is unchanged. It does not alter workers, models, qualification, evidence or memory instrumentation.

The full four superseded guides remain in the [dated Whisper archive](archive/README.md#whisper-guides-consolidated--21-november-2026). The detailed [execution-failure/review contract](Whisper_Execution_Failure_Contract.md) stays separate. The user's [self-test memory handoff](Memora_Whisper_Memory_Handoff.md) stays at its original path, unchanged; it is future feasibility/implementation guidance, not a completed measurement feature.

## Separate authorities

| Question | Authority / limitation |
|---|---|
| What exact model/loader is requested? | Immutable canonical definitions and shared selector. Family labels alone do not specify precision/backend. |
| Are model files present? | Availability/cache checks. Presence of one file or a browser API does not prove complete offline readiness or successful execution. |
| What happened in a test? | Durable self-test attempt and its measurements/diagnostics. Raw output and WER are retained. |
| Is it qualified here now? | Exact-context eligibility plus production holds/review decisions. A summary row or ordinary successful transcription cannot grant qualification. |
| How much memory does it use? | No current model-memory comparison column or verified resident-RAM measurement. Requested dtype, file size and disposal acknowledgement are not measurements of physical RAM. |
| Is it stable for long recordings/repeated tests? | Only the actual scoped observations. One short fixture pass is not sequence or long-recording reliability proof. |

Do not merge these questions into a single loaded/available/passed status. Historical registry validation is not another editable current qualification authority.

## Current ownership

| Owner | Responsibility |
|---|---|
| [whisperConfigurations.js](../js/whisperConfigurations.js) | 13 built-in definitions, immutable exact IDs, library/worker/loader identity, compatibility, listing/order, selection and fingerprint. |
| [modelManager.js](../js/modelManager.js) | Persisted legacy-shape definition projection and availability family metadata, preserving historical/custom evidence. |
| [whisperProductionEligibility.js](../js/whisperProductionEligibility.js) | Qualified family-default production choices and guarded exact selection. |
| [whisperEligibility.js](../js/whisperEligibility.js) | Reference-test eligibility/context rules and browser-family qualification identity. |
| [whisperEligibilityEvidence.js](../js/whisperEligibilityEvidence.js) / [whisperProductionEvidence.js](../js/whisperProductionEvidence.js) | Shared bridge, durable incidents/decisions/reference certificates and nonblocking stability observations. |
| [whisper.js](../js/whisper.js), [desktop worker](../js/whisper-desktop-worker.js), [iOS worker](../js/whisper-ios-worker.js) | Production loading/inference and reused loaded instance; self-tests use the same platform scripts in fresh workers. |
| [whisperActivity.js](../js/whisperActivity.js) | Page-level ownership preventing concurrent production/self-test work. |
| [whisperSelfTest.js](../js/whisperSelfTest.js) / [whisperTestLifecycle.js](../js/whisperTestLifecycle.js) | User-initiated configuration test, stages/deadlines/events and cleanup. |
| [whisperValidation.js](../js/whisperValidation.js) | Versioned fixture normalization/WER gate. |
| [whisperAttempts.js](../js/whisperAttempts.js) / [whisperAttemptReport.js](../js/whisperAttemptReport.js) | Attempt checkpoints/recovery, timelines, per-test report and observation UI. |
| [whisperExecutions.js](../js/whisperExecutions.js) / [whisperExecutionReports.js](../js/whisperExecutionReports.js) | Separate production execution journal and shared technical-report controls. |
| [whisperDiagnostics.js](../js/whisperDiagnostics.js) / [whisperDisposal.js](../js/whisperDisposal.js) | Scoped diagnostics and bounded disposal acknowledgement; no guarantee of physical reclamation. |
| [settings.js](../js/settings.js) | Test controls, family summary, histories/reviews/runtime presentation and registry refresh/counts. |

Database ownership remains [database.js](../js/database.js); definitions/weights and localStorage journals are not one store. See [identity/storage](Recording_Identity_and_Storage.md) for active stores and preserving migration rules.

## Configuration selection and fingerprints

Definitions specify repository/revision, platform/OS, runtime-library version, worker protocol/implementation revisions, loader device/dtype/options, production family-default policy and self-test permission/order. They contain no test results and do not probe/download models when imported.

The shared synchronous selection core accepts exact IDs or family requests, enforces compatibility and returns explicit errors. Production uses that core through the eligibility layer. The async resolver adds a fingerprint/provenance; it need not be every caller's direct entry point.

Current desktop policy:
- Tiny/Base/Small omit dtype; intended backend is WebGPU.
- Medium family default is q4. Default-dtype Medium is not self-test allowed; q4f16 and fp16-encoder/q4-decoder are separate testable variants.
- Large uses fp16 encoder and q4 decoder.
- Desktop targets Windows/macOS/Linux. iOS is separately defined. Android/unknown production execution is not silently enabled.
- Self-test's historical non-iOS listing exception is a menu policy, not permission for incompatible exact execution.

Current iOS loader omits explicit device/dtype and relies on its library defaults. The legacy WASM-intended label is not an operator trace or proof of actual quantization. iOS self-test policy allows Tiny/Base/Small/Medium and excludes Large. Do not change it as documentation or memory-measurement cleanup.

Production lists only currently qualified family defaults. Passing an alternative Medium variant does not replace/qualify the family's default. Exact incompatible requests or repository/dtype overrides cannot silently become another model.

Fingerprinting uses canonical declared repository/revision, library version, worker identity/revisions and loader inputs; labels/order/timestamps are not execution identity. Omitted defaults retain their intended semantics. Upstream repository revisions are unpinned; a declared fingerprint does not freeze downloaded weights or equal an automatic worker-source hash. Diagnostic-only message-envelope additions have separate versioning and do not automatically require requalification.

## Qualification and browser continuity

A reference context includes exact configuration/fingerprint, execution worker, validation protocol, fixture digest, recipe, runtime identity and observed capabilities. A recognized browser **version change alone** does not invalidate a valid pass in the same browser family and otherwise matching context. Full agents remain diagnostic; unknown agents stay exact.

Changed configuration/runtime/worker/protocol/fixture/recipe/platform or relevant capabilities can require new qualification. Reading older version-specific keys is non-destructive. Latest relevant evidence wins; replaying an old pass cannot clear a newer failure/hold or reactivate a resolved review.

| Evidence | Current treatment |
|---|---|
| Valid qualifying manual reference pass | Qualifies the matching context and may restore a prior hold only when not superseded by newer adverse evidence. |
| Confirmed model/runtime or reference accuracy failure | Exact-context block/retest policy applies. Preserve evidence; do not infer universal model incompatibility. |
| Unexplained loss during active model work | Uncertain interruption/hold with existing review or qualifying retest path; cause remains unknown. |
| Preparation, cancellation/timeout, eligibility/storage refusal, paragraphing/save fault | Does not create qualification or automatically erase a hold; apply source/stage policy, not error-message guesswork. |
| Model completed, later UI/history/share problem | Preserve inference outcome and record later fault separately. |
| Ordinary production success or saved explanatory note | Not a WER reference pass and cannot itself restore qualification. |

Manual recovery is not conditional on an old deliberateRetest flag/button label. Automatic/sequence attempts cannot borrow manual recovery rules. Required pre-model evidence failure stops work safely; a later post-completion persistence error must not fabricate a model failure. The detailed precedence, review choices and typed failure envelope remain in the [separate contract](Whisper_Execution_Failure_Contract.md).

## One user-initiated self-test

One selected exact configuration runs on the bundled short English reference fixture (about 15.5 s), through prepare → decode → release prior production resources → create fresh platform worker → load → inference → validate → cleanup. Production normally reuses its model; a disposable test is a different resource-lifetime scenario.

A completed functional pass needs nonempty valid output and finite **unrounded WER ≤15%**, using the versioned normalization/fixture/recipe. Retain raw prediction and validation details. Do not relax the threshold or change the reference silently.

| Stage | Default ceiling |
|---|---:|
| Fixture preparation | 60 s |
| Audio decode | 60 s |
| Release prior production resources | 30 s |
| Load | 600 s |
| Inference | 180 s |

Load/inference adjustments are available in advanced settings. These are deadlines, not expected durations or suggested waits between tests.

After completed inference, cleanup can request disposal and wait at most **5 s** for the matching acknowledgement, then terminates the disposable worker. Active cancellation/error/timeout terminates rather than disposing concurrently with busy inference. Checkpoint failures must not skip cleanup. Disposal acknowledgement and worker termination do not prove physical RAM has been returned.

## Attempts, recovery and timing context

The attempt journal persists before risky work and at stage changes. Ownerless unfinished attempts recover as **Interrupted—no final result recorded**, preserving the last known phase and unknown cause. A saved passing inference is not rewritten as model failure merely because a later page event occurred.

New tests capture a compact nonrecursive snapshot of up to **10 prior tests** before model work. Their phaseTimeline is bounded to **32 checkpoints** and records available cleanup separately from model phase. Prior snapshot rows contain timing/identity/outcome, not copied audio/transcript payloads.

Older tests reconstruct once from remaining available history, clearly labeled. Missing/deleted records, unsaved finish times and indistinguishable order cannot be recovered from recollection. Known overlap is labeled; invalid/negative intervals remain Unknown. Clearing one old report does not retroactively erase another test's already captured compact timeline.

Readable report and exported JSON use the same data: reportSummary first, then selfTestTimeline/recentSelfTests, followed by full technical evidence. New context is captured-at-start; older backfill is reconstructed-from-available-history. Wall-clock gaps and stage timings are observations, not measured remaining RAM or a safe cooldown threshold.

## Summary, history and problem reports

Settings → History and Reviews → Self-test Summary shows **Model, RTF, Load (s)**, one latest retained successful result per family in Tiny/Base/Small/Medium/Large order. It excludes failed/interrupted/canceled attempts and is separate from history's card deduplicator.

**RTF = transcriptionMs / audioDurationMs**; load is excluded. RTF 0.25 means 15 s transcription per minute of audio for that short test, not a long-recording performance prediction. Missing measurements say Unavailable. Deleting a report can reveal an older retained family pass; separate qualification can survive history clearing. Summary presence means neither currently loaded nor currently qualified.

The family's compact summary intentionally groups across variants/platform/browser history. Detailed reports keep exact IDs/contexts. A future memory comparison keyed by exact configuration must explicitly resolve that display distinction; it must not silently merge different Medium quantizations.

Under a finished/interrupted test, Report a problem → Save observation preserves its result, sequence/stages and available diagnostics in separate Session stability observations. The saved note remains visible read-only on the originating card above a fresh input. Further information appends; it does not overwrite the first snapshot or change a pass/qualification.

Observations survive clearing ordinary history and can be inspected, appended, archived/restored through their existing Settings view. Shared View/Copy/report export uses the same content; iPhone uses supported file sharing rather than the session-losing blob-report navigation. Share/download initiation does not independently prove durable Files/Downloads placement.

Clearable self-test/production histories, durable incidents/reference certificates and nonblocking observations have different lifecycles. Active work is protected. Production success history expires after 24 hours during maintenance; failures/interruption evidence remains until selected for clearing. Do not clear qualification, models or unrelated stores to make a reporting test pass.

## Model registry cache and availability

Settings Refresh Storage Information synchronizes canonical definition fields before counting; View alone does not initialize the registry. Deletion preserves downloaded weights/test evidence and does not instantly refill definitions. Historical/custom extensions remain distinct from canonical execution authority.

Availability may use legacy generic ONNX-pair checks; exact complete per-configuration offline manifests are not implemented. Cache size, filename, WebGPU API presence or a WASM-intended definition does not certify downloadable/executable/offline completeness. Preserve source/runtime distinctions in all reports.

## New memory handoff: preserve and review separately

[Memora_Whisper_Memory_Handoff.md](Memora_Whisper_Memory_Handoff.md) is the user's new, unchanged future handoff. It requests **feasibility first**, prioritizes iPhone, and limits any later observation to existing user-initiated self-tests, not production or peak tracking.

Preserve its distinctions: model-weight bytes, WASM linear-memory capacity, JS heap, GPU allocations and total resident RAM are different quantities. Unknown is Unavailable, not zero. An estimate must be labeled as an estimate; disposal is not proof of reclaimed memory. No memory-based qualification, “safe for iPhone” threshold, automatic model choice or changed iPhone Large policy follows.

Before implementation, locate the current summary/persistence owners above and evaluate supported, read-only APIs/artifact evidence with explicit scope/provenance. The handoff prohibits speculative private-property traversal/runtime patching and requires review if instrumentation would become invasive. A short post-load reading is not peak long-recording memory. No extra model downloads or trials are authorized by this documentation consolidation.

The current summary has no added memory column or observed model-memory field from this work. No feasibility result is claimed. Retain the exact handoff, even when future measurements or revisions are added elsewhere.

## Unresolved resource observations and future work

Earlier iPhone disposable-test page loss, including events after a pass, and successful reused Small production runs support investigation but do not establish a memory-pressure root cause. The supplied OS report did not match the observed event. Missing callbacks/panel disappearance are not proof of a crash, and API disposal is not measured reclamation. Keep original reports/diagnostics and distinguish page identity from attempt identity.

Not active:
- Automatic ordered test sequences/retries, cooldown or silent resume after page loss. The preserved proposal allowed at most one reserved/persisted automatic retry with both outcomes kept, pause on uncertain health and explicit resume; qualification after failure/retry remains separately unsettled.
- Preferred-variant selection, reviewed remote candidate discovery or arbitrary runtime/model execution. Compare speed/load, accuracy and reliability separately; a single fixture cannot rank general accuracy.
- Complete offline packaging, backend fallback redesign or a new registry/database overhaul merely because an older stage table says not started.
- Memory instrumentation/estimation implementation from the new handoff.

Use bounded agreed trials on a stable server when resource investigation is authorized; do not repeat Large/Medium crashes to rediscover known evidence. Existing report inspection requires no new model execution.

## Validation, archive and preservation

This guide was checked against current definitions, selector, lifecycle, validation, summary/report and evidence code. No runtime/model/device test, storage reset, download, measurement or deployment ran for documentation consolidation.

All four original guides are archived complete with notices and navigation repairs only. They retain unique hypotheses, stage plans, prior evidence and all future proposals; old “next/current/not implemented” wording is dated history. [Research/evidence archive](archive/README.md), [current status](CURRENT_STATUS.md) and the [audit/disposition record](Documentation_Audit_2026-11-21.md) keep the boundaries explicit. The detailed failure contract remains separate and the user's memory handoff remains byte-for-byte unchanged.
