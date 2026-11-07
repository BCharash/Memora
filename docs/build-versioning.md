# Production build identification

Adopted 7 November 2026, matching iMuse's convention: **YYYY-MM-DD.N**, the UTC release-preparation date and a positive daily sequence starting at 1. Memora's first identifier is `2026-11-07.1`. Its sequence is independent of iMuse's; this is not semantic versioning or the database schema version.

`js/build-info.js` is the single source of the identifier. Before publishing changed application contents, advance it once per release. Several edits may belong to one unpublished candidate. Identical deployment retries keep the identifier; changed candidates need a new one if the earlier candidate was shared for testing. Documentation/tests-only changes do not need a new number. Never reuse an identifier for different released application contents.

The application populates “Memora build …” at the very bottom of the page, outside the tabs and Settings, in small text. HTML contains only the fallback “Build not identified”, not another copy of the number.

This identifies the loaded build module; it does not certify all cached modules/assets have the same revision. No automatic update, reload, cache clearing, service worker, or deployment workflow is introduced. Report displayed build, URL, and device/browser when describing a problem. Database version 5 and model configuration revisions remain separate identifiers.

## Release consistency — next project

The user confirmed an iPhone caching mismatch after this label was published. Reliable generated asset URLs and publication are now the next priority, before Whisper model validation changes. See [asset/deployment inventory](Asset_and_Deployment_Inventory.md) for scope and [current handoff](CURRENT_STATUS.md) for order. Build-tool configuration, old-asset retention and GitHub Pages settings still need a concrete proposal. The human-readable identifier remains useful alongside generated content hashes.
