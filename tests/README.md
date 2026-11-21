# Memora test guide

Reviewed **21 November 2026** against source **da80b8a**, application **2026-11-21.10**, schema **10**. This is a current procedure/index, not a fresh test result. Older counts and acceptance observations are in the [dated evidence record](../docs/archive/Current_Guides_Preservation_2026-11-21.md) and journal.

## Run a focused browser harness

1. Serve the repository root through VS Code Live Server or another localhost static server. These pages use ES modules/import maps; do not open them as file URLs.
2. Use a separate disposable browser profile. Default harnesses use synthetic files, injected workers/storage or named test databases; some create/remove browser-private filesystem data. They must not be run against a user's real archive/database to diagnose a failure.
3. Open the relevant tests/ page below **without query parameters**. It runs automatically and renders PASS/FAIL output. Read the final failure list; a loaded page, unsupported API or skipped path is not a pass.
4. Record commit, displayed build, browser/platform, page, result and any skips. Compare fixture coverage with the behavior actually changed.
5. Use real-device/model checks only when required by the application change, with a small agreed scope. Documentation-only edits need link/source checks, not new model tests.

HTTPS/localhost is required for features such as SubtleCrypto and browser-private filesystem APIs. Chromium-native tests require the relevant APIs. Simulated iPhone paths in desktop Chrome are not actual Safari/Files acceptance.

Optional **?report=1** is for an orchestrator implementing the page's report endpoint. Ordinary Live Server does not provide it; use the page without that parameter for manual checks. The temporary local Python orchestration used in previous sessions is not committed project tooling.

## Current harness inventory

All **35 HTML pages** below exist in tests/. The transcription-identity page is an alias using transcript-catalogue.test.js, so do not count it as independent coverage.

### Identity, folders and app integration

| Page | Focus |
|---|---|
| [recording-identity.html](recording-identity.html) | Embedded Apple/iMuse identities, containers, malformed/conflicting metadata and exporter fixtures. |
| [reproducible-recording-identity.html](reproducible-recording-identity.html) | Prefix/size identity, independent vector, rebuild/rename stability, read limits, cancellation and ambiguity. |
| [production-recording-identity.html](production-recording-identity.html) | Production identity/TXT compatibility and Search vector/hash preservation. |
| [audio-inventory.html](audio-inventory.html) | In-memory audio inventory, complete/partial reads and explicit issues without sidecar authority. |
| [audio-inventory-page.html](audio-inventory-page.html) | Standalone inventory page, folder-input/native paths and named report sharing. |
| [audio-folder-cache.html](audio-folder-cache.html) | Native reuse, phone verification, latest snapshots, unavailable/stale cache and preserving schema migration. |
| [archive-folder-access.html](archive-folder-access.html) | Parent-folder adapter/test UI, nested TXT discovery and identity-linked playback. |
| [shared-folder-selection.html](shared-folder-selection.html) | Shared folder prototype controls, defaults/overrides and synthetic save/share behavior. |
| [shared-folder-production.html](shared-folder-production.html) | Production child discovery, rebasing, source reset, ID-first lookup and picker branches. |
| [audio-location.html](audio-location.html) | Shared playback guidance, actual inventory producer contract and scoped audio lookup. |
| [source-selection-performance.html](source-selection-performance.html) | Bounded metadata reads and controlled detail-reader concurrency; not provider/network timing. |
| [transcript-cache-identity.html](transcript-cache-identity.html) | Durable full-text cache identity, same-name separation, selected export/deletion and migration rollback. |
| [transcript-catalogue.html](transcript-catalogue.html) | Actual app with synthetic inference/files: TXT catalogue, Search-to-Combine scope, saving, gate, Settings, duplicate cache cleanup and narrow layout. |
| [transcription-identity.html](transcription-identity.html) | Alternate entry to the same catalogue/app suite; useful for the existing runner, not an additional suite. |
| [iphone-transcription-gate.html](iphone-transcription-gate.html) | Actual folder-input app branch, audio-only/child-folder discovery and Enable Transcription. |

### Database and runtime

| Page | Focus |
|---|---|
| [database.html](database.html) | Fresh/older/current/future schemas, preservation, refusal, blocked upgrades and rollback. |
| [database-integration.html](database-integration.html) | Current production consumers with isolated databases, registry evidence and Settings failure/deletion paths. |
| [runtime-diagnostics.html](runtime-diagnostics.html) | Injected runtime/storage/worker diagnostics and fixture navigation. |

### Whisper without real model qualification

| Page | Focus |
|---|---|
| [whisper-configurations.html](whisper-configurations.html) | Canonical definitions/resolver, fingerprint and independent baseline parity. |
| [whisper-validation.html](whisper-validation.html) | Reference normalization/WER and functional PASS rules. |
| [whisper-lifecycle.html](whisper-lifecycle.html) | Stage deadlines, cancellation, ownership and test lifecycle. |
| [whisper-disposal.html](whisper-disposal.html) | Bounded disposal acknowledgement and termination behavior. |
| [whisper-diagnostics.html](whisper-diagnostics.html) | Worker/timing diagnostic projection with injected dependencies. |
| [whisper-failures.html](whisper-failures.html) | Stage/source failure classification and workflow boundaries. |
| [whisper-worker-failures.html](whisper-worker-failures.html) | Actual worker source under injected import/load/call faults; envelope and verdict parity. |
| [whisper-loader-gate.html](whisper-loader-gate.html) | Loader gate, exact configuration and worker reply/event behavior. |
| [whisper-eligibility.html](whisper-eligibility.html) | Qualification state and matching-context rules. |
| [whisper-evidence.html](whisper-evidence.html) | Attempt/execution evidence bridge, browser-version continuity and stale-evidence protection. |
| [whisper-attempts.html](whisper-attempts.html) | Durable attempts, recovery, timelines and report/observation behavior. |
| [whisper-executions.html](whisper-executions.html) | Production execution history, retention, report export and fixture navigation. |
| [whisper-production-eligibility.html](whisper-production-eligibility.html) | Production qualification and exact-context holds. |
| [whisper-production-selector.html](whisper-production-selector.html) | Qualified family-default choices and selection behavior. |
| [whisper-production-reviews.html](whisper-production-reviews.html) | Reviews, observations, hold resolution, archival and persistent decisions. |
| [whisper-settings.html](whisper-settings.html) | Self-test/Settings UI, summary, history, errors and qualification distinctions. |

### Separate DOCX experiment

[docx-custom-properties-validation.html](docx-custom-properties-validation.html) downloads docx and JSZip libraries and automatically creates large synthetic reference collections. This is not a routine lightweight smoke test. Its [method/results and retained Word fixtures](../docs/validation/docx-custom-properties/README.md) explain the experiment, exact text comparison, property-size interoperability risk and untested platforms. It does not implement production import or require access to real transcripts.

## Committed Node runner: supported subset only

[run-recording-identity.mjs](run-recording-identity.mjs) requires **Node 22+**, no package installation. This documentation pass checked source/routes, not executable Node results.

- Without --browser, the default embedded recording-identity suite is the supported current Node route.
- With --browser, currently usable selectors are **recording-identity**, **database**, **database-integration**, **transcription-identity**, **whisper-diagnostics**, **whisper-failures** and **whisper-settings**.
- Set **MEMORA_TEST_BROWSER** to a Chromium-compatible browser executable. The runner otherwise defaults to a Windows Edge path, creates a disposable profile, serves the repository on a temporary localhost port and collects report output.
- Other current pages, including transcript-catalogue and newer evidence/review suites, are **not accepted --suite names** by this runner. Open them directly without ?report=1.
- The retained **--source** and **--persistence** routes refer to removed audio-source suites. Do not use them. **run-archive-reconciliation.mjs** also targets a removed lab; it is not a current test command. These code leftovers are queued for the separate JavaScript audit.
- **--generate-fixtures** deliberately rewrites the checked-in synthetic iMuse identity fixture using sibling iMuse exporter source. Do not use it for ordinary verification.

Examples after configuring the browser executable:

    node tests/run-recording-identity.mjs
    node tests/run-recording-identity.mjs --suite=database --browser
    node tests/run-recording-identity.mjs --suite=transcription-identity --browser

The independent whisper-registry-baseline-v2.json was captured before the old registry migration. Do not regenerate expectations from the implementation under test to hide differences. Keep exporter provenance and literal independent identity vectors.

## Application acceptance on MacBook and iPhone

Use [the current handoff checklist](../docs/CURRENT_STATUS.md#validation-and-acceptance). For .10 it covers parent-folder selection/audio playback, semicolon/comma Search handoff, All versus Search scope, latest cache entries and the existing Transcribe save/gate flow.

Use disposable copies when checking additions/removals or edits. On iPhone, verify the actual saved TXT/embedding file in Files; share-sheet completion alone does not prove destination, replacement or synchronization. Keep search-embeddings.json. Inventory sidecars are retired and need no creation/save test.

Root [test.html](../test.html) and [audio-inventory-test.html](../audio-inventory-test.html) are separate interactive diagnostics, not automatic production acceptance. They can access user-selected files; use an intentional disposable selection and inspect their on-page version before interpreting a report. A synthetic native/phone adapter check is not real decoding or audible playback evidence.

For a change requiring real Whisper execution, agree a bounded check first. A manual Tiny smoke test records qualification in that browser; documentation/UI-only edits need no fresh self-test. A short English WER pass does not certify long recordings, translation, offline readiness or sequence stability. Do not use rapid repeated Large/Medium stress tests as a generic regression check. Keep an agreed long-running device test on a stable server without live-reload file edits.

## Evidence and maintenance

Keep result counts with their original commit/build, suite membership and limitations. Do not add overlapping runs or the two alias pages into a new total. [Preserved evidence](../docs/archive/Current_Guides_Preservation_2026-11-21.md) distinguishes the .8 185-group set, .9 45-group subset and .10 33-group focused run; none was rerun by this documentation change.

When adding/removing a harness, update this inventory and check runner support separately. Keep import-map adapters and production data paths isolated. Scope validation to the change; a passing fixture is not proof of Safari Files behavior, model execution, memory reclamation or deployment.
