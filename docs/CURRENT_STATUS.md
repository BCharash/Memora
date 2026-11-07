# Memora — current status and resume instructions

Updated 7 November 2026. Read this first, inspect Git status/current source, then consult the linked plan. Archived plans and journals preserve history; this file gives the current sequence.

## Current sequence

1. **Runtime identification: complete for the agreed scope.** Shared OS/device classification, consistent reporting, production/self-test consumers and Search audio detection are implemented. Do not restart runtime migration.
2. **IndexedDB foundation: complete for the repair scope.** Canonical version-5 ownership and the missing-registry repair passed isolated tests and the user's Mac, iPhone and Windows checks.
3. **Reliable release assets: next priority.** Asset/deployment inventory is complete. Review a concrete build proposal before implementation. No build tool or hosting change is installed.
4. **Whisper configuration and testing: subsequent project.** Agree exact configuration identity and PASS criteria; then safe standalone testing, shared resolution, durable evidence and controlled sequences.
5. **Offline Tiny, sharing consolidation and iMuse integration: deferred.** Align their contracts with the above work before implementation.

## Immediate next action

Review [Asset and deployment inventory](Asset_and_Deployment_Inventory.md) and agree a conventional build/deployment proposal. Cover five workers, dynamic chunks, fetched fixtures, icons/manifest, external imports, `/Memora/` base paths, test isolation and retention/recovery for older open pages. Inspect GitHub Pages settings before preparing hosting changes; server-side settings have not been inspected.

The user confirmed caching was involved when the new iPhone HTML showed “Build not identified” without its initializer. Mac displayed the footer. Actual cache headers and the complete update path have not been measured. Acceptance must test an A-to-B publication with existing cache intact, not just a Private tab.

Current application checkpoint: **`7cfb099`**, build **2026-11-07.1**, owned by `js/build-info.js`. The UTC `YYYY-MM-DD.N` sequence is independent of iMuse and the database version. Documentation-only changes do not advance it. A displayed identifier does not certify the entire loaded dependency graph.

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

Start from [documentation index](README.md). Completed planning records are in [archive](archive/README.md). Suggested resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Runtime and database repair are complete. Review the asset/build proposal next; preserve small changes and test checkpoints. Do not restart completed work or implement Whisper/offline plans yet.”
