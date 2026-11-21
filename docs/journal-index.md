# Memora design journal — whole document and five volumes

Reviewed and synchronized **21 November 2026**, journal version **43**. The [whole journal](design-journal.md) is the canonical chronological record. The five volumes contain the same section bodies in smaller reading units; they are not competing design specifications. Use [CURRENT_STATUS](CURRENT_STATUS.md) for implemented behavior and work remaining, and the [documentation review](Documentation_Review_2026-11-19.md) for the audit scope and findings.

| Representation | Actual sections | Main subjects |
|---|---|---|
| [Whole design journal](design-journal.md) | 1–62, retaining original gaps/repeated numbers | Complete historical record and latest decisions. |
| [Volume 1](01-design-journal-sections-1-35.md) | 1–35 | Original goals, durable transcripts, desktop/iPhone workflows, paragraphing and early Search. |
| [Volume 2](02-design-journal-sections-36-43.md) | 36–43 | Persistent Search representations, future modes, Settings/storage and UI module extraction. |
| [Volume 3](03-design-journal-sections-44-48.md) | 44–48 | Whisper/runtime investigation, dynamic model selection and development principles. |
| [Volume 4](04-design-journal-sections-49-51.md) | **49–59** | Desktop worker/Medium q4, catalogue, Search UI/ranking, paragraphing, editing and incremental results. |
| [Volume 5](05-design-journal-sections-60-62.md) | **60–62** | November runtime/database/Whisper consolidation, recording identity/migration, self-test summary, Settings, root reconciliation, browser qualification and guided audio/file location. |

Volume 4 keeps its existing filename for link/bookmark compatibility; despite ending in 49-51 it already contains sections through 59. The new fifth volume fills the missing split coverage for sections 60–62. Historical duplicate section numbers 22 and 24, and gaps such as 12 and 27, are retained in both representations. Match sections by number **and heading title**, not number alone. No content was discarded or renumbered.

The [21 November documentation audit](Documentation_Audit_2026-11-21.md) recommends consolidation and generation of split volumes while preserving their historical bodies. Its disposition register is an assessment; no journal volume is removed or renamed here.

## Recent material in Volume 5

- **Section 60:** runtime/database ownership; canonical model definitions; self-test/production workers, reports, eligibility and reviews; saved observations and summary context.
- **Section 61:** completed archive migration; embedded recording identity; source-list design, validation, persistence/recovery and production/header integration.
- **Section 62:** compact successful-test summary; Transcribe/Combine controls; Settings cache management; audio/transcript JSON reconciliation and naming; browser-version continuity; simpler metadata/counter decisions; source-scoped audio guidance; documentation review; parent-folder access test and resume handoff; 20 November recording-identity/rebuild checkpoints; shared parent access and bundled iPhone saves; revised Enable Transcription and save/status guidance plan; 21 November implementation retires the transcript JSON only, adds local metadata and explicit transcription intent.

The later entries explicitly supersede earlier proposals where necessary. In particular, detailed Whisper TXT metadata/backfill and an extra transcription timestamp were dropped. Counter priority remains agreed but unimplemented; whole-folder iPhone audio removal parity is implemented. Transcribe destination reconciliation and shared parent access are implemented through .7. Search shared-scan reconciliation, portable imports/workspace and broader recursive ownership remain future work. Section 62.22 preserves the earlier plan. Section 62.23 implements the later approved TXT-catalogue/session/save changes as candidate 2026-11-21.1, including retirement of transcript JSON while retaining audio JSON and embeddings.

## Keeping both representations synchronized

1. Add or correct an entry in **design-journal.md first**. Preserve historical outcomes and distinguish proposal, implementation, test evidence and user acceptance.
2. Copy the affected numbered section bodies into their existing volume. Keep the volume navigation outside those bodies; do not maintain independent variants of a paragraph.
3. Update this index and docs/README.md when section ranges change. When a later volume is needed, choose a new explicit range rather than silently extending a misleading filename.
4. Compare extracted bodies using section number and title, allowing only boundary whitespace/separators. Also check links/anchors and the current handoff. The 19 November review found all old bodies matched and verified the new fifth volume against the whole.

Document-only maintenance does not change APP_BUILD, schemas, model options or user files, and it does not establish new browser/device test results.
