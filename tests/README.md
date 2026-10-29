# Database schema tests

Serve the repository over localhost and open `/tests/database.html` in Chrome. The page runs automatically and should finish with `ALL TESTS PASSED`.

Tests use unique `Memora-schema-test-…` database names and remove those fixtures afterward. They never open or delete the `Memora` database. Closing the page mid-run may leave temporary fixtures; they do not affect Memora. The manager is now integrated into application code; opening the normal app can upgrade its database to version 5.

The harness checks fresh/empty databases, healthy and incomplete version-4 upgrades, missing indexes, record and binary embedding preservation, unknown-store preservation, incompatible-schema rollback, partial current-version rejection, future-version refusal, concurrent independent connections, blocked-upgrade abandonment/retry, versionchange closing, unavailable storage, and retry after an injected synchronous failure.

Initial execution: 29 October 2026, headless installed Chrome on the Mac, separate `/private/tmp/memora-db-test-profile` profile and temporary localhost server. Eleven test groups passed. These are isolated real-browser IndexedDB tests, not verification of the user's existing database or iPhone/Windows behavior. The live database has not been upgraded. Additional incompatible-index and operation-level integration checks remain part of the integration gate.

Integration checkpoint: the expanded schema suite passed all 12 groups, including incompatible-index rollback. Open `/tests/database-integration.html` for six production-module integration groups. Its import map substitutes a temporary `Memora-integration-test-…` database owner for storage, semantic, registry, and Settings modules. Fixture records include transcripts and binary embeddings; no ML models are downloaded. It tests registry seeding, transcript operations, semantic persistence/reuse/removal, atomic failed batches, connection cleanup, storage accounting, Settings registry rendering, visible registry failures, and runtime reporting after a storage error. All six groups passed in the separate headless Chrome profile. Expected injected errors may appear in the test page's Console; the page result determines success.

User's actual Mac upgrade and iPhone/Windows integration tests remain pending. The separate `imuse-recording-breadboard` database is outside this change. Do not downgrade to an older hardcoded version-4 app after upgrading the real database; retain the version-5 owner in any forward fix.
