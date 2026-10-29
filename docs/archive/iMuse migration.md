# iMuse Migration Plan

**Status:** Agreed direction and planning notes  
**Purpose:** Handoff document for the future transition from separate iMuse and Memora projects to one unified iMuse application.  
**Important:** This document records the decisions and intended approach discussed so far. It is not authorization to begin code changes before the relevant current files and repositories have been reviewed.

## 1. Final objective

The final product will be **iMuse**, maintained as one application in one repository and published at:

- **Required final URL:** <https://bcharash.github.io/iMuse/>
- Current Memora URL: <https://bcharash.github.io/Memora/>

Memora is now substantially more developed than iMuse and should be the technical foundation for the final application. Once the migration is complete, Memora will be retired as a separate production app. The goal is to avoid maintaining two parallel applications that require separate updates.

## 2. Intended user experience

The final iMuse will combine:

- iMuse's recording workflow for capturing thoughts on the fly.
- Memora's mature transcription, model-management, file-handling, and search capabilities.
- One shared transcription/model-management foundation, rather than duplicate implementations.

The tab order will be:

1. **Record** — the far-left tab.
2. Transcribe.
3. Edit and Combine.
4. Search.

The three existing Memora tabs should retain their current functionality and styling except where a change is required for integration.

### Recording requirements

The basic recording functionality should first be completed in the existing iMuse project. The original motivation for iMuse was to capture thoughts without having to manage the recording continuously.

Important requirements discussed:

- Reliable pause and resume.
- Pausing after a period of inactivity, if that is the intended behavior established by the existing iMuse design.
- A robust recording workflow suitable for spontaneous thought capture.
- Appropriate handling of recording state, audio, errors, and interruptions.

Voice Memos has audio editing, but audio editing is not considered an essential feature for iMuse. The key missing capability in Voice Memos is the ability to pause a recording, either manually or through inactivity.

## 3. Agreed migration strategy: replace iMuse's files with Memora's files

The proposed approach is **not to merge the Git histories or copy iMuse code into Memora**. Instead:

1. Finish development of the basic recording functionality in iMuse.
2. Reproduce and test that recording functionality in Memora, using a complete handoff document from the iMuse work.
3. Complete Memora's model-registry and stability overhaul before the final integration/release.
4. Once Memora contains all functionality required by the final product, use the existing local **iMuse repository** as the destination.
5. Back up both repositories and establish a recoverable Git checkpoint.
6. Replace the application files and folders in the local iMuse working directory with the complete, tested Memora files and folders.
7. Keep the destination iMuse repository's `.git` directory and history. **Do not copy Memora's `.git` directory into iMuse.**
8. Review and adapt repository-specific and deployment-specific files.
9. Review references to `Memora` and change those that should become `iMuse`. Do not blindly replace every occurrence: historical identifiers, migration keys, compatibility names, or other technical identifiers may need to remain.
10. Test the complete application, commit the replacement and subsequent identity changes, and publish from the iMuse repository.
11. Retire Memora as a separate production application once the unified iMuse has passed acceptance testing. Keep an archive/backup for historical reference as appropriate.

### Why this is viable

Git can record a large-scale filesystem replacement in a commit. Git does not require the old and new application structures to be similar. The destination repository retains its own identity and history as long as its `.git` directory is preserved.

The scale of the replacement does not fundamentally change the method, but it increases the importance of backups, reviewing the full Git change set, and testing configuration and deployment details.

## 4. Repository, GitHub Pages, and URL considerations

The existing project URLs are:

- Memora: <https://bcharash.github.io/Memora/>
- iMuse: <https://bcharash.github.io/iMuse/>

The final site must use the **iMuse URL**.

The plan is to keep the existing iMuse repository and replace its contents with the completed Memora-based application. This avoids needing to rename the Memora repository just to obtain the iMuse URL.

Before replacement, inspect and preserve/adapt the iMuse repository's relevant GitHub Pages settings and any repository-specific configuration. Review:

- Pages source/branch and deployment workflow.
- GitHub Actions workflows, if used.
- Build and deployment paths.
- Relative asset, worker, model, and manifest URLs.
- Project-site base path `/iMuse/`.
- Any repository-specific configuration that must remain.

After deployment, verify the exact final URL on desktop and iPhone. Do not assume that repository redirects also redirect a GitHub Pages project site.

## 5. App identity and dependency review

After the files are replaced, carefully review references and configuration that may still identify the application as Memora. Areas to inspect include:

- Page titles, application name, labels, and user-facing text.
- Icons, branding, manifest fields, theme colors, and PWA metadata.
- Import paths, worker paths, model URLs, asset paths, and deployment base paths.
- Package manifests, lockfiles, library versions, and dependency configuration.
- Service-worker configuration, cache names, cache versioning, and offline files if present.
- Repository-specific workflows and deployment configuration.
- Storage/database names, keys, and schemas.
- Any hard-coded assumptions about the `/Memora/` path.

Change identifiers based on their purpose, not via an indiscriminate global text replacement.

## 6. Essential clean-start requirement

The user wants the unified iMuse to start from a **complete clean state**, rather than inherit accidental application state from either predecessor. This is an essential part of the migration, not an optional cleanup.

The intention is to clear everything that can appropriately be cleared, accept the modest one-time cost of first-use setup, and verify that the new iMuse behaves like a fresh installation.

The cutover plan should inventory and handle the following separately:

### IndexedDB

- Identify all databases used by the existing applications.
- Clear the designated legacy application databases during the one-time migration/cutover.
- Recreate databases and object stores through the new application's canonical database initialization/schema code.
- Verify that the registry, transcription, search, and other stores initialize correctly from an empty state.
- Do not introduce database deletion on every normal app startup.

### Cache Storage and service workers

- Identify obsolete app caches and service-worker registrations that could serve old Memora or iMuse code.
- Clear or retire the relevant caches/registrations as part of the planned cutover.
- Verify that the published iMuse loads the intended current application files.

### Model assets and browser-managed storage

- The user's preference is to clear old model assets and start fresh, allowing iMuse to download the model assets it needs.
- Identify the actual model-cache mechanisms before implementation; clear the relevant application-managed/browser-managed caches where possible.
- Document any storage the app cannot directly enumerate or clear, and any user action that may be required.
- Verify that models can be fetched and tested again after cleanup.

### Application state and derived data

Start fresh with the new app's registry/test history, transcript indexes, semantic/search indexes, and other designated application-derived state. Do not accidentally retain incompatible data from the predecessors.

### Origin-scope caveat

GitHub Pages project sites at `/Memora/` and `/iMuse/` share the same web origin. Browser storage such as IndexedDB is generally scoped to the origin, not to an individual project path. Therefore, inventory the exact databases and caches used by both applications before cleanup, and be explicit about the intended scope. The migration should not assume that each path has separate browser storage.

### Clean-start verification

Treat the clean start as a one-time migration procedure, not a destructive action on ordinary launches. Verify the final iMuse on the Windows desktop, MacBook, and iPhone as applicable, including that all required databases/stores are recreated correctly and the app can perform its core functions from an empty state.

## 7. Memora model-registry and runtime robustness must come first

The registry overhaul is a major remaining task and is to be deferred until the user returns to the home workstation. The final iMuse should inherit a robust Memora platform, not the registry's current uncertainties.

The overarching goal is to use the most capable Whisper configuration that a device can run reliably without making the device/browser unstable.

The model-management system should be able to:

1. Assess device, operating system, browser, and relevant runtime capabilities.
2. Distinguish capability detection from actual backend initialization and successful inference.
3. Identify the exact model implementation/configuration, not just a family label such as Medium.
4. Assess model asset availability without treating cached assets as proof that a model works.
5. Run meaningful self-tests and preserve detailed evidence of outcomes.
6. Distinguish functional validity, performance suitability, standalone success, sequential stability, and production eligibility.
7. Manage resources it owns—such as references, workers, buffers, and object URLs—while honestly reporting what cleanup was attempted and what was confirmed.
8. Stop risky sequential tests after serious errors or signs of possible resource exhaustion, especially on iPhone.
9. Match the tested configuration to the configuration used in production.
10. Explain why a model/configuration is or is not eligible on a given environment.

Do not promise that a browser app can inspect or clear all system RAM or GPU allocations. Browser APIs may not expose complete memory usage, and worker termination does not prove immediate reclamation of every underlying resource.

### Important technical safeguards

- Preserve working safeguards until replacements are verified, including one-configuration-at-a-time testing and the known Medium q4 handling.
- Do not repeatedly crash Safari to obtain test data.
- Do not delete IndexedDB merely to conceal a schema error during the registry overhaul. First diagnose and establish safe recovery. The later planned iMuse cutover is a deliberate clean-start event and should be treated separately.
- Do not claim a model, backend, or resource cleanup is confirmed without evidence.
- Keep semantic-search changes, service-worker/offline work, and unrelated UI cleanup out of the registry overhaul unless specifically agreed.

## 8. Recommended work sequence

1. **Now, before returning to the workstation:** Preserve this plan and agree the target architecture. No code changes are authorized by this document alone.
2. **Finish iMuse recording:** Complete and test the basic recording behavior in the existing iMuse project.
3. **Create the recording handoff:** Document the behavior and preserve the tested source and a known-working commit.
4. **Resume Memora on the home workstation:** Obtain the current repository/build and latest versions of relevant files. Follow Memora's model-registry architecture plan.
5. **Audit first:** Produce an audit map and baseline report before making registry changes.
6. **Make Memora robust:** Improve self-test safety/observability, consolidate database ownership and the registry, persist test evidence, and connect production model selection to the same resolver used by testing.
7. **Reproduce recording in Memora:** Use the handoff and verify the complete recording workflow within Memora's architecture.
8. **Confirm feature completeness:** Memora now contains all functionality intended for final iMuse.
9. **Prepare the repository replacement:** Back up both repositories and create a recoverable checkpoint.
10. **Replace iMuse's application files:** Copy the complete Memora-based application into the existing iMuse working directory while preserving the iMuse `.git` directory.
11. **Adapt identity and deployment:** Carefully review all Memora/iMuse references, dependencies, storage, paths, branding, and GitHub Pages configuration.
12. **Perform the deliberate clean start:** Clear the designated databases, caches, model assets, and application state; recreate stores and verify fresh-install behavior.
13. **Acceptance testing:** Test the recording workflow, import/transcription, model selection, registry diagnostics, search, and the PWA on relevant devices.
14. **Commit and publish:** Commit the complete replacement and follow-up changes in the iMuse repository; verify `https://bcharash.github.io/iMuse/`.
15. **Retire Memora as a separate app:** Once iMuse is verified, stop maintaining the separate Memora production application while retaining a backup/archive as appropriate.

## 9. Development working rules

- Use the latest user-supplied source files for any code changes. If the current version of a file is not available, ask for it rather than relying on an older copy.
- Audit before editing and make changes incrementally.
- Preserve known-working behavior and safeguards until replacements are verified.
- Distinguish actual device tests from code inspection, simulations, and hypotheses.
- Do not claim that a change is verified unless the relevant check was actually run.
- Keep the recording handoff, registry overhaul, and final repository replacement as distinct, ordered stages.
- Do not start implementation merely because this plan exists; confirm the current repository/build and agree the immediate next action.

## 10. Definition of success

The migration is successful when:

- The final maintained application is **iMuse**.
- The final published URL is <https://bcharash.github.io/iMuse/>.
- The application has the Record tab first, followed by the three retained Memora tabs.
- Recording pause/resume and the agreed inactivity behavior work reliably.
- Mature Memora transcription, model management, file handling, and search capabilities remain functional.
- One authoritative registry/resolver is used by testing and production.
- The new iMuse has been tested from a deliberate clean state, with required databases and stores recreated correctly.
- Old caches or service workers do not unexpectedly serve obsolete app files.
- The iMuse Git repository and its history are retained, while Memora's `.git` directory is not copied over it.
- The user no longer needs to maintain two parallel production applications.

---

**Handoff status:** This document records the intended direction and decisions discussed so far. Repository-specific implementation details, exact database/cache names, and the final acceptance test list must be verified against the current source code when work resumes.
