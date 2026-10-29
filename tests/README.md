# Database schema tests

Serve the repository over localhost and open `/tests/database.html` in Chrome. The page runs automatically and should finish with `ALL TESTS PASSED`.

Tests use unique `Memora-schema-test-…` database names and remove those fixtures afterward. They never open or delete the `Memora` database. Closing the page mid-run may leave temporary fixtures; they do not affect Memora. The manager is currently unused by application code.

The harness checks fresh/empty databases, healthy and incomplete version-4 upgrades, missing indexes, record and binary embedding preservation, unknown-store preservation, incompatible-schema rollback, partial current-version rejection, future-version refusal, concurrent independent connections, blocked-upgrade abandonment/retry, versionchange closing, unavailable storage, and retry after an injected synchronous failure.

Initial execution: 29 October 2026, headless installed Chrome on the Mac, separate `/private/tmp/memora-db-test-profile` profile and temporary localhost server. Eleven test groups passed. These are isolated real-browser IndexedDB tests, not verification of the user's existing database or iPhone/Windows behavior. The live database has not been upgraded. Additional incompatible-index and operation-level integration checks remain part of the integration gate.
