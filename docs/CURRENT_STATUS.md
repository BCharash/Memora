# Memora — current status and resume instructions

Updated **13 November 2026**, source build **2026-11-13.3**. The latest change is the header wordmark described below; the .4 runtime/Settings acceptance boundaries still apply. Settings heading hierarchy, separate review/stability areas and reversible archiving are implemented; user Mac/iPhone acceptance is pending for .4. The user confirmed 24-hour transcription expiry in .1; .2 corrects historical pass duplicates and the empty-history separator. The prior stable checkpoint **2026-11-10.14** was confirmed on both devices. Resource profiling remains planned, not implemented.

## Wordmark appearance — 2026-11-13.3

The central title now uses icons/Memora.png as Me followed closely by flowing mora lettering in locally bundled Dancing Script, with an icon-inspired cyan/blue/violet gradient. The graphic and lettering are now 20% larger together: 67.2 px artwork and 51.6 px lettering, with proportional spacing/alignment. The accessible heading remains Memora. The existing left section icon still follows Transcribe/Combine/Search; its phone size is 56 px to leave room for the central wordmark and Settings. The font is bundled under fonts/ with its SIL Open Font License, requiring no remote font request. No model/runtime/storage behavior changed.

Isolated Chrome verified font/icon loading, the Memora heading label, no horizontal overflow or visible header-control overlap at 320/360/390/430/900 px, tab/section-icon transitions, stable branding and Settings opening. Visual preference on iPhone remains for user review. Existing model/Settings acceptance is not expanded by this presentation check.

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
- .13 saved-observation presentation was reported to work perfectly. .14 was subsequently confirmed to run on **both Mac and iPhone**; the pending published-layout check is closed.
- Recorded checks: .8 had **163 focused browser groups** passing (injected faults, review ordering/persistence, worker/lifecycle/storage/UI regressions); later presentation changes passed their targeted suites. These are not real-device crash guarantees or a new full-suite run for this documentation refresh.

## Current rules and where things live

**Confirmed model runtime failure:** requires a later successful manual reference test; user input cannot override it. **Unclear interruption during model work:** temporary exact-context review hold, retaining prior qualification. **Known non-model faults:** preserve qualification. **Completed inference followed by later trouble:** retain completion and record a nonblocking stability observation. No memory-pressure cause is asserted.

Transcribe's Review in Settings notice returns to deferred reviews. Review choices are Require a retest, Keep previous eligibility (prior qualifying proof plus explanation required) and Decide later. Saved information is read-only above a fresh input; Add additional information appends a timestamped note and does not itself release a hold. A newer runtime/self-test failure cannot be dismissed through an older review, and an older recovered execution cannot undo a newer reference pass. Historical contexts cannot qualify changed ones.

Settings now has:

1. Storage/model information, then refresh description/button, delimited from Self-Test.
2. Whisper Self-Test, including Advanced test settings.
3. **History and Reviews:** Self-test history; Transcription history; Model eligibility reviews; Session stability observations.
4. A double-line separator, then Runtime.

The four History and Reviews categories use right-aligned View/Hide buttons. Whisper Self-Test and History and Reviews use the same h3 heading size as Display and Storage & Models. Model eligibility reviews and Session stability observations are separate areas with a permanent divider. Saved result cards have a Technical report heading and View/Copy/Download controls (execution reports retain Save report on iOS). The View button alone reveals JSON. Transcription stability reporting appears above its technical report. Review groups display without an extra group disclosure. Resolved model reviews and stability observations offer Archive; Show archived exposes their reports, notes and Restore. Archiving preserves original data and eligibility. Active/unresolved reviews cannot be archived and remain visible.

Execution history retains successful workflows for 24 hours after completion, expiring them during journal maintenance; failures, cancellations and interruptions remain until selected for clearing. Active/unprocessed work is protected. Self-test history shows the newest pass per configuration ID and OS/platform, including identifiable legacy records and older browser/fingerprint revisions. This is presentation only; full eligibility contexts remain independent and stored evidence is unchanged. Unidentifiable legacy passes remain visible. Matching permanent dividers separate Self-test history, Transcription history and Model reviews, even when histories are empty. Both histories start with unchecked per-record and Check all boxes; only selected completed records can be cleared. This is browser-local history, not guaranteed permanent storage. Durable incidents, decisions, reference certificates and stability observations survive clearable execution/self-test histories. Required pre-model evidence failures stop new work safely; late post-completion history failures do not fabricate a model failure. The loader refuses outdated bridge support. Automatic eligibility refresh preserves pending iPhone exports.

No new model validation is required for .9–.14 presentation edits. Worker/model inputs and declared fingerprints were unchanged. Do not clear browser data, rebuild model definitions or restart completed runtime/database work to resume.

## What to do next, in order

1. **Accept Settings build 2026-11-11.4 on Mac/iPhone.** Using existing entries, check all four View/Hide controls, matching major headings, separate review/stability areas and Archive/Show archived/Restore on an existing resolved entry or observation, report View/Copy/export, unchecked selection and selected-only clearing in both histories, visible review groups, top-positioned instability reporting and double separator before Runtime. Optional one normal short transcription confirms linked report controls. No model stress test or 24-hour wait is needed; expiry is covered with an injected clock. After acceptance, use the build normally. There is no urgent coding dependency or required continuous session. Keep naturally occurring error reports; do not stress devices to manufacture data. The next investigation is resource behavior, before automatic sequential testing. This plan does not authorize implementation.
2. **Resource investigation — three independently reviewable checkpoints:**
   - **Establish profiling access.** Check what Safari Web Inspector can expose from the actual iPhone and whether a suitable Mac connection is available. Its memory/CPU timelines are the first tool to evaluate; correlate matching iPhone Jetsam reports if a termination occurs. A Jetsam report can diagnose a past memory-pressure event, not predict the next one. Desktop profiling can provide a comparison, but does not establish iPhone limits.
   - **Record a controlled comparison.** Compare normal Small transcription using a reused worker with separate Small self-tests that create/dispose workers. Keep device, model, audio and cache conditions comparable. Observe baseline, loading/inference peaks and behavior after disposal. Ask whether memory settles, accumulates across tests, or peaks during loading. Use bounded trials and stop at instability; do not deliberately push Medium into crashes. No crash loop or automatic sequence is required.
   - **Choose safeguards from the evidence.** Depending on the findings, review overlapping heavy operations, retained decoded audio/buffers and worker/model reuse. Only then compare actual waiting intervals, such as 25 versus 60 seconds. Each implementation would be a separate authorized, testable checkpoint.
3. **Measurement and cooldown limits:** Memora has no reliable portable measurement of remaining safe iPhone memory or Safari's termination threshold. Existing JavaScript heap diagnostics, where exposed, are not total native/WASM/GPU memory; Refresh Storage measures disk usage, not RAM headroom. Broader browser memory APIs have restricted availability and isolation requirements. Disposal acknowledgement and worker termination do not prove physical memory reclamation. Neither 25 nor 60 seconds is established as a safe minimum; a future countdown must not imply verified safety. The observation that waiting helped is evidence to investigate, not proof of a leak or a particular cause. Automatic sequences/one retry remain paused pending a justified stability policy.
4. **Separate investigation if it recurs:** the intermittent iPhone blank Transcribe screen after selecting a 120-file source folder remains unexplained. Record timing, build, file count and whether session state/page identity reset. First review the selection/list/metadata path without code changes; distinguish page replacement, file-provider availability and list preparation before proposing instrumentation/fixes. File-selection code was unchanged from .2 through the report issue; that is not proof of root cause. Do not conflate it with Whisper eligibility or claim report sharing fixed it.
5. **Later registry roadmap:** reviewed new model candidates for deliberate evaluation, then explainable device/context-specific preferred variants and user override. The short fixture cannot rank broad real-world accuracy or prove reliability. Remote repository discovery is later still and does not establish compatible execution. See the [catalogue roadmap](Whisper_Catalogue_Resolver_Contract.md#future-candidate-discovery-and-device-specific-variant-selection).

Vite/release conversion, offline Tiny, sharing consolidation, Search experiments and iMuse integration remain deferred. Preserve `imuse-recording-breadboard`. Use small independent checkpoints, pause at acceptance, and do not edit watched files during user model tests. No agent commit/publication, storage reset or hosting change without instruction.

Resource-tool references: [Safari profiling timelines](https://webkit.org/web-inspector/timelines-tab/), [Apple Jetsam reports](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports), and [browser memory measurement requirements](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory).

## Resume references

- [Documentation index](README.md) and [plain-language file map](../filemap.md).
- [Execution/eligibility/review contract](Whisper_Execution_Failure_Contract.md), [catalogue contract](Whisper_Catalogue_Resolver_Contract.md) and [test guide](../tests/README.md).
- [Detailed 10 November checkpoint history](archive/Development_Checkpoints_2026-11-10.md) and [earlier checkpoint history](archive/Development_Checkpoints_2026-11-09.md). Old pending statements are historical.
- [Design journal](design-journal.md), section 60, records the decisions and acceptance limits.

Resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. The last device-accepted build is 2026-11-10.14. Build 2026-11-11.4 adds matching major headings, separate eligibility/stability areas and reversible archiving, alongside selected-only history clearing, newest-pass presentation and 24-hour successful-transcription history; user acceptance is pending. Do not restart runtime/database/eligibility work or begin a deferred feature automatically. The next proposed investigation is iPhone resource profiling: establish Safari inspection access, compare reused production workers with disposable self-tests, then evaluate safeguards/cooldown from evidence. Begin with review/profiling, not code changes; investigate large-folder selection separately if it recurs.”
