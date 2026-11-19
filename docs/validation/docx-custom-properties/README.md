> Documentation reviewed 19 November 2026 against source 47ca641 (displayed build .25). Original experiment/checkpoint evidence is retained, not rerun. Use [current status](../../CURRENT_STATUS.md) for implemented behavior; historical pending instructions are not current authorization.

# DOCX custom-property validation

Date: 16 November 2026. Scope: isolated validation, not production implementation or complete device acceptance.

## Result and recommendation

**Decision after review:** The user approved standard custom properties as the leading implementation candidate. Retain the existing DOCX exporter and readable rendering except for the separately agreed Output presentation settings. Keep canonical reference schema, envelope codec, DOCX storage adapter and rendering responsibilities separate. Strict production validation must leave workspace/transcripts unchanged on failure; enforce ZIP-size and actual decompression bounds. Retain the documented 255-character discrepancy as a known risk. Do not implement a custom XML part without demonstrated need. Real iPhone Safari validation remains a prerequisite for cross-platform readiness. Approval of this direction does not constitute approval of a production dependency addition or untested device behavior.

The tested custom-property representation preserves complete Memora reference metadata in direct browser round trips and in the installed Windows Microsoft Word build after opening and saving to a new DOCX. Keep this approach as the leading candidate. Do not declare cross-platform reliability yet: real iPhone Safari, other desktop browser engines and other Word versions/platforms remain untested.

There is no observed failure in these tests that justifies replacing the custom-property representation with a custom XML package part now. However, Microsoft explicitly documents desktop Word string-property truncation at 255 UTF-16 characters. That limitation did **not** occur in the installed build during the tested open/SaveAs2 flow, even when reading the property through Word's automation API. Treat the documentation/observed-behavior difference as an unresolved interoperability risk, not proof that every version supports large values. If a supported Word/device flow truncates or drops metadata, recommend a properly related custom XML data part rather than splitting a large payload across thousands of document properties. Such a fallback requires its own round-trip and Word-preservation tests.

## Method and production boundary

- Existing `js/docx.js` exporter retained unchanged. SHA-256 at validation: `F3C2F9E97E04ECEF4BA85228FD8058CF06CF477EDE20B9F7450B0393953F83DE`.
- An isolated exporter snapshot changes only library injection and supplies `customProperties`; it retains the production rendering statements. Baseline without a payload and output with a payload are compared by exact `word/document.xml` equality.
- Exact docx 9.7.1 and JSZip 3.10.1 standalone browser distributions were downloaded temporarily. Nothing was installed, no package manifest/lockfile added, and no production module imported a new dependency.
- One custom string property, `Memora.Collection.v1`, holds a versioned envelope containing Base64 UTF-8 reference JSON, decoded byte length and SHA-256. No authoritative transcript bodies are in that payload.
- Synthetic collections contain multiple archive UUIDs, recording IDs, both operations, ordered references, title, four output settings, audio-source provenance, unknown extension data, Unicode/emoji and XML-sensitive characters. Sample readable bodies contain paragraphs and Unicode. These are not actual private archives or realistic audio/transcript-size distributions.
- Results come from headless Edge 157 on Windows and desktop Word 16.0, build 16.0.20527. Headless virtual time was enabled, so timings are omitted and must not be interpreted as performance evidence.
- Browser extraction uses JSZip and DOMParser. Error detection is implemented in the isolated harness, not in production Memora. These tests do not certify bounded hostile-ZIP decompression or production schema/security completeness.

## Browser round trips

| References | Reference JSON bytes | Property characters | Exact metadata recovery | Readable document XML unchanged |
|---|---:|---:|---|---|
| 1 | 727 | 1,118 | Pass | Pass |
| 100 | 46,795 | 62,544 | Pass | Pass |
| 1,000 | 468,046 | 624,213 | Pass | Pass |
| 5,000 | 2,350,046 | 3,133,546 | Pass | Pass |

Exact comparison includes entry order, references, provenance, title, output settings and extension data. This validates the proposed reference payload, not a finalized production schema or all future optional fields. Adding the payload did not change rendering or apply new Output presentation controls; those controls are separately approved future work.

## Microsoft Word open/resave

Fixtures were opened by a hidden Word instance, their full custom-property values read, then saved via SaveAs2 to separate output files. The output ZIP was inspected independently using .NET, and the saved documents were reopened to compare their visible text with Word's originally loaded text.

| References | Before / after property characters | Exact metadata preserved | Readable text unchanged after Word save |
|---|---|---|---|
| 1 | 1,118 / 1,118 | Pass | Pass |
| 1,000 | 624,213 / 624,213 | Pass | Pass |

This is a successful ordinary open/resave test for one installed build. It is not a test of editing the custom-property value, Document Inspector metadata removal, old DOC conversion, Word for Mac/web/iPhone, or every version's save behavior. No original application/user documents were opened or overwritten. Failed initial PowerShell COM argument-marshaling attempts produced no successful validation evidence; the successful tests used VBScript automation. The errors are not DOCX format failures.

## Missing/incomplete/invalid metadata

The browser harness rejected all seven manipulated fixtures with explicit errors:

| Manipulation | Detected error |
|---|---|
| Remove custom-properties part | MISSING_METADATA |
| Rename Memora property | MISSING_METADATA |
| Truncate property to 255 characters | INVALID_METADATA |
| Malform XML | INVALID_XML |
| Incorrect decoded length | INCOMPLETE_METADATA |
| Incorrect checksum | CORRUPT_METADATA |
| Invalid operation in an otherwise checksum-valid payload | INVALID_REFERENCE |

The harness never reads/writes Memora IndexedDB or its workspace. Production integration must independently prove failed imports are non-mutating. The saved test harness also includes checks for invalid ZIP, duplicate property, unsupported envelope, invalid payload JSON and count mismatch, but those additional branches were not independently exercised in this run. A checksum detects corruption, not authenticity.

## Remaining acceptance and reproduction

The isolated [browser harness](../../../tests/docx-custom-properties-validation.html) loads the exact test library versions from the CDN; this is a test-page requirement, not a production dependency change. Serve it from a trusted HTTPS origin or localhost with access to those URLs. Its SHA-256 check requires the browser's secure-context Web Crypto API. No site was deployed for this work.

On a real iPhone Safari and the other supported desktop browsers, open that page, wait for PASS/FAIL, record browser/OS and failures, and check whether large cases complete within acceptable memory/time. It provides downloads for 1- and 1,000-reference fixtures. Open and resave a downloaded fixture in the target Word version, then use the harness's file input to check metadata validity and exact match to that fixture. Compare the Word-readable text too. Generate the same-count fixture on that page before importing so its expected payload is available in memory. Do not use an iPhone user-agent string on Chromium as evidence of Safari compatibility.

Real iPhone export/share behavior, Safari memory/permission behavior, other browser engines, additional Word versions, representative user collections and measured size thresholds remain pending. No fixed import-size limits are accepted based solely on these synthetic highly compressible fixtures.

## Evidence files

- `edge-results.json`: all executed browser results (11 passed cases).
- `word-results.json`: exact property comparisons and Word automation output. `RESULT` fields are reference count, property characters read through automation, and visible-text equality after resave.
- `collection-1.docx`, `collection-1000.docx`: original generated fixtures.
- `collection-1-word-resaved.docx`, `collection-1000-word-resaved.docx`: separate Word outputs.

## Primary sources

- [Exact docx 9.7.1 property options](https://github.com/dolanmiu/docx/blob/9.7.1/src/file/core-properties/properties.ts) and [compiler](https://github.com/dolanmiu/docx/blob/9.7.1/src/export/packer/next-compiler.ts).
- [JSZip archive loading](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html).
- [Microsoft Word CustomProperty documentation](https://learn.microsoft.com/en-us/javascript/api/word/word.customproperty?view=word-js-preview) explicitly describes the desktop truncation risk.
- [Word CustomDocumentProperties VBA documentation](https://learn.microsoft.com/en-us/office/vba/api/word.document.customdocumentproperties) also states the 255-character string limit.
