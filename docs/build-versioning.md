# Production build identification

21 November 2026: **2026-11-21.6**, database **9**. Retire production audio JSON persistence/export gating and introduce rebuildable audioFolderCatalogues with preserving upgrade. Consolidate latest identified audio/transcript metadata snapshots. Search embeddings, model configuration/evidence and TXT identities remain unchanged; no deployment by Codex.


21 November 2026: **2026-11-21.5**, schema **8** unchanged. Standardize folder cache Settings sections, disclosure styles and individual selectable transcript metadata snapshots. Preserve other stores and reject stale snapshot deletion atomically. No model/configuration revision or audio JSON retirement.


21 November 2026: **2026-11-21.4**, schema **8** unchanged. Refresh the transcription gate after delayed folder discovery, prepare rows on visible returns without a transcript selection, clear stale source rows, and group transcript metadata by parent audio folder. 80 targeted checks passed; actual iPhone acceptance pending.


21 November 2026: candidate **2026-11-21.3**, schema **8** unchanged. Fix hidden forwarded iPhone audio-list save clicks bypassing Enable Transcription; 28 targeted groups passed. Device acceptance pending.


Current candidate **2026-11-21.2**, schema **8**: atomically migrate full-text cached transcripts from filename keys to existing Archive UUID/Recording ID variant keys, preserving legacy copies and other stores. Failed upgrades roll back. Browse labels and conditional Enable Transcription gating are refined. See [current status](CURRENT_STATUS.md). Earlier entries below describe their dated versions.


Adopted 7 November 2026, matching iMuse's convention: **YYYY-MM-DD.N**, the UTC release-preparation date and a positive daily sequence starting at 1. Memora's first identifier is `2026-11-07.1`. Its sequence is independent of iMuse's; this is not semantic versioning or the database schema version.

`js/build-info.js` is the single source of the identifier. Before publishing changed application contents, advance it once per release. Several edits may belong to one unpublished candidate. Identical deployment retries keep the identifier; changed candidates need a new one if the earlier candidate was shared for testing. Documentation/tests-only changes do not need a new number. Never reuse an identifier for different released application contents.

The application populates “Memora build …” at the very bottom of the page, outside the tabs and Settings, in small text. HTML contains only the fallback “Build not identified”, not another copy of the number.

This identifies the loaded build module; it does not certify all cached modules/assets have the same revision. No automatic update, reload, cache clearing, service worker, or deployment workflow is introduced. Report displayed build, URL, and device/browser when describing a problem. Database schema versions and model configuration revisions remain separate identifiers.

## Production identity candidate 20 November 2026

**2026-11-20.3** identifies reproducible production enrollment/rebuilds, retired TXT source-UUID binding, sampled-ID playback and Search vector compatibility. Schema remains 6; no cache reset, deployment or user-file modification. Shared folder UI and cache retirement are later steps. See [current status](CURRENT_STATUS.md) for acceptance boundaries.

## Reviewed source checkpoint — 19 November 2026

Current build module displays **2026-11-19.25**; committed source **47ca641** also contains a subsequent html.js reader update. The .24 audio-folder fix and .25 shared in-app guidance were committed together in 33e69dc. A footer value therefore does not uniquely identify the later HTML revision; retain both commit and displayed build in the documentation/test record. This review does not alter APP_BUILD or claim deployment. The rule above still applies to future changed releases; documentation-only changes need no new application number.

## Release consistency — deferred

The user confirmed an iPhone caching mismatch after this label was published. Generated asset URLs and a build/deployment conversion were proposed, but the isolated Vite setup was intentionally discarded. GitHub Pages remains `main` → `/(root)`; normal Live Server/source publishing continues. See the archived [asset inventory](archive/Asset_and_Deployment_Inventory.md) and [Vite plan](archive/Vite_Design_and_Rollout_Plan.md) if revisiting that separate project. They require a fresh audit; they are not prerequisites for current Whisper work.

The 13 November candidate application build was **2026-11-13.10** (self-test timelines and problem reports). The earlier 2026-11-11.4 runtime/Settings device acceptance remains as recorded in CURRENT_STATUS.md; the reporting checks do not certify real model sequence stability. Documentation-only changes do not advance the identifier. The footer remains useful for diagnostics but does not establish that every cached module belongs to the same release. Current priorities are in [the handoff](CURRENT_STATUS.md).

16 November 2026: the proposed integrated migration candidate 2026-11-16.1 was withdrawn. All four migrations are now complete and the disposable utility has been removed; production files/build remain 2026-11-13.10. Do not reuse 2026-11-16.1 for another changed application release.

18 November 2026: isolated identity checkpoint 2B adds shared database schema 6. No release is prepared and the build ID remains unchanged; advance it before publishing these changed application contents. This does not certify checkpoint 3 integration or iPhone acceptance.

Checkpoint 3 candidate, 18 November 2026: **2026-11-18.1** identifies actual transcription/metadata/save UI changes. No deployment is performed. Database schema remains 6 and model configuration fingerprints/options are unchanged. Manual desktop and real-iPhone acceptance remain pending.

Current interface/header candidate **2026-11-18.4** consolidates the approved Audio recording list / Transcript file list wording, bounded expected-kind picker validation, existing-style pending-save pulse and readable TXT header ordering. The earlier .2 picker defect hypothesis was not confirmed; the user clarified selecting the other JSON type. Intermediate .2/.3 candidates were superseded; do not reuse those identifiers for changed releases.

New TXT headers group dates/duration, Whisper model/operation/optional language before a blank line and identity/provenance. Values and body formatting are unchanged. Existing files, schemas, audio exports and model configuration fingerprints/options are unchanged. 22 focused integration groups passed; iPhone visual/native-picker acceptance remains pending. Library/reconciliation implementation is separate. No agent commit/deployment was performed.

21 November 2026: candidate **2026-11-21.1**, database **7**. Retire the production transcript sidecar dependency in favor of TXT-derived local metadata, retain audio and embeddings JSON, and add session intent/Enable Transcription plus destination/save-message fixes. Schema 7 adds only the rebuildable transcriptCatalogues store; existing data is preserved. This is not a model/configuration revision or deployment.
