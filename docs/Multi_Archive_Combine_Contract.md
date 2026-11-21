# Multi-archive Combine — consolidated future contract

Reviewed **21 November 2026**, source **95fe938**, application **2026-11-21.10**, database **10**. This consolidates the earlier architecture and Phase 1 planning package. **It is a future-work contract, not an implemented workspace or authorization to change application code.**

Both originals remain complete in the dated archive: [architecture](archive/2026-11-21-contracts/MEMORA_COMBINE_ARCHITECTURE.md) and [Phase 1 contracts](archive/2026-11-21-contracts/MEMORA_COMBINE_PHASE_1_CONTRACTS.md). Their obsolete manifest/source-UUID/filename-keyed-cache prerequisites are superseded by [current identity/storage](Recording_Identity_and_Storage.md). Their unique requirements, experiments and earlier approval boundaries are preserved.

## Status and prerequisites

| Area | Current source | Still required / status |
|---|---|---|
| Embedded/reproducible audio identity and TXT Archive UUID | Implemented; no inventory sidecars required. | Preserve identities and explicit conflicts; do not reintroduce source UUID binding. |
| Durable full-text cache variants and folder metadata | Implemented. | Not a workspace, archive registry or file-access grant. |
| Shared audio/transcript selection and ID-first playback | One active shared audio source; current folder/subset flow. | Retain separately scoped access for each contributing archive. |
| Model-family preference | Shared selector used before Search indexing and Combine selection. | Same-family counter tie-breaker and new multi-source integration/dirty-state cases remain. |
| Combine list | Replaced on folder load; selected Search subset replaces list. | Additive multi-archive membership, durable-reference row identity, independent source refresh/removal. |
| Editing | Explicit saved-text paths and existing conflict checks. | Full exact-target/dirty-editor behavior under multi-source preference changes. |
| Persistent workspace/import | Not implemented. | Membership/state persistence and reviewed Merge/Replace/import. |
| Output | Readable TXT/DOCX/HTML; title and existing platform delivery. | Four independent presentation controls and portable reference round trips. |
| Query-only Search history | Not implemented. | Separate later feature; not required to prove the initial multi-archive list. |

No new database/store names, schema version or dependency is selected by this consolidation. The four-archive migration is completed and retired. Do not revive a migration tool, rewrite archives or add inventory JSON as a prerequisite.

## Membership and archive scope

The proposed logical recording reference is **(archiveUuid, recordingId, operation)**. Operation is transcribe or translate; translation never replaces transcription. Models are candidates for the reference, not separate membership identity. The durable cached-TXT key is a different, more specific variant identity.

Add folder content or selected Search results without clearing existing members. Repeated exact references are idempotent; different archive UUIDs remain independent, including equal filenames/text/recording IDs. No cross-archive content matching, duplicate detection/reconciliation or warnings are introduced by this plan.

Track each member's archive provenance and access separately. Names/paths are descriptive. Missing access leaves a visible unresolved reference and a source-specific request; do not silently substitute the current global audio root or drop the member.

An archive is logical TXT identity, not a folder name or a mandatory manifest. A copied collection retaining its UUID retains the same logical identity. Any independent-copy policy must be explicitly designed before assigning different IDs. Unknown provenance remains unknown rather than a fabricated path/source UUID.

## Shared preferred-transcript policy

Evaluate currently accessible candidates before Search matching/indexing, on relevant source refresh and before resolving workspace export/import references. Use the shared selector; do not persist a preferred flag or export-time model choice as authority.

| Situation within one reference | Required result |
|---|---|
| Different recognized model families | Highest available family: tiny < base < small < medium < Large. Historical large/large-v3 rank together without rewriting provenance. |
| Higher family appears / winner disappears | Reevaluate; choose next valid ranked candidate if available. No candidates leaves unresolved. |
| Same recognized family versions | Agreed target: highest recognized filename counter; unsuffixed = 1. **Unimplemented.** Define iPhone Files naming behavior before claiming parity. |
| Winner edited | Same candidate with current text; invalidate only affected derived data. |
| Lower-family alternative edited | Remains lower-ranked; no automatic correction propagation or preference override. |
| Unknown/conflicting identity or ambiguous counter/model naming | Explicit conflict/unresolved state; no invented timestamp, generation, precision or filesystem creation-date priority. |
| Different archive or operation | Independent reference regardless of content/name similarity. |

Reevaluation changes resolved content, not membership, checked state, order, title, settings or active editor target. Older/lower-model files remain in the archive. “Latest cache snapshot wins” does not authorize deleting earlier TXT or selecting among ambiguous actual audio files.

## Exact-target editing and drafts

An editor binds to the exact file/model/operation and base saved content it loaded, as well as its logical reference. Saving must never resolve a new preferred file and write an old draft into it.

Re-read the target before Save Changes and compare content/base revision; timestamps alone are insufficient. Changed/missing targets or lost permission preserve the draft and require explicit reload/review/recovery/save-as. Preserve identity, unknown metadata, provenance and paragraph structure. Update only that selected file, then invalidate affected display/Search data.

If preference changes with a dirty editor, offer explicit continued editing of the original, safe saving of that original, or discard-and-switch. Merge must not close/reset it. Replacement/navigation should settle drafts or cancel, with reload/close warning where supported.

The later agreed rule is **no persistence/recovery of unsaved editor text across reloads**. Durable membership/checks/order/title/settings survive; after reload reopen current saved text for review. Browser termination may lose an unsaved draft despite warning attempts. Earlier broad draft-persistence wording remains historical, not an additional requirement.

Source-update success needs actual write/close/validation. App-owned coordination and a verified recovery copy during replacement can protect failures without creating a historical version store. There is no guaranteed atomic compare-and-swap with external editors; document the remaining filesystem race. On read-only/mobile access use explicit replacement/export, never an undisclosed redirect to another model/file.

## Workspace state and Merge

Persist references, selected flags, authoritative array order, sort choice, title and output settings. Do not persist authoritative collection-local transcript bodies. Reopen by resolving references against available current TXT and retaining unresolved members.

New entries begin selected. Loading more archives must not clear the workspace. Export selected members only, in workspace order; obtain access or report inability to generate a complete requested document rather than silently omitting selected unresolved members.

For a validated combined-document import:
- Empty workspace: restore imported title/settings/order and select imported members.
- Nonempty workspace: **always ask Merge (preselected), Replace or Cancel**.
- Merge: preserve existing objects, checks, relative order, title/settings/sort and in-session drafts; append only the first occurrence of new exact references, selected, in imported order. Do not silently resort.
- Replace: explicit choice with dirty-state protection; then restore imported state.
- Cancel: no memory or durable-state changes.

Validate/stage first and recheck workspace revision after asynchronous work. Commit atomically through the existing database owner. Quota, invalid input, canceled access/share, generation failure or permission loss must preserve prior durable state. No history expiry may clear workspaces or source archives.

## Per-archive audio access

Retain available folder/File access with each source association; references/provenance alone cannot grant access. Resolve by recording identity within the correct source context, independently verifying actual candidates. Same-named folders/files from different sources cannot share a cache merely by name.

Keep unavailable members visible, ask for the specific missing archive/source, and distinguish wrong/ambiguous selection from missing permission. Do not establish new association on cancel or failed validation.

Persistable native handles may still require renewed permission. iPhone file snapshots generally require reselection after reload. The goal is reusable current-session access, not a promise of invisible future access. Do not add a global default audio source that can retarget old members.

Preserve existing standalone HTML behavior: desktop relative-audio handling and current iPhone playback suppression are separate from live app permissions. The exported reader does not inherit the app's selected folders.

## Output and document references

Readable exports remain full static TXT/DOCX/HTML with selected resolved transcript text and paragraphs. The proposed structured payload contains references/order/provenance/settings, **not another authoritative transcript body**. Existing exports never update automatically.

Reimport restores references and resolves current preferred TXT. The round-trip target is references, order, provenance and settings, not a historical text snapshot. Imported visible Word/HTML/TXT text must never overwrite source transcripts. No arbitrary third-party import, old combined-format compatibility parser or external Word-edit synchronization is in initial scope.

Future Output order: heading → editable title → four inclusion controls → existing platform-specific generation/delivery.

| Independent control | Agreed initial default |
|---|---|
| Recording filenames | On |
| Recording date and duration together | On |
| Other visible metadata | Off |
| Visible separators | On |

These controls do not exist as the completed future set today. They affect rendering only; reference/provenance metadata remains in the payload. All-off output still has readable spacing/structured recording boundaries. No Combine paragraph transformation is introduced.

Desktop retains existing destination then create/export controls; mobile retains format then explicit share. Keep transport separate from serialization and preserve cancellation/user activation. Where selected members share one known original source, that name may be suggested; mixed/unknown sources use a neutral suggestion. Do not overwrite a manually chosen title during reevaluation/Merge. Final title-versus-filename automatic behavior still needs implementation review.

## Portable encoding: retained proposals and evidence

Keep schema validation, envelope codec, format storage and rendering separate. Proposed payload fields include document/workspace identity, title, ordered references, provenance and output settings. Their exact serialization/module names are not implemented specifications.

Retained envelope proposal: marker memora-collection, version 1, Base64 UTF-8 payload, decoded byte length and SHA-256. The checksum detects damage, not authenticity. Unknown extension data may be preserved within bounded validation, not interpreted as executable UI.

- **TXT proposal:** terminal BEGIN/END MEMORA COLLECTION V1 frame and compact envelope line. Prove collision handling for marker-like transcript text; never infer references from readable headings.
- **HTML proposal:** one inert marked data container; parse without executing scripts, inserting trusted markup or fetching imported resources.
- **DOCX leading candidate:** standard Memora.Collection.v1 string property in docProps/custom.xml using the existing exporter. [Isolated evidence](validation/docx-custom-properties/README.md) preserves exact browser round trips through 5,000 references and installed Windows Word resave through 1,000. Microsoft's documented 255-character limitation versus tested longer values remains an interoperability risk. Real Safari/other supported Word/browser acceptance remains outstanding. Do not adopt custom XML or a production ZIP dependency without demonstrated need and review.

The old illustrative limits—25 MiB decoded payload, 100 MiB input, 200 MiB expanded DOCX, 10,000 ZIP entries/references—remain **unapproved measurement proposals, not active release limits**. Retain them for comparison, then choose limits from representative devices/data.

Production import must enforce bounds before full materialization: input/entry/expansion limits, actual emitted decompressed bytes per part and cumulatively, cancellation/timeouts, unambiguous metadata property/type, safe paths and relationships, inert XML/HTML, supported schema/envelope, valid IDs/settings/counts/encoding/checksum and bounded extension fields. Do not trust declared ZIP sizes alone, inflate all media, or treat a post-inflate size check/JSZip presence as protection.

Malformed/missing/unsupported/oversized payloads have distinct actionable outcomes. Validate before offering workspace mutation. Failures leave selections, settings, drafts, existing members and source TXT unchanged. Metadata lost in Word must be reported, not guessed from visible text.

## Separate query-history proposal

Search history remains future and independent: terms, archive references, behavior-affecting settings and execution time only; no transcript bodies, result snapshots/scores or immutable blobs.

Retained policy: default **90 days**, configurable integer **1–365**; expiry from execution timestamp, not view time; purge on startup/history access/retention save; explicit clear confirmation; reruns create new entries. Increasing retention does not restore deleted entries. Restoring parameters does not auto-execute; missing archives need access or explicit scope change. Transactions target history only and stored timestamps are not a trusted clock service.

## Suggested implementation checkpoints

After documentation and the separate JavaScript structural review:
1. Review concrete multi-source membership/access and interface behavior, including same-name and copy identity.
2. Add an in-session multi-archive list using durable references and source-specific audio access; retain existing controls and prove two-source playback/edit/selection.
3. Complete shared preference/counter and dirty-editor rules without deleting alternatives.
4. Design preserving workspace persistence through database.js and explicitly test reload/permission/unresolved behavior.
5. Finalize/validate import schema, framing and bounded extraction before activating Merge/Replace.
6. Add portable metadata and Output controls with unchanged readable generation, then real desktop/iPhone acceptance.
7. Address query-only history and broader library scope as separate work.

This reorders the old rollout around work already completed; it does not activate any step or choose a new schema. Broader recursive/library ownership remains a [separate deferred proposal](Audio_Library_Architecture_Proposal.md), not a requirement for the first two-archive proof.

## Acceptance and preservation

Require evidence for:
- Same filenames with different Archive UUIDs remain independent; exact references add idempotently; operation separation.
- Higher/lower/same-family candidate changes, external edits and dirty-state protection without silent retargeting.
- Two retained audio sources, wrong/ambiguous/canceled selection, lost permission and source-specific recovery.
- Selection/order/title/settings survive permitted refresh/Merge/reload; no selected unresolved member silently disappears.
- Invalid/oversized/canceled/quota-failed imports leave prior state and source files unchanged.
- TXT/DOCX/HTML reference/settings round trips, static old readable exports, all Output combinations and real mobile delivery.
- Query expiry, where separately implemented, deletes only history.
- Representative iPhone memory/large-list behavior, lazy rendering and truthful access/save outcomes.

The original plans, exact proposals, DOCX evidence and migration lessons remain archived. No user archive or runtime data is modified, no package/dependency is installed, no application behavior is claimed newly implemented, and no runtime/model/device tests were run by this documentation consolidation.
