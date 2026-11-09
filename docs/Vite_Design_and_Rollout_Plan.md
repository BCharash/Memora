# Vite design and rollout plan

Status update, 9 November 2026: deferred for Memora. The isolated step-2 setup was discarded before source adaptations; leftover tooling was moved outside the repository. No build/package files or deployment changes remain. This document preserves the design for possible later reuse; its installation steps are not the current task. See [current handoff](CURRENT_STATUS.md).

Step 1 design checkpoint, 7 November 2026. Repository baseline `bc43b76`, application build `2026-11-07.1` in `7cfb099`. This document proposes implementation decisions; nothing is installed, application code is unchanged and hosting remains untouched. Read [asset inventory](Asset_and_Deployment_Inventory.md) for the complete dependency map.

## Evidence and outstanding setting

- Main source branch is `main`. No package.json, lockfile, Vite configuration or Pages workflow exists in this checkout.
- Node/npm and GitHub CLI were not found on the current shell PATH. Mac reports macOS 15.8.2, Intel x86_64. Installation must account for this before step 2; do not assume npm is available.
- Public `https://bcharash.github.io/Memora/` returned HTTP 200 on inspection, with `Cache-Control: max-age=600`, ETag and Last-Modified. This is one observed response, not a guarantee of all clients/paths or permanent host policy.
- Unauthenticated GET of the repository Pages API returned 404. This does not establish whether Pages is configured from a branch or Actions. No credentials were inspected or hosting settings changed.
- User subsequently confirmed Settings → Pages reports branch-based publishing from `main`, at `https://bcharash.github.io/Memora/`. The user also confirmed the selected folder is `/(root)`. No custom domain was reported. `/Memora/` is the build base for this public URL. This is sufficient to prepare isolated step 2; no hosting switch is needed then.

## Proposed build choices

| Concern | Decision |
|---|---|
| Application structure | Keep vanilla HTML/JavaScript/CSS and existing module exports. No framework conversion. |
| Tooling | Vite as a project-local development dependency, npm lockfile committed. Select and record an exact stable Vite version during installation; no floating latest requirement in the deployment. |
| Node | Node 24 LTS as the conservative proposed build/runtime toolchain on Mac and CI. Record the exact selected patch in a version file. It satisfies Vite's published minimum; verify package engine requirements when selecting the exact Vite release. Do not replace unrelated system tooling. |
| Scripts | `npm run dev`, `npm run build`, `npm run preview`. CI installs with `npm ci`. Preview is a local verification server, not the public production server. |
| Output | `dist/` contains generated site; `assets/` contains content-hashed modules, dynamic chunks, CSS, workers and managed binary assets. Ignore node_modules and dist in Git. Never point current branch publication at unfinished dist. |
| Base | `/Memora/` for built site; verify preview at that path. Source/Live Server remains usable. |
| Entries | Main index plus `webgpu-test.html` as an explicit diagnostic entry. Docs and database harnesses remain source/local-only initially; do not copy the entire repository into output. |
| Worker output | ES module worker bundles (`worker.format: 'es'`); five explicit discoverable module-relative constructors. Preserve current pinned remote imports. |
| Compatibility | Start from explicit supported-device browser targets based on actual test browser versions, not Vite defaults alone. Record Mac/iPhone/Windows versions during step 3; lowering syntax targets does not polyfill WebGPU or unsupported APIs. |
| Debugging | Generate hidden source maps, retain them in the CI build artifact, exclude them from the public upload initially. Preserve the human build ID and record Git revision in release metadata. |

Vite's documented Node minimum is 20.19+/22.12+; Node 24 is listed as LTS. The exact package/version choice and lockfile do not occur in this documentation step. No dependencies or global tools are installed automatically by this plan.

## Preserve source workflow and isolate step 2

Step 2 adds only package/configuration, ignore entries and local build tooling. Do not add an active deployment workflow, change Pages source, rewrite workers or move existing assets in this step. Existing Live Server and branch publishing continue serving existing source normally. Users can continue ordinary development and pause indefinitely at this checkpoint.

An initial successful `vite build` is an output-generation check, not production readiness: unresolved plain-string workers, fixtures/icons and remote static imports may require the adaptations in step 3. If a full app build requires source changes, keep step 2 at an isolated setup/build diagnostic; do not silently expand into asset migration. Record warnings/failures explicitly. Reconcile later ordinary source edits before resuming the conversion.

Step 3 adaptations should retain native module-relative patterns where possible so Live Server still works. If a Vite-only transform becomes necessary, isolate it on a migration branch until the complete candidate is verified; do not publish a half-converted source tree.

## Asset and external dependency handling

- Replace document-relative worker strings with literal `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` constructions at each platform branch. Preserve existing worker protocols and model routing. Vite requires directly discoverable URL/constructor patterns.
- Use build-recognized module-relative URLs for self-test audio/text and dynamic tab icons. Keep them usable natively under Live Server; generated output must reference emitted hashes. Do not simply copy the fixture directory and call it versioned.
- Process HTML CSS/icon references and emit the manifest deliberately with correct icon/start URLs. Prefer no inlining for executable workers and diagnostic fixtures; small images may be inlined if references remain correct. Assets intentionally left stable (such as browser implicit favicon.ico) must be documented.
- Do not bulk-copy docs/tests/labs. Tests' import maps must retain isolation; source database tests run separately from built application acceptance. Do not transform a test so it opens/clears Memora.
- Keep exact external MP4Box 0.5.4, DOCX 9.7.1, Transformers.js 3.7.2/4.0.0 URLs and existing model API paths. Configure main/worker build externalization explicitly for remote module imports as needed. Do not upgrade or inadvertently download/bundle alternate ML runtimes. Confirm remote imports survive in emitted code and operate in module workers.
- Generated user TXT/DOCX/HTML/JSON, selected recordings, object URLs, IndexedDB and model Cache Storage remain outside app fingerprinting. Future offline packaging must enumerate generated output rather than maintain a competing handwritten app module graph.

## Publication design — inactive until later authorization

After complete local/built acceptance, propose GitHub Actions publication on pushes to main and manual dispatch: checkout → pinned Node → npm ci → build/validate → assemble retained assets → upload Pages artifact → deploy through github-pages environment. Pin workflow actions to reviewed commit SHAs at implementation. Use least required permissions: contents read, pages write and id-token write; retrieving prior build artifacts additionally needs actions read. No secret/personal token is proposed.

Serialize publication so a deployment is not interrupted halfway through; obsolete queued work may be superseded but a running deployment should finish. Record release build ID, Git SHA and successful deployment metadata. Build failure must not replace the last good site. Prepare and review the concrete workflow before changing Pages Source to GitHub Actions. Do not enable a new automatic workflow during step 2.

### Proposed old-asset policy

Publish current generated HTML/manifest and assets, plus hashed asset closures from the **five preceding successfully published Vite releases** whose archived build artifacts are still available. Store per-release current-only assets/manifests in Actions artifacts for 90 days, subject to repository/organization limits. Reassemble from successful release records; do not recursively retain merged uploads or mistakenly count failed builds as published releases. Reject filename collisions with different bytes.

This is bounded release support, not an indefinite guarantee: pages older than that window may need a safe manual reload. Before switching publication, test retrieval/permissions/artifact retention and document the actual window. Missing expected unexpired artifacts should stop publication rather than silently remove support. Keep at least the previous complete deployable site artifact for rollback; do not mix old HTML with new entry bundles. Artifact expiry means some long-lived tabs will eventually fall outside support.

For the first migration, retain a snapshot of the last source-based release's js/css/fixture paths in the published output for that same transition window. Hashed output uses a different assets namespace. This supports known legacy entry/worker requests but cannot retrospectively repair already mixed caches from older source deployments. Verify the transition with a real old open tab; do not promise full compatibility for arbitrary earlier versions.

Exact artifact selection/metadata mechanics need implementation testing in step 5; this document does not claim Vite or GitHub automatically retains old deployed assets. No extra source release-directory tree or persistent branch is proposed.

## HTML freshness and safe recovery

Hashing gives distinct URLs to changed assets once updated HTML is obtained. Current Pages HTML may remain fresh in a browser/CDN for up to its advertised cache lifetime; hashed assets do not themselves force HTML revalidation. Do not claim immediate every-client deployment, or that a query parameter on app.js versions its dependency graph.

Use normal navigation/manual reload at an idle point. No forced refresh, unconditional cache clearing, service worker or mid-transcription update activation. During step 5, measure HTML headers and A-to-B reload behavior using existing caches. A lazy-import failure should produce an actionable reload-when-idle message in a separately reviewed recovery change if needed, never reload automatically during active work. If observed HTML caching still fails the agreed update expectation, revisit hosting/explicit update detection rather than declaring hashing a complete fix.

## Five checkpoints and stopping conditions

1. **Design prepared (this step).** Review choices; capture Pages Source before hosting work. Documentation only; safe to stop and continue normal app development.
2. **Isolated Vite setup.** Choose/install tooling, lock dependencies, run initial output diagnostic. Source and publication unchanged. Safe indefinite break; no iPhone test.
3. **Asset adaptation and built candidate.** Resolve all five workers, chunks, icons, manifest and fixtures; inspect output URLs and externals. Test at `/Memora/`. Safe break before any hosting switch; Live Server continuity or migration-branch isolation must be demonstrated.
4. **Local acceptance complete.** Startup/build footer, tab icons, metadata decode, Tiny transcription/self-test, Search/paragraphing, edits and all Combine formats; isolated database tests remain source-based. Browser/device tests must be real where claimed; no model-policy/schema changes. Safe break before publishing.
5. **Publishing transition and two-release test.** Switch only after explicit instruction and verified artifact. Complete first public startup/deployment verification in one sitting; retain rollback artifact. Then publish A/B and test cached clients/old lazy worker loads on Mac/iPhone/Windows. Roll back deployed files using a compatible build, never database version downgrade. Stop after recording real acceptance.

Estimates remain approximately 4–7 implementation/local verification hours overall, plus user tests/publication waits. Step 1 is complete as a written design; Branch-based publication from main → /(root) is user-confirmed. Nothing in this file starts step 2.

## Official references consulted

- [Vite getting started / Node requirements](https://vite.dev/guide/)
- [Vite static deployment / GitHub Pages base and workflow](https://vite.dev/guide/static-deploy.html)
- [Vite worker constructors](https://vite.dev/guide/features.html#web-workers)
- [Vite worker output format](https://vite.dev/config/worker-options.html)
- [Vite static asset handling](https://vite.dev/guide/assets.html)
- [Node release status](https://nodejs.org/en/about/previous-releases)
- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages configuration API](https://docs.github.com/en/rest/pages/pages#get-a-github-pages-site)
