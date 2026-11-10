# Memora documentation

Reviewed 10 November 2026 through committed source build **2026-11-10.6**. The user confirmed the iOS execution-report sharing fix and accepted pending transcript-save emphasis. Next: reliable worker error provenance, then eligibility integration. Candidate discovery/variant ranking remain future design. Start with [CURRENT_STATUS.md](CURRENT_STATUS.md). Current source and recorded test evidence take precedence over historical implementation claims.

| Document | Role |
|---|---|
| [Current status and resume instructions](CURRENT_STATUS.md) | Accepted work, remaining folder-loading uncertainty and the next two worker/eligibility checkpoints. |
| [Plain-language file map](../filemap.md) | All 43 application JavaScript files, including 18 Whisper files, plus flows, storage and focused tests. |
| [Runtime and database foundation](Runtime_and_Database_Status.md) | Completed ownership/repair scope and verification limits. |
| [Whisper catalogue and selection contract](Whisper_Catalogue_Resolver_Contract.md) | Current canonical definitions/selection plus future candidate discovery and device-specific variant roadmap. |
| [Execution-failure contract](Whisper_Execution_Failure_Contract.md) | Shared classification and saved production history/recovery, with eligibility feedback still separate. |
| [Whisper testing and eligibility](Whisper_Configuration_and_Test_Design.md) | Current PASS/recovery/eligibility rules and deferred sequence/retry design. |
| [Broader registry/self-test architecture](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md) | Long-term requirements; implementation-status map at the top distinguishes completed and future work. |
| [File workflows](File_Workflow_Inventory.md) | Overview for future full dependency audits; sharing consolidation remains deferred. |
| [Search strategy](search%20model%20optimization.md) | Governing Search requirements and research provenance; no new Search refactor requested. |
| [Build numbering](build-versioning.md) | Active release identification, distinct from schema/configuration versions. |
| [Test guide](../tests/README.md) | Safe isolated browser harnesses, focused verification and real-device boundaries. |
| [Archive](archive/README.md) | Historical checkpoints/research and deferred Vite, asset-publication, Offline Tiny and iMuse plans. |

## Design journals

The [main journal](design-journal.md) now has **section 60**, recording runtime/database completion, Whisper consolidation through .23, eligibility/reporting, device evidence and deferred work. Older entries are chronological history and may describe superseded behavior.

The four overlapping split journals remain in place without restructuring: [1–35](01-design-journal-sections-1-35.md), [36–43](02-design-journal-sections-36-43.md), [44–48](03-design-journal-sections-44-48.md), [49 onward](04-design-journal-sections-49-51.md). The last filename understates its content; it includes sections through 59. New section 60 is in the main journal only, avoiding another duplicate update.

This refresh preserves unique history in the archive rather than deleting it. No application code, build ID, database, model settings or deployment configuration changed.
