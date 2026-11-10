# Whisper testing and eligibility — current design

Reviewed 9 November 2026 through build **2026-11-09.23**. The original audit and staged implementation updates are preserved in [design history](archive/Whisper_Configuration_and_Test_Design_History.md). This document describes current behavior and separates future proposals. See [current status](CURRENT_STATUS.md) before starting work.

## Current execution and PASS gate

One user-selected exact configuration runs per self-test. Test choices and ordering come from the canonical catalogue; tests use a fresh instance of the same worker script as production. Production normally reuses its loaded worker/model. Shared activity ownership prevents overlapping self-test and production work on the page.

A completed functional pass requires successful fixture preparation/decode, load and inference; non-empty valid output; finite word error rate **≤15%** using the unrounded score. The normalization/protocol is versioned; do not relax the limit or alter the reference silently. Raw output and accuracy failure details remain available. The bundled English fixture is about 15.5 seconds; a pass is a smoke qualification, not a general-language, translation, long-recording, offline or sequence-stability guarantee.

| Stage | Default limit |
|---|---:|
| Prepare fixture | 60 seconds |
| Decode audio | 60 seconds |
| Release prior production resources | 30 seconds |
| Load test model | 600 seconds |
| Inference | 180 seconds |

These are independent stage ceilings, not expected durations. Settings permits load/inference adjustment. After completed inference, disposable tests request model disposal, wait at most **5 seconds** for a matching acknowledgement, and always terminate the worker. This bounded cleanup wait is separate from the 30-second pre-test release limit. Active errors, cancellation and timeout use forced termination rather than concurrent disposal. Cleanup observations do not change the accuracy verdict into a memory-release guarantee.

## Reports, recovery and model eligibility

Attempts persist before risky work and at stage transitions. Recovery of an unfinished attempt reports **Interrupted—no final result recorded**, preserving last stage and unknown cause. A passing result saved before subsequent page loss remains a passing inference result; the later page event is separate diagnostic evidence.

Settings shows the selected model and Run test/Retest, with Cancel below and visible only while running. Current results precede advanced options and saved reports. Saved history is at the bottom with readable summaries, Copy/Download, collapsed technical JSON and a separator per report. Clearing completed report history preserves eligibility/review decisions and unrelated storage. Export-time diagnostics can include page events after the saved outcome.

| Current evidence | Qualification behavior |
|---|---|
| Valid completed manual pass | Qualifies exact context and restores a prior hold if no newer adverse evidence supersedes it. |
| Confirmed model load/inference or accuracy failure | Blocks exact context pending successful manual testing. |
| Unexplained load/inference page loss | Suspends pending retest; does not prove permanent incompatibility or memory failure. |
| Cancellation, timeout or shared preparation fault | Does not grant qualification or clear an existing hold; cancellation/timeout does not establish incompatibility. |
| Changed configuration/runtime/worker/fixture/recipe/environment | Prior evidence does not qualify the changed context; fresh validation is needed. |

Manual tests are unlimited. The old `deliberateRetest` flag remains historical/internal compatibility metadata; **a user-requested qualifying manual pass does not depend on that flag or button label**. Explicit automatic/sequence attempts cannot borrow this manual recovery rule. Older adverse reports without exact identity create conservatively scoped review holds; old passes do not acquire invented identity. Legacy resolutions retain original evidence.

Eligibility is separate browser-local storage, checked by both the transcription selector and loader. Only qualified canonical family defaults appear; other tested variants do not replace them. No qualified default means the selector/action is disabled with Settings guidance. A self-test failure can remove a previously qualified choice. **Normal transcription failures currently do not write new eligibility decisions.** Their classification/persistence is proposed, deferred work.

See [catalogue contract](Whisper_Catalogue_Resolver_Contract.md) for identity/selection and [file map](../filemap.md) for storage ownership. Never infer qualification from cache presence or the historical IndexedDB registry validation field.

## Diagnostics and iPhone instability

Reports distinguish requested backend, initialized session settings and actual operator backend, which remains unknown without tracing. They include stage timing, worker inference time, model disposal acknowledgement and termination separately. Page IDs/navigation/Settings events and worker lifecycle logs can distinguish a panel close from a new page instance. Missing callbacks cannot establish a crash cause.

The user supplied iPhone Small reports showing repeated disposable-test page loss, including after a completed pass and during later work. Tiny disposal acknowledgements were observed on Mac/iPhone; they do not verify memory reclamation. Normal Small production reuse later completed at least nine recordings without trouble after reboot. A creation/disposal/resource-pressure explanation is plausible but unproven. The supplied Jetsam report did not match the observed failure. No matching OS trace or remote Safari inspection established a root cause.

Do not automate or stress this pattern now. The proposed isolated reuse lab was discarded and is absent. Stop edits while the user tests; investigate with bounded trials on a server without automatic reload when agreed. Do not repeatedly crash Medium to rediscover known evidence.

## Future sequences and retries

**Deferred; not implemented or activated.** Preserve this agreed direction while the repeated-test instability remains unresolved:

1. Run an explicit ordered list one configuration at a time, preserving exact identities, sequence position and per-attempt evidence.
2. Allow an initial attempt plus **at most one automatic retry** for a recoverable model/accuracy/timeout outcome, with a fresh worker. Reserve/persist retry consumption before execution so reload cannot reset it. A pause is not proof of recovered memory.
3. Keep both attempts; show “Passed on retry” rather than erase failure. Qualification after an automatic failure/pass pair requires a separately agreed confirmation rule; the earlier proposal for another verification is not yet finalized or implemented.
4. Stop on cancellation. Pause on cleanup/storage/checkpoint failure or uncertain page health rather than launching another model. Shared fixture faults must not trigger cascaded retries.
5. After page loss, recover paused and require explicit resume. Never automatically reload the interrupted model on startup. Exhausted retry budget must offer skip/stop or a separately recorded manual retest, not an implicit allowance reset.
6. Clearing visible reports must not reset future sequence state/retry budgets. Manual tests remain unlimited independently.

Before implementation: settle production-failure classification and automatic-retry qualification, then establish a justified stability/cleanup policy. Verify sequence recovery using synthetic errors, duplicate/late messages, timeouts, cancellation, storage failure and reload around retry reservation. Limited device acceptance must be separately agreed; do not use repeated Medium/Large crashes as infrastructure tests.

## Current production-failure checkpoint

The error-path audit and classification-only implementation are complete in candidate 2026-11-10.2. See [execution-failure contract](Whisper_Execution_Failure_Contract.md). No production errors update eligibility yet. Worker-reported cause remains unknown where only text is available; normal transcription success cannot replace a reference fixture pass. Review acceptance before connecting decisions or adding durable production interruption recovery.

Recorded results and test pages are in [test instructions](../tests/README.md); detailed earlier observations remain in [checkpoint history](archive/Development_Checkpoints_2026-11-09.md). Cooldown and automatic sequences remain separate, deferred work.
