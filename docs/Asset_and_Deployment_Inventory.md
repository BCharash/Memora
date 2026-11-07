# Asset and deployment inventory

Reviewed 7 November 2026 at commit `7cfb099` (Build history implementation). Repository inspection only; no build configuration, application code, hosting settings or storage changed. This is a proposal checkpoint, not authorization to deploy a new toolchain. No new browser/device tests were run.

## Current release problem

The user reported the build footer worked on Mac but showed “Build not identified” on iPhone and confirmed caching was involved. Current HTML, CSS, application modules, workers and data fixtures use stable URLs. A new HTML document can therefore coexist with older cached JavaScript. The footer reports the loaded build module, not integrity of the full dependency graph.

The desired outcome is generated content-fingerprinted application assets with references updated together, keeping readable source filenames. Normal releases should require no website-data clearing. Already-open pages must retain their running code and not be forced to reload during recording/transcription.

## Entry points and publishing evidence

| Item | Current state | Build/deployment requirement |
|---|---|---|
| `index.html` | Main app; module entry `js/app.js`; stylesheet `css/style.css`; inline Settings CSS; external MP4Box classic script | Generate HTML referencing matching built assets; preserve inline styles, external script ordering/global behavior and page layout. |
| `webgpu-test.html` | Standalone GPU diagnostic with inline JavaScript | Preserve its published URL or explicitly document its source-only/local diagnostic role. Do not unintentionally drop it. |
| `tests/database.html` | Schema harness importing production database manager | Keep available for local regression tests; choose explicitly whether to publish tests. Run source and built validation separately. |
| `tests/database-integration.html` | Production-module test harness with import-map substitution | Do not bundle blindly: import map must still substitute the isolated database adapter before production modules load. Do not allow a built test to open/clear real Memora storage. |
| `manifest.json` | Relative `start_url: ./`; standalone mode and two icon URLs | Preserve project-relative launch URL and icon resolution. Manifest alone does not implement offline operation. |
| Git remote | `https://github.com/BCharash/Memora.git` | Expected public project base `/Memora/`; confirm actual Pages URL, branch/folder and custom-domain settings before configuring deployment. |
| Build setup | No package.json, lockfile, Vite config, .github workflow or .nojekyll found | New build tooling and publishing workflow would be introduced deliberately; current server-side Pages settings are unknown. |

The separate `iMuse-wake-command-lab/` workspace was not included in this production asset scope. No iMuse repository changes are proposed. Other documentation/journal HTML snippets are not application entry points.

## Application modules and assets

The entry module statically imports build identification, Combine/transcription/Search UI, Combine share export, and Settings. Transitive imports include runtime, database/model management, Whisper and its self-test. Its literal dynamic imports load storage, storageManager, transcription, combine, HTML/DOCX generation, Whisper, paragraphing, Search and metadata. Search also dynamically imports semantic.js. These local static and literal dynamic imports should form one generated dependency graph; verify emitted chunks, rather than versioning only app.js.

| Asset/path pattern | Current owner | Required treatment |
|---|---|---|
| `css/style.css` | HTML link; CSS uses no external `url(...)` asset references found in this audit | Fingerprint stylesheet and rewrite link. Inline CSS stays part of generated HTML. |
| `js/build-info.js` | Imported by app.js; human release ID `2026-11-07.1` | Preserve the `YYYY-MM-DD.N` convention alongside generated hashes. Advance for the first changed published candidate; docs-only work does not advance it. |
| `icons/transcribe.png`, combine.png, search.png | Initial HTML image plus JavaScript strings in app.js tab configuration | Replace runtime string paths with build-recognized asset references or explicit versioned URLs; otherwise copied icons remain unversioned. Verify all tabs and project-base paths. |
| favicon-32.png, apple-touch-icon.png | HTML links | Emit/rewrite consistently; browser/installed home-screen icon refresh may have its own lifecycle. |
| icon-192.png, icon-512.png | Manifest icon strings | Rewrite/emit manifest references deliberately or document stable assets; copying to public output alone does not fingerprint them. |
| favicon.ico | Repository root/browser implicit request | Keep an explicit policy for this fallback asset. |
| test-audio.m4a, expected-transcription.txt | `whisperSelfTest.js` fetches `./data/whisper-test/...` with no-store | Make both build-managed URL assets; preserve binary/text content and deployed base. no-store avoids reuse for these requests but does not tie an unchanged URL to a release. |
| Downloaded/generated TXT/DOCX/HTML/JSON and selected recordings | File APIs and object URLs; generated HTML has relative recording references | User artifacts, not build inputs. Preserve exported document portability; do not fingerprint user filenames or interfere with sharing/object URLs. |

## Five workers

| Worker | Construction | Build concern |
|---|---|---|
| whisper-desktop-worker.js | `new Worker("./js/whisper-desktop-worker.js", {type:"module"})` in whisper.js | Change to a build-recognized module-relative worker reference. |
| whisper-ios-worker.js | Plain string URL in whisper.js and conditional URL in whisperSelfTest.js | Both consumers must resolve the same generated worker; avoid an opaque conditional expression the bundler cannot discover. |
| whisper-test-worker.js | Conditional plain string URL in whisperSelfTest.js | Preserve distinct diagnostic worker; build it explicitly and keep message protocol. |
| semantic-worker.js | `new Worker(new URL("./semantic-worker.js", import.meta.url), ...)` | Already uses a conventional discoverable pattern; verify generated module worker and external import behavior. |
| paragraphing-worker.js | Same module-relative URL pattern | Verify worker discovery, queue behavior and CDN dependencies in generated output. |

Generated worker code must preserve browser module semantics and remote runtime imports; do not silently bundle/swap ML runtime versions during this conversion.

## External dependencies and model assets

| Dependency | Existing reference | Boundary |
|---|---|---|
| MP4Box | jsDelivr mp4box@0.5.4 classic script in index.html | Preserve pin and global consumed by metadata.js. Vendoring is optional separate scope; verify audio metadata still loads. |
| DOCX | docx@9.7.1/+esm, dynamic import using DOCX_LIBRARY_URL | Keep explicit external import handling; verify TXT/DOCX/HTML exports. Variable remote URLs are not local bundle assets. |
| Transformers.js 3.7.2 | Static remote imports in iOS Whisper, semantic and paragraphing workers | Preserve runtime compatibility; remote transitive modules and WASM are not made local or fingerprinted by hashing Memora assets. |
| Transformers.js 4.0.0 | Dynamic remote imports in desktop/test workers and existing whisper.js loader | Preserve exact version and runtime-loading behavior. Confirm build output does not rewrite these to missing local paths. |
| Hugging Face model API/weights/tokenizers | modelManager and ML library loading; semantic workers use browser cache | Outside the app release graph. App hashing does not prove complete model caches or freeze upstream model revisions. Exact model revision/validation belongs to registry work. |

No service-worker registration or implementation was found in active app code. No cache-version manager is currently present. Existing model Cache Storage and IndexedDB are distinct from HTTP caching and must not be cleared to solve app caching.

## Proposed implementation checkpoints

1. **Agree build/deployment shape.** A conventional tool such as Vite is the candidate, not yet installed. Consult current official tool/Pages documentation before choosing configuration. Establish Node version, locked dependencies, project base, HTML/diagnostic entries, external imports and emitted module-worker format. Preserve source-local testing through Live Server where useful, but test the generated production output too.
2. **Build locally without switching hosting.** Introduce package/config/lockfile and explicit worker, fixture and icon URLs. Emit disposable dist output; keep source tracked. Ensure no raw `./js/...` worker URLs or stale source-module paths remain in the output. Keep integration tests source-only initially unless built-test isolation is independently verified. Natural break: inspect generated output and pass local workflow checks before touching Pages.
3. **Verify production output.** Test under `/Memora/`, not only localhost root. Check tabs, build footer, icons, metadata decoding, desktop/iOS Tiny paths, standalone self-test fixtures, Search/paragraphing workers, edits, sharing and all Combine formats. Rerun isolated database regressions on source. No database schema or model policy changes belong in this conversion.
4. **Prepare automated publication.** Review existing GitHub Pages settings, use a workflow that installs from the lockfile, builds, and publishes only the generated site. Prevent partial/overlapping releases. Prepare the concrete workflow and settings instructions before asking for any hosting-setting approval. Do not switch publishing until local output is verified. Natural break before first new deployment.
5. **Test a real update without clearing caches.** Publish candidate A, use it on Mac/iPhone/Windows, then publish changed B and verify normal navigation/reload obtains B and its matching lazy chunks/workers. Verify an already-open A remains safe while active. A fresh Private tab is a diagnostic, not the acceptance test for a cache fix.

## Update and old-asset policy to settle

Hashing assets does not force an old HTML document or an open page to update. Inspect actual HTML cache headers and normal reload behavior on GitHub Pages; do not promise custom HTTP cache headers unless the host supports them. Test navigation and installed/home-screen launch separately if used. A small update notice/reload-at-idle mechanism is optional later scope, not a forced mid-operation refresh.

Old open pages can request lazy chunks/workers after publication. A clean dist deployment that removes the preceding release's files can break them even with correct hashes. Define bounded retention of previous generated assets or a safe recovery policy before rollout. Retention must consider executable chunks, workers and their referenced assets, not only the main bundle. No per-release source folder tree or database rollback is needed; generated assets and application/database compatibility remain separate concerns.

## Scope and next decision

This conversion addresses local app/CSS/worker/fixture release consistency. It does not implement offline Tiny, service-worker caches, library upgrades, model eligibility, a resolver, database migrations or iMuse integration. Coordinate the future offline plan with generated output rather than maintaining a second source asset list that can drift.

The next decision is the build/deployment proposal and old-asset retention policy. The inventory is a natural stopping point; no application tests or iPhone deployment are required for this documentation-only work.
