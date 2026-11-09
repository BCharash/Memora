# Memora — current status and resume instructions

Updated 9 November 2026. Read this first, inspect Git status/current source, then consult the linked plan. Archived plans and journals preserve history; this file gives the current sequence.

## Current sequence

1. **Runtime identification: complete for the agreed scope.** Shared OS/device classification, consistent reporting, production/self-test consumers and Search audio detection are implemented. Do not restart runtime migration.
2. **IndexedDB foundation: complete for the repair scope.** Canonical version-5 ownership and the missing-registry repair passed isolated tests and the user's Mac, iPhone and Windows checks.
3. **Vite/release asset conversion: deferred for Memora.** The isolated installation was discarded, and remaining untracked tooling was moved outside the repository. No Vite configuration/dependencies remain in the checkout; normal Live Server/main-root publishing continues. Design documents are reference only.
4. **Whisper configuration and testing: current priority.** Step 1 audit/design is prepared; review PASS criteria and deadlines before implementing safe standalone Tiny tests, then common resolution and durable evidence. Automatic sequences remain later scope.
5. **Offline Tiny, sharing consolidation and iMuse integration: deferred.** Align their contracts with the above work before implementation.

## Immediate next action

Vite step 1 design is prepared in [Vite design and rollout plan](Vite_Design_and_Rollout_Plan.md). Proposed Node 24 LTS, pinned local Vite/npm lockfile, `/Memora/` output, explicit module workers, preserved remote runtime versions, inactive setup first and five-prior-release asset retention. Public HTML was observed with max-age=600; hashing alone does not force HTML freshness. User confirmed Pages publishes from the main branch at the existing /Memora/ URL. The user confirmed the folder is /(root). Current publication details are complete; isolated step 2 does not change them. No Node/npm were found on PATH. No installation or app/hosting changes occurred. Review the design before authorizing isolated step 2; normal development remains available at this breakpoint.

Whisper checkpoint 2A is implemented locally and awaits user acceptance. Candidate build **2026-11-09.1** (not committed/published by the agent). It adds disposable test lifecycle watchdogs, Cancel, truthful cleanup and per-page production/test exclusion; model options, worker URLs/runtime versions and output-accuracy acceptance are unchanged. Exact invalid test IDs now reject rather than silently falling back to Tiny. Registry consolidation/persistence remain unimplemented.

Defaults: fixture prepare/decode 60 seconds each, idle production release 30 seconds, load 600 seconds, inference 180 seconds. Load/inference limits are visible and adjustable for manual trials; the defaults are provisional Tiny safety ceilings, not measured limits for larger models. Self-test releases an idle production model after acquiring the per-page activity guard; a subsequent production transcription reloads as needed. Cross-tab exclusion and durable interruption recovery are not implemented.

Agent verification: 22 controlled lifecycle groups, five Settings/production-entry groups, 12 existing schema groups and six existing database integration groups passed in isolated headless Chrome, with mocked workers/fixtures for Whisper tests. No model downloads/inference or real-device acceptance occurred. See tests/README.md. Step 2B WER/output validation is deliberately deferred; current PASS still follows successful inference reply and is not an accuracy certification.

Next user checklist on desktop, then iPhone after publication: verify footer 2026-11-09.1; run one Tiny standalone test and record load/inference times and WER; start another and Cancel while loading/inferencing, confirming cancelled state and Run re-enabled; run Tiny again; transcribe a short recording normally to verify the activity guard releases. No larger-model sequence or forced timeout required. Keep default limits initially. If a test completes before cancellation, cancel an immediate fresh attempt rather than force a resource crash. User checks and publication are pending; do not proceed to 2B until results are reviewed.

The step-1 [design](Whisper_Configuration_and_Test_Design.md) records resolver, identity and future evidence contracts. WER ≤25% remains only a candidate requiring baseline calibration, not implemented. Vite remains deferred and removed; normal Live Server/main-root publication continues. No data resets or hosting changes.

## Completed evidence

| Checkpoint | Actual result |
|---|---|
| Worker/Combine module naming | References maintained; user iPhone checks passed. |
| Database integration `35d69cd` | 12 isolated schema groups and six production-module/Settings groups passed in separate Chrome profile. User Mac/iPhone/Windows acceptance passed. Mac version 4 without modelRegistry became version 5 with all four stores; no reset/full live-record comparison. |
| Runtime reporting `560d93f` | Nine simulated environments; user startup/Settings checks passed. |
| Self-test environment `4c41d6d` | Parsing and five simulated environment checks; user reported success, exact latest devices unspecified. |
| Search audio `560fff7` | Simulated controls/picker checks; user desktop/iPhone playback passed. Explicit iPad behavior intentionally joined the iOS path; no separate iPad hardware result. |
| Build label `7cfb099` | Label checks passed; user confirmed Mac display and iPhone caching problem. |

These checks do not validate all model families, sequences, backends or browsers. Separate Android/iPad hardware acceptance is unreported. See [foundation record](Runtime_and_Database_Status.md) and [test instructions](../tests/README.md).

## Working rules and deferred scope

- One small change at a time; focused tests and pauses at natural break points. Batch publication after local checks to reduce GitHub Pages waiting time.
- Do not commit/publish, reset storage or change hosting settings without instruction. An inventory request does not authorize implementation.
- Keep Medium q4 and standalone-test safeguards until replacements pass regressions. Distinguish API availability, requested backend and confirmed execution.
- Do not revert to hardcoded version-4 openers after database upgrade. User data is disposable if recovery is necessary, but routine resets remain inappropriate.
- Leave `imuse-recording-breadboard` untouched. Future recording migration requires both repositories/schema inspection; no speculative audio store or database renaming now.
- No forced refresh during active work. HTTP caching, model Cache Storage and IndexedDB are separate concerns.
- Sharing inventory is an overview; trace full dependencies immediately before changing workflows. No sharing extraction is implemented.
- Leave five design journals intact pending a separate restructuring request. Their historical statements do not override current source/status.

Start from [documentation index](README.md). Completed planning records are in [archive](archive/README.md). Suggested resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Runtime and database repair are complete. Review docs/Whisper_Configuration_and_Test_Design.md next. Step 1 design is complete; agree the proposed PASS gate/deadlines before step 2. Vite is deferred. Preserve small changes and test checkpoints.”
