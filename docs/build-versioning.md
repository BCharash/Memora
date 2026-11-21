# Operations, build identification and deployment

Current repository reference, **21 November 2026**, commit **b9f8a35**, application **2026-11-21.11**, database schema **10**. This consolidation changes documentation only; it does not publish, cancel a deployment, alter hosting/workflows or run application/model tests.

This guide keeps the existing **build-versioning.md URL** for bookmarks and the reference in build-info.js. Complete originals remain archived: [build identification/history](archive/2026-11-21-operations/build-versioning.md) and [Pages incident/recovery](archive/2026-11-21-operations/Pages_Deployment_Recovery.md). Their dates, observations, withdrawn candidates and test evidence are retained.

## What the repository currently ships

Memora is served as the repository's HTML/CSS/JavaScript source, including module imports and worker files. There is no package manifest, Vite configuration or committed bundling step in the current checkout. The only repository workflow is the manual [Recover stuck Pages deployment](../.github/workflows/recover-pages.yml); it is not a build/publish workflow.

The last recorded GitHub Pages configuration is **main / repository root**. This review did not query live GitHub settings, runs or HTTP cache headers. Check the repository's Settings → Pages when verifying publication; do not switch publishing source or introduce a new workflow as routine troubleshooting.

The manifest's relative start URL supports the project path but does not establish offline readiness. [Vite/release conversion](archive/Vite_Design_and_Rollout_Plan.md), [asset inventory](archive/Asset_and_Deployment_Inventory.md) and [offline Tiny](archive/Offline_Whisper_Tiny_Implementation_Plan.md) remain deferred, dated proposals. They require a fresh audit before use and are not installation/publishing prerequisites.

## Build, commit, schema and model identity

| Identifier | Meaning |
|---|---|
| APP_BUILD in [js/build-info.js](../js/build-info.js) | Single application release label, displayed at the page bottom. |
| Git commit SHA | Exact repository source checkpoint; retain it alongside the footer label. |
| Pages deployment/run | Publication attempt for a particular source; successful build/artifact is not proof of successful deployment. |
| DATABASE_VERSION in [database.js](../js/database.js) | Independent storage compatibility/migration version. |
| Whisper definition/fingerprint/protocol/fixture identity | Independent model-execution and qualification inputs; not the app's cosmetic release number. |

Build format is **YYYY-MM-DD.N**: UTC release-preparation date plus positive daily sequence starting at 1, independent of iMuse and schema versions. It is not semantic versioning.

- Advance once for a changed application release. Several edits may share an unpublished candidate.
- Identical deployment retries retain their identifier. If a candidate was already shared for testing, changed application contents need a new identifier.
- Never reuse a published/shared or withdrawn candidate label for different application contents.
- Documentation/tests-only changes need no application number.
- HTML contains only the fallback Build not identified; app.js calls displayBuildInfo. Do not add another hard-coded number.
- Record both commit and displayed build: earlier history includes different source contents under the same footer, which is why the label alone is insufficient provenance.

The footer identifies the loaded build module, not guaranteed revision consistency of every cached import/worker/asset. A build label or requested backend also does not prove model execution or memory behavior.

## Local development and focused verification

Use VS Code Live Server from the repository root or a plain static server; no package installation is required. Open index.html through HTTP rather than a file URL so module/worker paths and security-sensitive APIs can work.

One optional plain-server command, run from the repository root:

    python3 -m http.server 8000 --bind 127.0.0.1

Then open **http://127.0.0.1:8000/** on that computer. localhost/127.0.0.1 on an iPhone refers to the phone, not the Mac. An actual phone check needs its intended hosted site or an explicitly arranged reachable development origin; serving locally does not publish to Pages.

A different host, port or browser profile is a different storage context. Source availability, permission and downloaded models may therefore differ between Live Server, a plain server and the hosted site. Do not interpret missing local data as proof that production data was deleted.

Use the [test guide](../tests/README.md) for current harnesses and runner limitations. Synthetic tests belong in a disposable profile; shared-origin production databases/models must not be cleared for a fixture run. Open manual harness pages without report=1 unless using their matching report orchestrator.

For an agreed long-running model/device investigation, keep the server stable and avoid editing watched files during the run. Live reload can interrupt work and confuse a resource-failure observation. A documentation change needs link/source/preservation checks, not a fresh model qualification test.

## Publishing and verifying a release

1. Review Git status/diff and the intended commit contents. Do not include unrelated local files or user archives. Prepare a new app identifier only when the change requires one.
2. Run checks appropriate to the change. Preserve source text, models, evidence and embeddings; publishing is not a reason to rebuild inventories or clear databases.
3. Commit/push through the user's chosen Git workflow when ready. For the recorded branch/root Pages setup, inspect the corresponding Pages build/deployment rather than assuming a local Go Live result is the hosted release.
4. While signed into GitHub, inspect the correct repository's Actions/Pages run for the expected commit. Build success, an artifact SHA and an upload are separate from deployment success.
5. After deployment reports success, open the intended hosted application URL and confirm footer/build plus the relevant changed behavior. Check a changed diagnostic URL separately when relevant; verify filename case and that it is committed.
6. Record commit, displayed build, run/deployment result, URL, browser/platform and observed behavior. Do not turn a successful desktop load into iPhone/Files/model acceptance.

This documentation task does not perform any of those publication actions.

## Local success, hosted 404 or stale code

When a page works locally but returns hosted 404, check the exact path/case, whether the file is tracked/committed/pushed, the expected publishing source and the deployment for that commit. A queued/failed deploy can leave the previous site in place even when a new build artifact exists. Do not repeatedly change application code to solve an unexamined publication failure.

When the footer or behavior looks stale:
- Preserve pending transcripts/drafts and useful diagnostics before a deliberate reload.
- Compare URL, source commit, expected build and actual deployment status. A working root test.html does not prove every new page/module was published.
- Distinguish an old open document/module graph, normal browser HTTP asset caching, model Cache Storage and IndexedDB.
- A separate fresh profile can diagnose caching, but it is not acceptance that normal existing sessions update correctly.
- Do not routinely clear website data, model downloads, qualification or embeddings. A host/cache update policy requires its own evidence and scope.

No service-worker/update notice, forced reload, content-hashed asset conversion or cache-clearing mechanism is introduced by this guide.

## Recovering stuck Pages

Use this path for the specific reported **in-progress Pages deployment** blocker, not every queued or failed job. Preserve the exact error/run URL and identify the deployment commit SHA GitHub says is still in progress. It can differ from the newer commit whose publication failed.

The repository's manual workflow sends a cancellation request for **one supplied Pages deployment SHA**. It uses its repository token with pages:write, checks for HTTP **204**, and otherwise fails with the returned error. This describes the checked-in workflow, not a live API call performed by this review.

1. Sign into the repository and open Actions → **Recover stuck Pages deployment**.
2. Choose Run workflow on the branch containing the reviewed workflow, normally main.
3. **Replace/check deployment_commit against the current error.** The checked-in default is the old incident SHA **0d6b3ac5cba9eb332ef5c10a1d6d3de3aed36da1**. Do not blindly leave it for a different incident.
4. Run once for that diagnosed stuck deployment. A failed/non-204 job is not successful recovery; preserve its error. No personal token needs to be pasted into this workflow.
5. A successful job means the cancellation request was accepted, not that the latest site is deployed. Allow it to settle, then inspect/retry the relevant Pages deployment as appropriate.
6. Verify the intended commit/build and changed page after deployment succeeds. If the blocker persists, preserve run/error evidence and escalate the host-side incident rather than making unrelated app commits or repeatedly changing hosting settings.

Canceling an ordinary Actions run and canceling the server-side Pages deployment are not the same operation. A queued recovery job has not canceled anything. The workflow does not build/publish, delete artifacts or change Pages settings; repository permissions/policy can still reject it.

## Preserved incident and uncertainty

The 21 November incident left .3 served while newer commits built but deployment failed. The error named the old in-progress SHA above; an artifact existed and a later retry queued. The Node punycode warning was not the fatal deployment error in that incident. The user later reported recovery worked.

The archived recovery document's final “real cancellation remains unexecuted” describes its original authored checkpoint; it does not erase that later user report. No authenticated GitHub operation, live setting query or independent publication confirmation was performed by this documentation consolidation.

Earlier recorded workflow validation covered YAML/shell and synthetic accepted/rejected/invalid-input cases without network/token exposure. Those are dated results, not a workflow rerun today. Keep the full archived incident narrative and workflow source together when revisiting.

## Rollback and future changes

Recover source deliberately while respecting current schema compatibility. A schema-10 database is not repaired by loading incompatible older code or resetting it. Model configuration changes have separate qualification consequences; a cosmetic app version cannot waive them. See [identity/storage preservation](Recording_Identity_and_Storage.md#database-ownership-and-preservation) and [Whisper qualification](Whisper_Architecture_and_Qualification.md).

A future Vite/offline/release conversion must account for transitive modules/workers/CDN assets, old open pages, project base URLs, isolated tests and bounded old-asset retention. The archived plans preserve those lessons but their old dependency inventories are not current setup instructions.

## Documentation-only maintenance

Record current operational rules here, current application scope in the [handoff](CURRENT_STATUS.md), and dated evidence in the journal/archive. Preserve the [user memory handoff](Memora_Whisper_Memory_Handoff.md) for separate feasibility work; publication housekeeping does not implement it.

This pass leaves application **2026-11-21.11**, schema 10, workflow and Pages configuration unchanged. No runtime/model/device tests, memory measurements, deployment, cancellation or repository commit were performed. Link, source, narrative/hash and whole/split journal checks validate documentation only.
