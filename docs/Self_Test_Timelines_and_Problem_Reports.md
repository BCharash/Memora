# Self-test timelines and problem reports

Implemented in Memora **2026-11-13.8**, 13 November 2026. This records evidence; it does not change model selection, accuracy thresholds, qualification rules, cooldowns or automatic retry behavior.

## Using existing tests

Open Settings → History and Reviews → Self-test history → View. Each displayed test has **Recent self-test history**. Expand it to see up to ten preceding tests followed by the selected test: model, start/finish times, duration, measured gap before the next test and result. Scroll the table sideways on a phone for all columns. All stored passes can contribute even when the main history hides superseded pass cards.

Older tests get a **Reconstructed from remaining saved history** snapshot. Existing start/finish timestamps supply durations and gaps; absent finish times and unsaved detailed stages remain Unknown. Deleted records, another browser/app storage container and exact ordering of old tests with indistinguishable start timestamps cannot be recovered. No waiting interval is guessed from the user's recollection.

Reconstruction is saved once under the existing per-attempt lock without changing the original result. Clearing an earlier report later does not remove its compact row from another test's already saved context. No model needs to run to inspect existing history.

## New tests

Before model work, the journal saves the attempt identity and a compact, nonrecursive snapshot of up to ten preceding available tests. It remains that test's start-time context; future tests do not appear retroactively in it. Prior rows include IDs, model labels, page/build identity, known timestamps/durations/results and cleanup/disposal outcomes. They contain no audio or transcript payloads.

The current attempt saves a bounded `phaseTimeline` of up to 32 phase/timestamp checkpoints progressively. Cleanup, disposal completion and cleanup completion are captured too. Cleanup checkpoint failure cannot skip disposal/termination or turn a successful inference into a model failure. `cleanupPhase` is separate from the model `phase`, preserving existing interruption/eligibility classification.

The readable timeline and technical report use the same data. `recentSelfTests` records its source (`captured-at-start` or `reconstructed-from-available-history`), capture time, original start cutoff and bounded prior rows. `selfTestTimeline` adds the selected test and its gap to that snapshot when presented/exported. Existing result fields retain their measured load, transcription and cleanup durations. Phase timestamps and inter-test gaps use saved wall-clock timestamps; invalid/negative intervals are Unknown, and known overlap is labelled explicitly. These measurements do not establish remaining RAM, physical memory reclamation or a safe wait before another model.

## Report a problem

Under a finished/interrupted test, expand **Report a problem after this self-test**, describe what happened and choose **Save observation**. This preserves the test result, recent sequence, saved stages and available runtime/page/Settings diagnostics in **Session stability observations**. For example, report “Small showed PASS, then Settings disappeared.” A passed test remains passed; this observation does not change model eligibility.

The existing bounded persisted diagnostics already record page identity/start, visibility, Settings open/close requests and known reasons, and lifecycle events. Reports reuse that information rather than adding another recorder or claiming that a return to Transcribe proves a crash. The final event may be missing if the process ended abruptly. Cause remains unknown unless additional evidence establishes it.

Open Session stability observations → View to inspect the saved note, add information, archive/restore it, or View/Copy/Save its technical report. It retains its own snapshot after ordinary self-test history is cleared. Per-test exports also include linked observations while their test record exists. The first observation's original test/timeline/diagnostic snapshot remains fixed; later notes append to its history.

Technical report controls are shared with transcription reports: iPhone uses **Save report** and file sharing to avoid replacing the app document with a blob download; desktop uses Download report. Copy and View use the same report content. Sharing/download initiation still does not prove a usable file reached Files/Downloads.

## Implementation and validation

- `whisperAttempts.js`: capture/backfill, timing summaries and existing locked journal.
- `whisperTestLifecycle.js`: cleanup checkpoints that preserve the prior lifecycle and outcome.
- `whisperAttemptReport.js`: readable sequence/stages, export projection and problem-report controls.
- `whisperProductionEvidence.js` / `whisperEligibilityEvidence.js`: separate nonblocking self-test observations using the existing durable evidence store.
- `whisperExecutionReports.js` / `settings.js`: shared safe report exports and both history/observation views.

No database version change, storage clearing, model download, automatic sequence or extra self-test is required. Browser-local storage can still be cleared/evicted or fail; reports state unavailable data instead of inventing it. A passed model result whose final history write failed cannot be claimed as a durable saved pass.

Validation: **98 groups across eight focused isolated Chrome harnesses** passed (attempts, lifecycle, Settings, execution reports, production reviews, eligibility evidence, eligibility rules and runtime diagnostics). Added coverage for frozen chronology/durations/gaps, legacy backfill, compact/no-transcript prior rows, preserved model-stage recovery, cleanup-checkpoint failure safety and observations surviving history clearing without eligibility changes.

A real Settings workflow with synthetic older Tiny/Base/Small records verified reconstructed 30/45-second gaps, saved notes, matching JSON, unchanged PASS, survival after clearing/reload and a 390 px page that does not widen around the scrolling table. No real model inference or user data was used. iPhone acceptance should first inspect an existing Small report and save an observation; do not rerun Tiny/Base/Small merely to test the new UI. Further model experiments and resource profiling remain separate work.
