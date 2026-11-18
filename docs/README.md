# Memora documentation

Library maintenance and delivery sequence: [Audio library plan](Audio_Library_Architecture_Proposal.md#ordered-implementation-and-acceptance-checkpoints). Agreed open/Refresh behavior is documented; production reconciliation, catalogue, multi-source resolution and persistent Combine remain pending.

**Architecture pause — 18 November 2026:** Complete-source indexing, nested-folder ownership and a parent audio-library catalogue are under review. Read [Audio library hierarchy proposal](Audio_Library_Architecture_Proposal.md) before further indexing/Search/Combine changes. The user wants all audio in the managed source inventoried independently of transcription selection; the current selected-recording enrollment is not the agreed end state. No recursive implementation or archive reorganization is authorized yet.

**Current candidate — 2026-11-18.4:** The user clarified that the wrong kind of JSON was selected; a native picker defect is unconfirmed and the earlier .2 update was not tried. Approved interface names are **Audio recording list** (`memora-audio-source.json`, in the audio folder) and **Transcript file list** (`memora-archive.json`, in the transcription folder). Wrong-kind selection now explains the correct file/folder without changing data. Pending list-save buttons reuse the existing subtle pulse, retain it after cancellation and clear it after completed sharing, respecting reduced motion. Device/visual acceptance is pending. Changes are uncommitted and undeployed by the agent.

New TXT headers now place Whisper model, operation and optional original language directly below Duration, followed by a blank line and identity/provenance. This presentation-only change applies to new outputs; existing transcripts and audio are unchanged.

Database schema remains **6**; existing stores/model evidence are preserved. The new candidate writes `Recording ID` and accepts legacy `Voice Memo ID`; conflicting identities block affected operations. The broader persistent Combine redesign is still pending. No actual user archive/audio/database was used in automated verification. Earlier build/status/authorization statements below are historical where superseded here.

The four archive migrations are complete according to the user, and the disposable tool is retired. iMuse UUID export is implemented/device-tested according to the user. The [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md) and [Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) preserve the broader approved plan; the recording identity contract governs its current Phase 3 prerequisites. See [current status](CURRENT_STATUS.md) for earlier production acceptance boundaries.

Reviewed 13 November 2026 through candidate build **2026-11-13.10** (self-test timeline/problem reporting). The earlier 2026-11-11.4 runtime/Settings acceptance remains pending as recorded in Current status. The prior .14 checkpoint is accepted on Mac/iPhone. The latest Settings history controls and retention await device acceptance. Start with [CURRENT_STATUS.md](CURRENT_STATUS.md) for the current test scope and ordered resource-investigation plan. Historical pending statements are not current tasks.

| Document | Role |
|---|---|
| [Audio library hierarchy proposal](Audio_Library_Architecture_Proposal.md) | Current architecture pause: parent/child manifests, full-source inventory, access pathways, shared playback/Search and unresolved decisions. |
| [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md) | Approved eight-phase plan and implementation/acceptance boundaries. |
| [Combine Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) | Detailed identity, selection, editing, workspace, merge and portable-format contracts. |
| [Recording identity implementation contract](Recording_Identity_Implementation_Contract.md) | Latest approved source schema and identity decisions, explicit persistence/error flows, implementation map, acceptance tests and remaining technical checklist. |
| [Recording identity and iMuse handoff](Recording_Identity_Handoff.md) | Completed migration checkpoint, readable universal metadata, Apple/iMuse compatibility findings and next steps. |
| [Self-test timelines and problem reports](Self_Test_Timelines_and_Problem_Reports.md) | Per-test sequence/timing snapshots, older-history reconstruction, separate problem notes and safe exports. |
| [Current status and resume instructions](CURRENT_STATUS.md) | Current candidate, acceptance evidence, history checks and ordered future options. |
| [Plain-language file map](../filemap.md) | Application and isolated identity JavaScript files, including 19 Whisper files, plus flows, storage and focused tests. |
| [Runtime and database foundation](Runtime_and_Database_Status.md) | Completed ownership/repair scope and verification limits. |
| [Whisper catalogue and selection contract](Whisper_Catalogue_Resolver_Contract.md) | Current canonical definitions/selection plus future candidate discovery and device-specific variant roadmap. |
| [Execution-failure contract](Whisper_Execution_Failure_Contract.md) | Shared classification, saved execution history, production decisions, human reviews and separate session-stability observations. |
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
