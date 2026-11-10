# Memora — current status and resume instructions

Updated **10 November 2026**, source build **2026-11-10.14**, commit `de50cfb`. The user accepted .14 layout in Live Server and is waiting for GitHub Pages/iPhone visual confirmation. This is a **stable stopping point** with no unfinished implementation. This documentation refresh does not change code/build or authorize another feature.

## What is complete

- **Runtime foundation:** shared OS/device identity and truthful capability reporting; agreed migration closed.
- **IndexedDB foundation:** canonical version-5 owner/repair, previously accepted on Mac/iPhone/Windows. No routine reset needed.
- **Canonical Whisper configuration:** definitions/defaults/platform/worker/library settings and shared selection/listing; availability is a derived projection. Production/self-test use the same platform worker scripts.
- **Self-testing:** one selected configuration, bounded stages/cancellation, WER ≤15%, durable attempts/recovery, cleanup diagnostics and manual retesting.
- **Production evidence:** structured worker failure provenance and execution history; completed model work is distinguished from paragraphing/save and later session instability.
- **Eligibility/reviews:** the existing evidence bridge evaluates production failure/startup recovery, honors reference-test qualification and offers persistent human review of unclear active-model incidents.
- **Reporting/presentation:** linked View/Copy/Save reports, iOS share-sheet export, pending transcript-save emphasis, read-only saved observations and the reorganized Settings layout.

The current fixed family defaults remain in effect. Passing an alternative Medium variant does not replace the production default. No automatic model discovery, preferred-variant ranking, cooldown or sequential retry is active.

## Actual acceptance and verification

- .7 normal transcription worked on **Mac and iPhone**, explicitly reported by the user.
- Mac execution JSON from Settings matched the completed transcript ID/timings and contained no audio/transcript contents.
- The user confirmed the iPhone execution-report sharing fix preserves the session; the earlier blob-link Download action had lost the source/results. iOS now offers Save report → Save to Files, desktop retains Download.
- During checkpoint 2, normal transcription was reported fine so far with zero initial reviews. Controlled reloads during transcription on **both Mac and iPhone** then produced the expected review opportunity; the user recorded a deliberate-test explanation. They did not explicitly identify the eligibility action selected, so do not equate saving an observation with proven hold resolution.
- .13 saved-observation presentation was reported to work perfectly. .14 grouping looks good in Live Server; **public/iPhone .14 layout confirmation remains pending**.
- Recorded checks: .8 had **163 focused browser groups** passing (injected faults, review ordering/persistence, worker/lifecycle/storage/UI regressions); later presentation changes passed their targeted suites. These are not real-device crash guarantees or a new full-suite run for this documentation refresh.

## Current rules and where things live

**Confirmed model runtime failure:** requires a later successful manual reference test; user input cannot override it. **Unclear interruption during model work:** temporary exact-context review hold, retaining prior qualification. **Known non-model faults:** preserve qualification. **Completed inference followed by later trouble:** retain completion and record a nonblocking stability observation. No memory-pressure cause is asserted.

Transcribe's Review in Settings notice returns to deferred reviews. Review choices are Require a retest, Keep previous eligibility (prior qualifying proof plus explanation required) and Decide later. Saved information is read-only above a fresh input; Add additional information appends a timestamped note and does not itself release a hold. A newer runtime/self-test failure cannot be dismissed through an older review, and an older recovered execution cannot undo a newer reference pass. Historical contexts cannot qualify changed ones.

Settings now has:

1. Storage/model information, then refresh description/button, delimited from Self-Test.
2. Whisper Self-Test, including Advanced test settings.
3. **History and Reviews:** Self-test history; Transcription history; Model reviews and stability notes.
4. A separator, then Runtime.

Execution history retains 20 evaluated terminal records plus active/unprocessed work. Durable incidents, decisions, reference certificates and stability observations survive clearable execution/self-test histories. Required pre-model evidence failures stop new work safely; late post-completion history failures do not fabricate a model failure. The loader refuses outdated bridge support. Automatic eligibility refresh preserves pending iPhone exports.

No new model validation is required for .9–.14 presentation edits. Worker/model inputs and declared fingerprints were unchanged. Do not clear browser data, rebuild model definitions or restart completed runtime/database work to resume.

## What to do next, in order

1. **Finish the pending .14 Pages visual check.** Confirm the footer and grouping on iPhone using existing records: Advanced test settings belongs with Self-Test; History and Reviews has the three agreed titles; Runtime is separated; saved observations sit above a fresh input. No transcription, repeated reload or deliberate failure is required for that layout check.
2. **Pause and use the current build normally.** There is no urgent coding dependency or required continuous session. Keep any naturally occurring error report; do not stress devices to manufacture data. No more implementation is selected/authorized merely by this list.
3. **Optional next focused investigation:** the intermittent iPhone blank Transcribe screen after selecting a 120-file source folder remains unexplained. If it recurs, record timing, build, file count and whether session state/page identity reset. First review the selection/list/metadata path without code changes; distinguish page replacement, file-provider availability and list preparation before proposing instrumentation/fixes. File-selection code was unchanged from .2 through the report issue; that is not proof of root cause. Do not conflate it with Whisper eligibility or claim report sharing fixed it.
4. **Deferred stability work:** design a limited cooldown comparison only when requested, using controlled model/device/cache conditions and actual elapsed intervals. Neither 25 nor 60 seconds is established as a safe minimum. Automatic sequences/one retry remain paused pending a justified stability policy.
5. **Later registry roadmap:** reviewed new model candidates for deliberate evaluation, then explainable device/context-specific preferred variants and user override. The short fixture cannot rank broad real-world accuracy or prove reliability. Remote repository discovery is later still and does not establish compatible execution. See the [catalogue roadmap](Whisper_Catalogue_Resolver_Contract.md#future-candidate-discovery-and-device-specific-variant-selection).

Vite/release conversion, offline Tiny, sharing consolidation, Search experiments and iMuse integration remain deferred. Preserve `imuse-recording-breadboard`. Use small independent checkpoints, pause at acceptance, and do not edit watched files during user model tests. No agent commit/publication, storage reset or hosting change without instruction.

## Resume references

- [Documentation index](README.md) and [plain-language file map](../filemap.md).
- [Execution/eligibility/review contract](Whisper_Execution_Failure_Contract.md), [catalogue contract](Whisper_Catalogue_Resolver_Contract.md) and [test guide](../tests/README.md).
- [Detailed 10 November checkpoint history](archive/Development_Checkpoints_2026-11-10.md) and [earlier checkpoint history](archive/Development_Checkpoints_2026-11-09.md). Old pending statements are historical.
- [Design journal](design-journal.md), section 60, records the decisions and acceptance limits.

Resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. We stopped at 2026-11-10.14 after implementing production reviews/stability observations and organizing Settings. Check the outstanding Pages/iPhone layout acceptance. Do not restart runtime/database/eligibility work or begin a deferred feature automatically. If requested, review the intermittent large-folder loading issue first, without code changes.”
