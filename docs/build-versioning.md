# Production build identification

Adopted 7 November 2026, matching iMuse's convention: **YYYY-MM-DD.N**, the UTC release-preparation date and a positive daily sequence starting at 1. Memora's first identifier is `2026-11-07.1`. Its sequence is independent of iMuse's; this is not semantic versioning or the database schema version.

`js/build-info.js` is the single source of the identifier. Before publishing changed application contents, advance it once per release. Several edits may belong to one unpublished candidate. Identical deployment retries keep the identifier; changed candidates need a new one if the earlier candidate was shared for testing. Documentation/tests-only changes do not need a new number. Never reuse an identifier for different released application contents.

The application populates “Memora build …” at the very bottom of the page, outside the tabs and Settings, in small text. HTML contains only the fallback “Build not identified”, not another copy of the number.

This identifies the loaded build module; it does not certify all cached modules/assets have the same revision. No automatic update, reload, cache clearing, service worker, or deployment workflow is introduced. Report displayed build, URL, and device/browser when describing a problem. Database version 5 and model configuration revisions remain separate identifiers.

## Release consistency — deferred

The user confirmed an iPhone caching mismatch after this label was published. Generated asset URLs and a build/deployment conversion were proposed, but the isolated Vite setup was intentionally discarded. GitHub Pages remains `main` → `/(root)`; normal Live Server/source publishing continues. See the archived [asset inventory](archive/Asset_and_Deployment_Inventory.md) and [Vite plan](archive/Vite_Design_and_Rollout_Plan.md) if revisiting that separate project. They require a fresh audit; they are not prerequisites for current Whisper work.

The current candidate application build is **2026-11-10.5** (iOS execution-report sharing). Documentation-only changes keep that identifier. The footer remains useful for diagnostics but does not establish that every cached module belongs to the same release. Current priorities are in [the handoff](CURRENT_STATUS.md).
