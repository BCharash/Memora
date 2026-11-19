> Documentation reviewed 19 November 2026 against source 47ca641 (displayed build .25). Original experiment/checkpoint evidence is retained, not rerun. Use [current status](../../../docs/CURRENT_STATUS.md) for implemented behavior; historical pending instructions are not current authorization.

# Disposable archive-wide reconciliation lab

18 November 2026. Created after the user asked to test reconciliation while the migrated Windows copies are unavailable. **This is an isolated proof of concept, not a production repair or permission to reorganize/migrate real archives.** The existing 18 pending candidate files are left unchanged.

## Open and try it

In VS Code, open `tests/archive-reconciliation.html` with **Live Server**, using Chrome on the Mac. The page automatically runs the checks; the expected result is **27/27 groups passed**. Expand Test results for details.

The interactive example contains 120 synthetic audio files and 120 synthetic transcripts, but starts with two one-entry manifests. The transcript manifest still references a deleted test TXT.

1. Leave **Complete folder inventory** selected. Check **I reviewed removing confirmed-missing transcript references**, then click **Preview synthetic reconciliation**. Expected candidate: 120 audio entries and 120 transcript references; the old deleted-test reference is removed. There is no file write in a preview.
2. Switch to **Partial mobile-style selection (one recording)**. Expected: the unobserved old reference is retained even if the removal checkbox is still checked. A partial observation cannot establish deletion or claim a full archive verification.
3. Select **Legacy transcript headers**. Without the separate legacy-association confirmation, no applicable candidate is released. Confirming it means only that these synthetic legacy references belong to the supplied, established test archive IDs; headers/body text are never rewritten and no archive UUID is generated.
4. Select **Transcript belongs to another Archive UUID**. Expected: conflict blocks the candidate; no silent relabeling.
5. Optionally click **Run disposable browser write test**. This creates three tiny synthetic WAV/TXT files inside a new browser-private filesystem directory, previews/applies both JSON updates, verifies readback and unchanged audio/TXT bytes, and removes the disposable directory. It has no real-folder picker and cannot use a supplied user-directory handle.

Native browser-private filesystem access requires browser/context support. Node runs 21 pure groups and explicitly skips the six native groups. iPhone pure previews may run where the APIs are available; this is not evidence of successful iCloud directory enumeration, native picker behavior or file saving on iPhone.

## Scope and evidence

Recorded verification:

- **21/21** pure reconciliation groups passed under Node v24.22.1, supplied by installed VS Code's Electron runtime.
- **27/27** groups passed in isolated Chrome, including six actual browser-private filesystem tests. The runner uses a new temporary profile and a localhost fixture server; the actual Memora database, user archives and cloud folders are untouched.
- Whole-archive inventory; source/archive UUID retention; repeated-run idempotence; extension retention; legacy association review; explicit missing-reference removal; partial selection; unreadable/provider errors; foreign archive/source identity; path collisions/traversal; conflicting header labels; deleting the last transcript without deleting recording identity; no-ID assignments supplied by the caller; changed audio decisions; duplicate IDs; preservation of historical model labels, alternatives and translation.
- Native verification includes both JSON write/readbacks, a deleted-TXT refresh, post-preview transcript changes, concurrent JSON replacement, candidate tampering and simulated failure before the second JSON write.

Audio fixtures are tiny synthetic WAV container shapes, not playable private recordings. Synthetic transcript text is generated in this folder. There is no inference, transcription selection UI, recursive audio-library scan, cross-archive matching or file/header migration.

## Safety / policy boundaries

The pure planner in `reconcile.js` imports the existing schema/header validators and identity decision code but is never imported by production. Inputs represent a supplied known archive/source and trusted enumeration evidence. No ID is invented from a name or content match. Body text is not used as recording identity. Unknown accepted manifest fields, model labels and operation separation are retained.

A missing TXT reference is removed only under complete transcript coverage and explicit review. The archive recording object is retained even when its last transcript reference is removed; audio identity stays intact. Under partial coverage, unobserved entries stay in place. Read errors block the candidate rather than masquerading as confirmed absence. Missing *audio* entries deliberately require a separate retention/removal policy decision; this lab does not invent that policy or silently purge established IDs. A valid reference from another audio source needs another association rather than automatic cross-source relabeling.

Legacy association is demonstrated only against known synthetic source/archive UUIDs and current embedded audio ID evidence. This does **not** establish that the Mac/iCloud legacy folders should adopt the UUIDs of their recent test manifests. The migrated Windows identities must still be compared before any real reconciliation is authorized.

`disposable.js` creates every writable root itself under OPFS, registers it internally and rejects unregistered/altered previews. Before writing, it re-enumerates files and compares full audio/TXT fingerprints plus original manifest contents. Only the two JSON files are changed; it does not create, delete, rename or rewrite audio/TXT during reconciliation. Fixture creation/cleanup are separate explicit test steps.

The two JSON writes are **not an atomic filesystem transaction**. An injected second-write failure truthfully reports the first verified write, leaves the original second JSON, and requires re-preview before retrying with stable IDs. Real external-program race conditions, cloud syncing, production crash recovery and user-interface integration still require design/acceptance. This prototype must not be presented as production-ready reconciliation.

## Files and commands

- `reconcile.js`: pure reconciliation preview and review gating.
- `fixtures.js`: synthetic audio/header/manifests and known test identities.
- `checks.js`: 21 pure plus six native groups.
- `disposable.js`: registered browser-private fixture I/O, preview binding and revalidation.
- `page.js`: standalone preview/scenario interface.
- `tests/archive-reconciliation.html`: page to open through Live Server.
- `tests/run-archive-reconciliation.mjs`: separate runner; does not modify the existing candidate's test runner.

```text
node tests/run-archive-reconciliation.mjs
node tests/run-archive-reconciliation.mjs --browser
```

The browser runner defaults to Chrome on macOS or Edge on Windows. Set `MEMORA_TEST_BROWSER` for another Chromium executable. No dependency installation or hosting/deployment is required.

The lab can be reviewed/committed separately from the pending candidate; no agent commit or deployment was performed. Real-archive reconciliation and broader library architecture remain paused.
