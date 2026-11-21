> **Archived 21 November 2026 - operations history.**
> Current guide: [operations and deployment](../../build-versioning.md). The complete original follows; only this notice and local navigation targets are adapted. Historical build labels, next steps, old incident SHA defaults and unexecuted-at-the-time claims are dated evidence, not current instructions.

# Recovering a stuck GitHub Pages deployment

21 November 2026. The live site remained on build 2026-11-21.3 while commits 972915f and 5bcad94 built successfully but failed to deploy. The Pages API reported commit **0d6b3ac5cba9eb332ef5c10a1d6d3de3aed36da1** as already deploying, even though its Actions run and ordinary deployment status showed success. A retry then remained queued with no jobs. This is a Pages deployment blocker, not a compilation error. The Node punycode warning is not the fatal error.

GitHub documents a separate [Cancel a GitHub Pages deployment](https://docs.github.com/en/rest/pages/pages#cancel-a-github-pages-deployment) endpoint. It accepts the deployment's commit SHA and requires Pages write permission. Canceling an Actions run is not the same operation.

The manual [recovery workflow](../../../.github/workflows/recover-pages.yml) calls that endpoint using the workflow's repository token, restricted to Pages write permission. It runs only when explicitly invoked. It does not build, publish, delete artifacts, or alter Pages settings. No personal token needs to be copied or exposed.

1. Commit and push the recovery workflow so GitHub can list it. There is no app build/schema change. The normal branch-based Pages run may still queue or fail until the lock is cleared.
2. While signed into GitHub, open the repository's **Actions** tab and select **Recover stuck Pages deployment** on the left.
3. Click **Run workflow**, leave the default commit SHA from this error, and run it on **main**.
4. A successful recovery job means GitHub accepted cancellation (HTTP 204), not that the latest site is published. Wait briefly for cancellation to settle, then check the latest **pages build and deployment** run. If it has not resumed, rerun its failed jobs when the control is available.
5. Verify the published build and audio-inventory-test.html after the Pages deploy job succeeds. If the cancellation itself stays queued or succeeds but Pages still rejects new deployments, retain the run URLs and contact GitHub Support for the stale server-side deployment. Do not repeatedly change hosting settings or create unrelated app commits to clear it.

No authenticated cancellation or publication was performed from Codex. Workflow/API execution requires the user to commit/push and explicitly run the manual action. Repository token policy may reject the API request; a non-204 response fails the job and prints GitHub's error message. Do not treat that as successful recovery.

Validation: YAML and shell syntax passed. Three isolated shell checks covered accepted cancellation (204), API rejection (404), and invalid commit input; they made no network calls and exposed no token value. Real GitHub cancellation remains unexecuted.
