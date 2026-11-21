# Documentation audit and cleanup recommendations — 21 November 2026

## Decision and scope

**Recommendation: consolidate current guidance first, preserve design evidence, then remove redundant histories. Do this before reorganizing JavaScript or building multi-archive Combine.**

This is an assessment and proposed disposition, not the cleanup itself. No existing document is deleted, moved or renamed by this audit. No application, schema, model, archive, browser cache or deployment is changed. Recommendations in this report are not authorization to implement the deferred product features described in old plans.

Baseline: commit **a79943e**, application **2026-11-21.10**, database schema **10**, journal version **41** before this audit's journal entry. The working tree was clean at the start. The latest conversation confirms that documentation housekeeping comes before the JavaScript structural review and multi-archive Combine.

Scope: **all 49 existing Markdown documents**, including root filemap, every journal/volume, active contracts, archive/deferred plans, validation notes, test guides and font documentation. They total **1,937,117 UTF-8 bytes**. The SIL license and reference-transcription TXT were also classified: one is a legal notice, the other a test fixture, and neither is disposable prose. Existing DOCX/JSON validation artifacts were inventoried as supporting evidence; they are not ordinary documentation to purge.

All Markdown text was inventoried and searched for headings, duplication, status/approval statements, local references and superseded dependencies. Current-facing claims and significant methodology/decision sections were reviewed with targeted source checks. This is not a line-by-line re-derivation of every historical experiment. External sites, browser-provider rules and historical model/package specifications were not revalidated online. No runtime tests, real models, user archives or deployment were exercised. Existing test counts remain dated evidence, not new results from this audit.

## Main findings, in priority order

| Priority | Finding | Recommendation |
|---|---|---|
| 1 | Current and historical instructions coexist in the same operational guides. Opening the right file can still lead to the wrong next action. | Rewrite the current handoff/index/test guide as current-only documents; move useful checkpoint evidence to one dated history. |
| 1 | Retired audio/transcript JSON requirements survive in multiple architecture/identity plans and the index. | One current identity/file-access contract must explicitly distinguish TXT authority, rebuildable local caches and the still-active Search embeddings JSON. Preserve the reasons for retiring sidecars once. |
| 1 | Test instructions include removed harnesses, stale runner paths and older counts. | Derive the current harness list from files and runner support. Separate synthetic results, real-device acceptance and historical runs. |
| 2 | The same implementation paragraphs are copied across many documents. There are **24 distinct paragraphs of at least 200 normalized characters repeated in four or more documents**, including intentional journal copies. | Replace copied release narratives with links to one dated record; each current guide owns only its own contract. |
| 2 | Broad architecture documents combine implemented subsets, abandoned mechanisms and future requirements under strong approval wording. | Classify each retained requirement as implemented, agreed future direction, proposal, superseded or unresolved before making a new roadmap. |
| 2 | Valuable algorithm research is under archive/ rather than linked prominently as decision evidence. | Preserve it intact and create concise current Search/paragraphing methodology pages that explain the decisions and link to exact evidence. |
| 3 | The whole journal and volumes duplicate about **679 KB**, roughly **35% of all Markdown bytes**. Volume 5 alone is about 140 KB. | Keep the user's whole and split representations, but maintain one source and generate the other. Do not prune unique research from history to achieve a page-count target. |
| 3 | Filemap and build/version guidance accumulate rollout notes and obsolete future instructions. | Keep ownership and numbering rules current; move release chronology out of these documents. |
| 3 | Historical filenames are inconsistent or misleading, notably Volume 4's 49–51 filename for sections 49–59. | Rename only in a separate navigation pass with inbound-link/bookmark handling; avoid mixing documentation moves with JavaScript renames. |

The principal problem is **meaning and authority, not missing links**. The baseline contains 569 local inline Markdown references; no missing local file targets or unresolved Markdown heading fragments were found by the automated checks described below.

## Concrete contradictions and misleading passages

These are documentation findings, not newly discovered application failures. A sentence may have been correct at its dated checkpoint and still be unsuitable in a current operational guide.

| Location | Problem | Current source/evidence and required correction |
|---|---|---|
| [Documentation index](README.md), Validation and acceptance / File names and decisions / Documentation map | Its heading names .10, but it still summarizes 183 .7 checks, says iPhone saves changed audio JSON and calls parent-folder production unimplemented. | [Audio inventory](../js/audioFolderCache.js), [TXT catalogue](../js/transcriptCatalogue.js) and [app orchestration](../js/app.js) implement the newer path. The index should link to dated evidence, not maintain another test total or release history. |
| [Current status](CURRENT_STATUS.md), older Next implementation and Resume boundary sections | A current top entry coexists with old apparent next steps, JSON roles and completed proposals. At about 138 KB this is a build diary as much as a handoff. | Retain a short current state, acceptance list and next authorized boundary. Extract dated evidence before removing historical sections. Do not treat old pending flags as present requirements. |
| [Test guide](../tests/README.md), production audio cache section / persistence checkpoint | Describes schema 9 and preserved recovery/persistence suites; some later prose calls .7 current while the header still leads with .6. Literal paths such as tests/audio-source-persistence.html no longer exist. | [Schema owner](../js/database.js) is version 10 and removes only audioSourceRecovery; current tests are listed in tests/. Recheck the committed runner rather than copying temporary local-runner commands. It still offers --source/--persistence routes for removed suites; flag that runner cleanup for the JavaScript audit rather than claiming a documentation rewrite repairs it. |
| [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md), repository table / identity and migration | Still includes transcript filename keying and audio/transcript JSON authority in future schemas or older addenda. | [Full-text cache identity](../js/transcriptCacheIdentity.js) and schema 10 use durable cache keys. [Combine UI](../js/combineUI.js) still has filename-based selection/replacement; do not confuse cache readiness with completed multi-archive UI. |
| [Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md), persistence/migration and logical schemas | Retired source bindings, old cache assumptions and completed one-time migration share space with genuinely future workspace/import contracts. | Extract still-valid future membership/edit/import rules, remove obsolete persistence prerequisites from the live plan, retain migration preservation/restart lessons as history. |
| [Identity implementation contract](Recording_Identity_Implementation_Contract.md) | Most of its approximately 110 KB documents retired manifest creation, source UUID resolution, recovery prompts and source-list persistence. | Preserve the failure/identity lessons in a shorter decision record; this is no longer a current implementation contract. Do not rebuild removed code from it. |
| [Identity prefix contract](Recording_Identity_Prefix_Contract.md), Verification and next boundary | Historical isolated-helper prose still says production integration/source dependency retirement remain pending. | Keep the exact algorithm/vector/read limits as current contract; move checkpoint claims out. [Reproducible resolver](../js/reproducibleRecordingIdentity.js) and audioFolderCache are production consumers. |
| [Search strategy](search%20model%20optimization.md), Review status | Calls independent two-JSON transcript/embedding delivery future work. | Transcript inventory JSON is retired. Search retains [search-embeddings.json](../js/search.js); shared TXT reading and local metadata are implemented. Ranking requirements remain valuable. |
| [Journal index](journal-index.md), Recent material | Its summary stops at .1 retaining audio JSON even though later entries record retirement. | Summarize later entries accurately; preserve chronological old entries, but stop repeating obsolete descriptions as current navigation. |
| [Broad registry plan](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md), stage status / first session checklist | Original stage table still marks broad resolver/evidence work proposed, despite implemented catalogue, attempts, gating and review layers. | [Whisper definitions](../js/whisperConfigurations.js), catalogue, evidence and production modules establish current ownership. Preserve original design rationale; create a refreshed future-work list without restarting completed stages. |
| [Runtime/database status](Runtime_and_Database_Status.md), evidence/rollback paragraphs | Current schema table is 10, but older rollback advice emphasizes retaining schema-6 compatibility. | Explain current-version refusal and preserving forward fixes in the live contract; retain old compatibility observations as dated upgrade history. |
| [Pages recovery](Pages_Deployment_Recovery.md) | The operational procedure contains a specific old deployment SHA and concludes real cancellation remains unexecuted. The user subsequently reported recovery worked. | Keep an operational procedure using the SHA from the current error; put the old SHA/incident and user-reported success in dated evidence. Do not infer a fresh authenticated GitHub check. The manual workflow still has a historical default, so the guide must tell users to review/replace it. |
| [Paragraphing research](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md), final next steps | Says production integration is not established by its experiments. That was appropriate experimental scope, but is not current implementation status. | [paragraphing.js](../js/paragraphing.js) now implements R4 and preserves existing blank-line paragraphing; [paragraphing worker](../js/paragraphing-worker.js) supplies MiniLM embeddings. Add a current synopsis without rewriting historical experiment conclusions. |

## Material that must survive consolidation

### Paragraphing: preserve the decision, alternatives and uncertainty

Keep the **entire R4/R5 comparison record**, its exact experimental algorithm/configuration snapshots, evaluation-set description, manual disagreement review and revisit protocol. The 93-transcript comparison produced 485 R4 versus 420 R5 paragraphs. Of the unique proposed boundaries, 67/110 R4-only and 18/45 R5-only were judged useful or defensible. These are subjective disagreement-set classifications, not accuracy across all boundaries.

The important lesson is that a persistent embedding shift is not the same thing as a useful editorial paragraph break. R5's persistence rule removed some useful rhetorical breaks without establishing a compensating readability advantage. Paragraph count alone did not select R4. Keep the documented fragmentation tradeoff and the reason to revisit only when a specific defect or better representative evidence warrants it.

A proposed **Paragraphing_Methodology.md** should describe current R4 ownership, the MiniLM worker, soft length pressure, no forced word rewriting, and preservation of intentional blank-line paragraphs. Link to the full record rather than copying all source snapshots. Distinguish production's existing-paragraph preservation from experimental reprocessing behavior. Keep externally named experiment artifacts explicitly marked as external/not bundled; do not imply their presence in this checkout.

### Search: preserve the experimental trail and governing product rule

Keep the **entire Search research record**, quantitative comparisons, candidate/ranking definitions, query-generation constraints, corpus/benchmark provenance, rejected E5 adoption, target-known versus blind evaluation distinction and caveats. A benchmark built from knowledge of the target transcript is not an independent rediscovery test. A syntax-checked lab is not a model/browser benchmark.

A proposed **Search_Methodology.md** should bring the current short strategy and current source together: MiniLM, semicolon-delimited independent terms, each term through lexical and semantic retrieval, lexical-qualified transcripts before semantic-only results, sentence-heavy rank fusion, IDF contribution, 3–1/5–2/7–3 contextual representations, fuzzy matching and unchanged overlap/highlight semantics. Commas remain inside terms. The requirement to preserve display semantics constrains ranking refactors; it is not a ban on separately approved UI changes.

Preserve the distinction between Search embeddings, TXT identity and current text. Preserve hash-compatibility decisions, including the intentional null audioSourceId serialization slot, so a future cleanup does not unnecessarily invalidate vectors.

### Identity, persistence and mobile delivery

Retain why random/source-list identity failed after list recreation, backup copies and cross-device JSON writes. Current identity must come from embedded IDs or the **versioned 256000-byte prefix plus file-size** method for supported no-ID audio. Preserve the independent hash vector, embedded-ID precedence, malformed/unreadable/ambiguous safeguards and the inability to distinguish identical sampled prefixes/sizes with different tails. Do not turn that known limit into a promise of a whole-file hash.

Keep the distinction between logical identity, physical folder evidence and permission to access a file. File-input snapshots on iPhone are not writable directory handles and do not prove a copied folder's physical identity. A bounded slice request is not proof that iCloud transferred only that many bytes.

Retain the lessons from misleading recovery choices and duplicate numbered iPhone JSON saves, exact-byte/current-content reconciliation, complete versus partial reads, revision-checked latest caches, preservation on failed scans, files-only sharing and before/after-share warnings. Web Share completion does not prove save destination or durable file replacement.

Cache identity readiness must not be described as a completed multi-archive workspace: Combine still needs stable-reference selection/editing and separately retained audio access for each archive.

### Runtime, models, database repair and portable documents

Retain:
- Capability/API presence versus successful execution; requested versus resolved backend; model definition versus downloaded files versus test evidence versus eligibility.
- Browser-version continuity without erasing real failure holds; a passed reference smoke test is not general-language accuracy or sequence reliability.
- Exact schema-preservation/rollback lessons, sole database ownership and the origin-sharing implications of a future iMuse migration.
- Resource disposal attempts versus measured reclamation; unknown interruption causes must remain unknown.
- DOCX custom-property round-trip evidence, exact readable-document comparison, the documented 255-character limitation versus observed Windows Word behavior, and remaining Safari/other-Word acceptance. The existing DOCX and JSON result files are supporting evidence, not cleanup debris.
- Vite/offline experiments as deferred, unexecuted or partial where recorded; neither caching nor a web manifest alone proves offline readiness.

## Recommended documentation structure

These are proposed destinations, not files created by this audit. Prefer descriptive names over historical checkpoint names.

| Authority | Proposed owner and scope |
|---|---|
| Start here | README.md: short navigation and authority rules, with no parallel release narrative. |
| Resume now | CURRENT_STATUS.md: one current build/schema, implemented boundary, outstanding acceptance, known limitations, next work. Aim for a few readable pages, not another historical archive. |
| Architecture and file access | Architecture_and_File_Workflows.md: data flow, source/destination behavior, platform differences, source ownership, delivery and cache responsibilities. |
| Identity and storage | Recording_Identity_and_Storage.md plus the retained exact Recording_Identity_Prefix_Contract.md: TXT/cached identity, store map, scope/matching and preservation constraints. Algorithm versioning/vector should stay independently identifiable. |
| Paragraphing | Paragraphing_Methodology.md: current R4 behavior and decision synopsis, linking to protected full research. |
| Search | Search_Methodology.md: current product/ranking/index contract, linking to protected full research. |
| Whisper | A concise Whisper architecture/qualification guide assembled from current catalogue, testing and summary/reporting guidance. Keep the execution-failure contract separate if merging would hide its distinct state machine. |
| Code ownership | filemap.md: concise verified current module map; detailed JavaScript rename/merge recommendations belong to the subsequent structural audit. |
| Test procedures | tests/README.md: current harnesses, isolated-data rules, actual runner options and focused device checklists. |
| Operations | Operations_and_Deployment.md: build numbering, Live Server/hosting distinction, publication verification and stuck-Pages recovery. |
| Future work | Roadmap.md: multi-archive Combine first after housekeeping; separate deferred import/portable metadata, query history, recursive library ownership, offline Tiny, variant discovery and iMuse convergence. None is implicitly activated by listing it. |
| Decisions/evidence | Journal/index plus a small research/evidence archive. Each retained item needs an explicit reason and a current-owner link. |

This is an ownership proposal, not a fixed minimum file count. Keep distinct complex contracts separate when combining them would make maintenance harder. Every fact or procedure should have one current owner; other pages link to it.

### Whole journal and volumes

The user wants both the whole journal and smaller units. Preserve both. **Lowest-risk recommendation: keep the whole journal as the existing canonical manual source and generate the volumes from it**, preserving existing numbered headings and dates. The earlier option of manually maintaining volumes and generating the whole is also workable, but changes the established authoring direction and is not needed for this cleanup.

The baseline volume bodies contain the same substantive text as the whole. Volumes 1 and 4 differ at boundary whitespace/separator placement; volumes 2, 3 and 5 match the extracted bodies exactly. These are not missing design lessons. Volume 4 actually covers 49–59. Preserve its existing URL during any rename transition. Plan a sixth volume at the next top-level section boundary rather than creating independently edited fragments of section 62.

Do not mechanically delete old statements from the journal merely because they were later superseded. Remove repeated operational/build prose from live guides first. Journal trimming, if later justified, requires a preserved replacement for every unique decision/evidence item and a section-level disposition, not a global text purge.

## Complete baseline disposition register

**Keep/update** means retain as a current authority after correcting it. **Consolidate** means transfer identified unique material before removing the redundant source. **Archive** means keep a dated record because its evidence has continuing value. **Delete after extraction** means do not keep a second copy merely for safety once its unique content has a verified destination.

Every row concerns an existing baseline document. The table contains all 49; supporting license/fixture/evidence files are handled separately below.

| Existing document | Recommendation | Unique value to retain | Destination / condition |
|---|---|---|---|
| [docs/01-design-journal-sections-1-35.md](01-design-journal-sections-1-35.md) | Keep; generate from whole | Foundational offline/local design, early transcription/file workflows and paragraphing evolution. | Journal Volume 1; preserve historical section bodies. |
| [docs/02-design-journal-sections-36-43.md](02-design-journal-sections-36-43.md) | Keep; generate from whole | Search representations, Settings/storage and earlier module-boundary decisions. | Journal Volume 2; link current contracts rather than treating old instructions as current. |
| [docs/03-design-journal-sections-44-48.md](03-design-journal-sections-44-48.md) | Keep; generate from whole | Whisper/runtime investigation and model-selection development lessons. | Journal Volume 3. |
| [docs/04-design-journal-sections-49-51.md](04-design-journal-sections-49-51.md) | Keep; generate; consider range rename later | Sections 49–59 include paragraphing, Search ranking, context/highlighting and incremental presentation decisions. | Journal Volume 4; preserve old URL during any later rename. |
| [docs/05-design-journal-sections-60-62.md](05-design-journal-sections-60-62.md) | Keep; generate; next volume at new section | Recent identity, schema, Settings, model evidence and sidecar-retirement decisions. | Journal Volume 5; avoid another independent manual copy. |
| [docs/Audio_JSON_Retirement_Audit.md](Audio_JSON_Retirement_Audit.md) | Consolidate; delete after extraction | Why JSON failed, cache association limits, bounded-read/device proof and retirement decision. | Identity/storage decision record; current workflow guide; evidence archive only for nonduplicated measurements. |
| [docs/Audio_Library_Architecture_Proposal.md](Audio_Library_Architecture_Proposal.md) | Consolidate; delete after extraction | Still-useful future recursive ownership, library scope and source-specific access principles. | Roadmap and refreshed multi-archive contract; remove retired catalogue-JSON prerequisites. |
| [docs/CURRENT_STATUS.md](CURRENT_STATUS.md) | Keep; rewrite current-only | Current implemented boundary, actual pending device checks and next authorized step. | Short handoff; checkpoint evidence to journal or dated evidence record before pruning. |
| [docs/Documentation_Review_2026-11-19.md](Documentation_Review_2026-11-19.md) | Archive or delete after evidence extraction | Dated review scope, journal synchronization and source-checkpoint limitations. | One documentation-maintenance history; the present audit supersedes its current-work checklist. |
| [docs/File_Workflow_Inventory.md](File_Workflow_Inventory.md) | Consolidate; delete after extraction | Desktop/file-input access differences, output paths, share outcomes and ownership. | Architecture_and_File_Workflows.md; archive only unique fault/acceptance evidence. |
| [docs/MEMORA_COMBINE_ARCHITECTURE.md](MEMORA_COMBINE_ARCHITECTURE.md) | Consolidate into refreshed future contract | Multi-archive membership, authoritative editing, dirty-state safety and portable reference requirements. | One current multi-archive contract and roadmap; mark each requirement by status. |
| [docs/MEMORA_COMBINE_PHASE_1_CONTRACTS.md](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) | Consolidate with Combine architecture | Detailed identity/merge/editor/import rules and DOCX security/interoperability lessons. | Refreshed Combine contract plus retained DOCX evidence; drop completed migration instructions from live plan. |
| [docs/Memora_Model_Registry_and_Self_Test_Architecture_Plan.md](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md) | Extract; archive original rationale | Definition/evidence separation, safe qualification, resource uncertainty and deferred candidate policy. | Current Whisper guide and roadmap; archive original design only after extracting all unique decisions. |
| [docs/Pages_Deployment_Recovery.md](Pages_Deployment_Recovery.md) | Consolidate procedure; archive incident | Pages deployment lock differs from workflow cancellation; scoped manual recovery and success limits. | Operations guide; dated incident retains SHA and user-reported successful recovery. |
| [docs/Parent_Audio_Folder_Selection_Handoff.md](Parent_Audio_Folder_Selection_Handoff.md) | Extract evidence; delete redundant handoff | Mac/iPhone folder-access observations, discrepancy investigation, reconstruction/selection lessons. | Current file-access guide; dated device evidence, not another resume entry point. |
| [docs/README.md](README.md) | Keep; rewrite navigation-only | Documentation entry point and authority hierarchy. | Remove obsolete JSON/current-implementation summaries and duplicated test totals. |
| [docs/Recording_Identity_Checkpoints.md](Recording_Identity_Checkpoints.md) | Consolidate; delete after extraction | Identity checkpoint progression and reproducible fallback acceptance boundaries. | Identity/storage contract and dated evidence; do not keep completed checkpoints as next actions. |
| [docs/Recording_Identity_Handoff.md](Recording_Identity_Handoff.md) | Consolidate; delete after extraction | Embedded iMuse ID/export provenance, readable TXT decisions and source-ID failure lessons. | Identity/storage contract and migration decision history; inspect sibling iMuse only when separately needed. |
| [docs/Recording_Identity_Implementation_Contract.md](Recording_Identity_Implementation_Contract.md) | Extract; retire as active contract | One-time migration safety, source-list conflict failures, concurrency and truthful persistence. | Current identity/storage contract; concise retired-manifest decision record. Do not archive all repeated rollout copies by default. |
| [docs/Recording_Identity_Prefix_Contract.md](Recording_Identity_Prefix_Contract.md) | Keep; make current exact algorithm contract | Versioned framing, embedded precedence, 256000-byte bound, independent vector, ambiguity and read limits. | Keep independent of general prose; remove stale checkpoint-next instructions. |
| [docs/Runtime_and_Database_Status.md](Runtime_and_Database_Status.md) | Consolidate current rules; preserve repair lessons | Single runtime/database owner, capabilities versus execution, migration refusal/rollback and active stores. | Architecture and identity/storage guides; historical repair evidence in one archive. |
| [docs/Self_Test_Timelines_and_Problem_Reports.md](Self_Test_Timelines_and_Problem_Reports.md) | Consolidate with Whisper guide | Summary versus qualification, frozen test timelines, saved observations and honest timing interpretation. | Whisper guide/reporting section; detailed evidence links may remain separate if needed. |
| [docs/Whisper_Catalogue_Resolver_Contract.md](Whisper_Catalogue_Resolver_Contract.md) | Keep current contract; consolidate duplicated introductions | Canonical configuration/fingerprint/selection authority; cache is a projection, not qualification. | Current Whisper guide or a linked exact catalogue contract; future discovery goes to roadmap. |
| [docs/Whisper_Configuration_and_Test_Design.md](Whisper_Configuration_and_Test_Design.md) | Keep current contract; trim checkpoint history | PASS/WER, stage limits, cleanup, eligibility continuity and smoke-test limitations. | Whisper guide or linked exact testing contract; keep benchmark fixture/protocol constraints. |
| [docs/Whisper_Execution_Failure_Contract.md](Whisper_Execution_Failure_Contract.md) | Keep; separate policy from rollout chronology | Failure provenance, neutral faults versus holds, evidence/review reducer and retention semantics. | Current linked execution-failure contract; unique rollout evidence in dated history. |
| [docs/archive/Asset_and_Deployment_Inventory.md](archive/Asset_and_Deployment_Inventory.md) | Consolidate with deferred build proposal | Old-asset/lazy-worker consistency, dependency and update pitfalls. | One deferred release-design record linked from operations; old module inventory is historical only. |
| [docs/archive/Development_Checkpoints_2026-11-09.md](archive/Development_Checkpoints_2026-11-09.md) | Extract; delete if fully represented elsewhere | Device observations, failed hypotheses and limits not already in journal/testing history. | Single Whisper/runtime evidence history; do not retain duplicate status paragraphs. |
| [docs/archive/Development_Checkpoints_2026-11-10.md](archive/Development_Checkpoints_2026-11-10.md) | Extract; delete if fully represented elsewhere | Failure/reporting/review rollout evidence and unresolved resource observations. | Same Whisper/runtime evidence history; preserve incident distinctions. |
| [docs/archive/IndexedDB_Audit_and_Repair_Design.md](archive/IndexedDB_Audit_and_Repair_Design.md) | Keep condensed decision/evidence record | Actual missing-store/ownership failure and preservation-first repair rationale. | One database repair record, linked from current storage rules. |
| [docs/archive/IndexedDB_Repair_and_Ownership_Plan.md](archive/IndexedDB_Repair_and_Ownership_Plan.md) | Consolidate into database repair record | Ordered coordination, refusal rather than reset, and cross-platform preservation evidence. | Database repair record; delete duplicated plan once extraction is verified. |
| [docs/archive/Initial runtime.md](archive/Initial%20runtime.md) | Consolidate; delete after extraction | Why OS/device/capability/runtime execution must remain distinct. | Current runtime guide and concise design decision; preserve unique initial observations. |
| [docs/archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) | Protect; keep intact | Exact R4/R5 algorithms, 93-transcript comparison, editorial judgments, limitations and revisit protocol. | Protected paragraphing research linked prominently from new methodology page. |
| [docs/archive/Mobile_File_Processing_Architecture_Analysis_and_Plan.md](archive/Mobile_File_Processing_Architecture_Analysis_and_Plan.md) | Extract; delete superseded plan after preservation | Share success limits, cancellation/failure states and separation of transport from product policy. | Current file/delivery guide; retain only genuinely unimplemented design ideas in roadmap. |
| [docs/archive/Offline_Whisper_Tiny_Implementation_Plan.md](archive/Offline_Whisper_Tiny_Implementation_Plan.md) | Keep deferred; label copyable prompt historical | Complete-package verification, offline backend/lifecycle acceptance and installation design. | Deferred offline plan; re-audit worker/schema references before any future use. |
| [docs/archive/README.md](archive/README.md) | Keep; rebuild as curated evidence index | Explain why each historical item remains and which current document owns its topic. | Archive/research navigation; remove links only when corresponding disposition is executed. |
| [docs/archive/Search_Optimization_Research_Record.md](archive/Search_Optimization_Research_Record.md) | Protect; keep intact | Blind versus target-known evaluation, ranking experiments, numerical evidence, caveats and lexical-first rationale. | Protected Search research linked from current methodology; preserve original experiment definitions. |
| [docs/archive/Test_Checkpoint_History_2026-11-09.md](archive/Test_Checkpoint_History_2026-11-09.md) | Extract; delete if fully represented elsewhere | Dated test evidence and distinct regression cases not already preserved in journal/history. | One evidence ledger; current runnable instructions belong only in tests/README. |
| [docs/archive/Vite_Design_and_Rollout_Plan.md](archive/Vite_Design_and_Rollout_Plan.md) | Keep deferred; merge asset rationale | Discarded experiment, generated-asset/old-page policy, staged deployment and update acceptance. | Single deferred build/release design linked from operations; no reactivation by audit. |
| [docs/archive/Whisper_Configuration_and_Test_Design_History.md](archive/Whisper_Configuration_and_Test_Design_History.md) | Keep curated unique evidence; remove duplicates later | Original configuration discrepancies, timing/accuracy/retry/recovery and stability decisions. | Single Whisper design/evidence history; preserve facts and failed hypotheses, not every status copy. |
| [docs/archive/iMuse migration.md](archive/iMuse%20migration.md) | Keep deferred; revalidate prerequisites on resume | Unified-app direction, origin-level storage hazards and explicit clean-start scope. | Deferred iMuse plan with current prerequisites, never current permission to wipe/replace repositories. |
| [docs/build-versioning.md](build-versioning.md) | Keep rules; consolidate operations | Build versus schema/configuration revisions and cache/version mismatch lessons. | Operations guide; move release chronology to dated history. |
| [docs/design-journal.md](design-journal.md) | Keep canonical historical source | Complete chronological decisions, observations and reversals across all numbered sections. | Manual source for generated volumes; no wholesale historical deletion in current-truth pass. |
| [docs/journal-index.md](journal-index.md) | Keep; correct latest synopsis | Whole/split navigation, actual ranges and authoring/synchronization policy. | Journal navigation; later superseding retirement and UI decisions must be reflected. |
| [docs/search model optimization.md](search%20model%20optimization.md) | Keep content; consolidate/rename current methodology | Governing lexical-first/semicolon-term rules and evidence interpretation. | Search_Methodology.md; remove obsolete two-JSON delivery status; update links on rename. |
| [docs/validation/docx-custom-properties/README.md](validation/docx-custom-properties/README.md) | Protect evidence; keep | Browser/Word round-trip method, exact rendering comparison, property-size discrepancy and platform limits. | Retain alongside DOCX fixtures and JSON observations; future import contract links here. |
| [filemap.md](../filemap.md) | Keep; regenerate current ownership after JS audit | Current entry points, module roles, data stores and test ownership. | Remove stale rollout notes; no JavaScript rename/merge conclusion inferred from document count. |
| [fonts/README.md](../fonts/README.md) | Keep unchanged unless font changes | Bundled font source, license and checksum provenance. | Keep with OFL.txt and font binary. |
| [tests/README.md](../tests/README.md) | Keep; rewrite current runnable guide | Safe isolated fixtures, harness/runner support and scoped device acceptance. | Extract historic results; remove deleted suite commands from current instructions. |
| [tests/labs/archive-reconciliation/README.md](../tests/labs/archive-reconciliation/README.md) | Delete tombstone in cleanup, after inbound-link check | Only records that sidecar reconciliation was retired; no unique research or active lab. | Retirement decision record and current test guide; no reason to keep an empty lab directory. |

### Non-prose and supporting artifacts

- **fonts/OFL.txt:** retain unchanged with the font; legal/license text is not an outdated guide.
- **data/whisper-test/expected-transcription.txt:** retain unchanged; versioned validation fixture, not housekeeping prose.
- **docs/validation/docx-custom-properties/** DOCX samples and JSON result files: retain with their method/provenance. Do not delete supporting experiment evidence because it is binary or old.
- Externally named paragraphing/Search experiment artifacts and private archive paths: preserve their names/provenance in research, explicitly distinguish unavailable external artifacts from bundled evidence. Do not copy private audio/transcripts into the documentation.
- Application HTML diagnostic pages, test JavaScript, JSON fixtures, manifest, workflows and model assets were consulted as evidence where relevant. This audit does not approve deleting them; the JavaScript/asset structural review is separate.


## Staged cleanup plan and acceptance

1. **Audit checkpoint — this change.** Publish this assessment and disposition register, link it from the documentation entry point/current handoff, and record the audit in the journal. Existing documents remain in place. Application build/schema remain .10/10.
2. **Current-truth pass.** Rewrite README, CURRENT_STATUS and tests/README. Replace inaccurate top-level navigation and define one evidence/status vocabulary. Consolidate current identity/file/cache guidance. Keep historical content at its source until extraction is checked.
3. **Methodology and decision preservation.** Create the current Search and paragraphing synopses with explicit protected research links. Extract sidecar-retirement, mobile delivery, schema repair and model qualification lessons into durable decision records. Preserve exact experimental source/vectors and result attachments.
4. **Plan consolidation.** Refresh the multi-archive roadmap from implemented source, not old manifest prerequisites. Merge overlapping Combine/library contracts and registry plans into a small current contract/roadmap set. Unresolved policy remains marked unresolved; do not implement features during document editing.
5. **Remove/move redundant documents.** Execute the per-file recommendations only after material has a checked destination. Repair all inbound links and distinguish external/bookmarked paths from repo-local references. Git retains the old document; the archive should not become a second unfiltered attic.
6. **Navigation/journal closure.** Decide generation mechanics separately, synchronize whole/split bodies, fix misleading ranges where safe and leave a simple ongoing maintenance rule. Re-inventory after moves/deletions.
7. **Then start the JavaScript structural audit.** Review entry points, lazy imports, workers, test-only consumers, module responsibility and duplication. Do not rename JavaScript as a side effect of documentation housekeeping.

For each cleanup batch, require:
- A before/after disposition list and destination for all unique lessons.
- No unresolved local file/heading links; audit literal executable commands/paths too, since those are not Markdown links.
- Exact preservation of protected research sections, hash vectors and cited validation artifacts unless a separately reviewed correction is necessary.
- Clear implemented/proposed/superseded status on all retained requirements, with dates and source evidence.
- Current schema and command/interface statements checked against source.
- Dated test results kept separate; overlapping historical runs never summed into a new total. Device acceptance cannot be inferred from synthetic suites or documentation edits.
- No application, user audio/TXT/JSON, runtime data, model evidence or deployment changes.
- A concise commit summary and explicit scope for every batch.

Suggested first implementation batch after review: **the current-truth pass**, not mass deletion or renaming.

## Audit validation and limitations

The baseline checks inspected all 49 Markdown files and decoded local inline link targets, including percent-encoded spaces. Missing local file targets: **0**. Unresolved Markdown heading fragments: **0** across **569 local inline references**. Heading checks handled duplicate heading suffixes and ignored fenced code. This does not validate every external URL, HTML target fragment, raw/angle-bracket URL, reference-style link, or historical artifact mentioned only in prose/backticks. Known literal missing harness paths were found by source comparison despite the clean Markdown-link result.

Journal comparisons used numbered first headings and the next volume boundary; content differences were restricted to boundary separators/whitespace as noted above. Repeated-paragraph analysis normalizes whitespace and counts blocks of at least 200 characters appearing in four or more documents. It is an indicator of copied guidance, not proof that every repeated paragraph should be deleted.

Current source checks covered database/store ownership, embedded/reproducible identity, audio/transcript caches, shared parent selection, Combine filename-based row selection, Search query/ranking/embedding persistence, R4 paragraphing, Whisper catalogue/evidence ownership, export guidance and the manual Pages recovery workflow. This is a documentation accuracy check, not the requested later exhaustive JavaScript structural audit.

No new model, browser regression or user archive tests were run. The existing runtime evidence belongs to its original build and environment. Only Markdown documentation is changed. This report adds one Markdown file, taking the repository from **49 to 50 Markdown documents** before any future consolidation. No document-count reduction is claimed for the audit itself.


Final audit-document validation: all **50 Markdown files**, **647 local inline references**, **49 baseline disposition rows** and **five journal volumes** checked. No missing local file targets or unresolved Markdown heading fragments; all five substantive journal bodies remain synchronized. Only the report, documentation navigation/handoff and journal/index were edited. No runtime tests were rerun.

## Cleanup progress — checkpoint 2, 21 November 2026

The authorized current-truth pass rewrites docs/README.md, docs/CURRENT_STATUS.md and tests/README.md as current-only references. The [preservation ledger](archive/Current_Guides_Preservation_2026-11-21.md) retains unique lessons, dated evidence, the exact source commit and SHA-256 of each original guide. Full old wording remains recoverable from pinned Git blobs without adding another full-copy archive. Research, experiments and source files remain unchanged.

The test guide inventories all 35 existing HTML pages, identifies the catalogue-suite alias and lists only currently usable runner routes. Obsolete source/persistence and reconciliation-runner routes are explicitly excluded and left for the separate JavaScript audit. Local inbound links to removed handoff sections are retargeted by topic; journal whole/split links remain synchronized. This is not completion of methodology extraction, broad contract consolidation, deletion/moves, journal generation or the JavaScript audit.

The next proposed batch is methodology/decision preservation. No application, schema, user data, model state or deployment changes; no runtime tests were rerun. No original research/history document was deleted.

Checkpoint-2 validation: **51 Markdown documents**, **631 local inline references**, zero unresolved file/Markdown-heading targets; all five journal bodies synchronized. The 35-page test inventory matches the actual HTML file set. Original-guide Git blobs match all three recorded SHA-256 values. The three live guides shrank from **190,832 to 27,841 bytes (85.4%)**; the preservation ledger is additional, deliberately concise evidence. Other existing contract/file-map edits are navigation-only. No runtime tests were run.
