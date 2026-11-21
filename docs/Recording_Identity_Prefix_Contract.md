# Reproducible recording identity contract

> **Current integration:** [Recording identity and storage](Recording_Identity_and_Storage.md) owns current TXT/cache/schema behavior. The exact method, independent vector, read/cancellation and ambiguity sections below remain the algorithm contract. Dated isolated-checkpoint, source-list and JSON-persistence statements are historical and do not restore those retired dependencies. The original technical sections are preserved.

## Current cleanup and playback fix — 21 November 2026

Build **2026-11-21.7**, schema **10**, removes legacy audio JSON code, optional recovery UI and the retired audioSourceRecovery store at the user’s explicit request. All current caches, TXT identities, models and Search embeddings are preserved. Shared audio lookup now consumes the actual inventory **records** field, fixing the .6 filter-on-undefined regression; connected playback tests cover both platforms. Standalone audio inventory no longer compares JSON. Existing disk JSON files are untouched and may be removed by the user; **search-embeddings.json remains active**. See [current status](CURRENT_STATUS.md#audio-access-and-playback). Earlier retained-legacy claims below describe superseded .6 behavior.


## Current production inventory candidate — 21 November 2026

Build **2026-11-21.6**, schema **9**, supersedes older audio JSON save/recovery requirements below. Source audio supplies embedded or unchanged reproducible Recording IDs; the new local metadata cache replaces external audio JSON persistence. TXT retains recording/archive identity; **search-embeddings.json remains**. Latest identified snapshots replace older copies, with conservative scope association and stale/partial/failure protection. Existing disk files and older local data are preserved; legacy local lists have optional Settings inspection/deletion. The prefix algorithm is unchanged. See [current status and acceptance checklist](CURRENT_STATUS.md#identities-and-local-data) for native/iPhone differences and implementation evidence. Multi-archive Combine remains future work; .6 device acceptance is pending. Earlier entries below are historical.


Checkpoint 1, implemented in isolation on **20 November 2026**. Helper: [reproducibleRecordingIdentity.js](../js/reproducibleRecordingIdentity.js). Synthetic browser harness: [reproducible-recording-identity.html](../tests/reproducible-recording-identity.html). There are no production callers, file writes, database operations, models or source-list migration. Application build remains **2026-11-20.2**.

## Production integration addendum — 20 November 2026

Candidate **2026-11-20.3** now calls the helper for new/rebuilt production entries. The fixed digest/UUID algorithm below is unchanged. Audio JSON stores the optional **sampledIdentity** evidence (validated method, size, prefix length, full digest and matching UUID); known existing entries are reused without sampling. New fallback TXT headers alone include **Recording ID method: memora-recording-prefix-v1** so playback need not guess a method from UUID version. Embedded-ID transcripts need no extra method field. Existing legacy randomly assigned IDs are retained/restorable and are not silently converted. Historical references below to no production callers describe the completed isolated checkpoint, superseded by this addendum. Production device acceptance remains pending; [current status](CURRENT_STATUS.md) records tests and scope.

## Embedded identity takes precedence

The resolver uses the existing bounded container reader. A valid embedded UUID is returned unchanged, including spelling/case, with method `embedded`; it is not hashed. Only a supported container positively reporting `absent` permits fallback. Invalid, conflicting, unsupported or unreadable embedded metadata returns a blocked result with no usable Recording ID. Unsupported formats need an explicit future policy/reader extension; lack of support does not prove an ID is absent.

## Prefix method version 1

The fixed method is `memora-recording-prefix-v1`. A prefix is exactly **min(file size, 256000) bytes**, starting at byte zero. That is 250 KiB, not 250000 bytes. File size must be a nonnegative safe integer. Reads shorter than requested fail rather than generating an ID.

The digest input is the following UTF-8 frame immediately followed by the raw sampled bytes:

```text
memora-recording-prefix-v1\n<decimal file size>\n256000\n<raw prefix bytes>
```

Here `\n` denotes one LF byte, decimal size has no leading zeros, and there is no trailing framing delimiter after the prefix. Hash this framed input with SHA-256. The method excludes filename, path, timestamps, catalogue/source UUID and device. A rename or relocation reproduces the ID; a new size changes it even when the prefix matches. Different same-size files with identical prefixes intentionally produce the same result. Changes after the prefix are outside the contract.

Take the first 16 digest bytes; set byte 6's high nibble to 8 and byte 8's high two bits to binary 10. Format as a lowercase UUID in 8-4-4-4-12 hex groups. This uses the custom [UUID version 8 layout](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.8), retaining 122 digest bits. UUID format alone does not establish uniqueness or reveal this particular method. Retain method plus the full 256-bit digest as fingerprint evidence.

A ready fallback result includes:

```text
recordingId: deterministic UUID
method: memora-recording-prefix-v1
fingerprint.method: memora-recording-prefix-v1
fingerprint.algorithm: sha256
fingerprint.byteLength: original file size
fingerprint.sampleBytes: actual prefix length
fingerprint.digest: lowercase full framed SHA-256 digest
```

The existing TXT and audio-list UUID validators accept the generated UUIDs unchanged. A synthetic audio-list fixture demonstrates that fingerprint evidence can survive as an extension field. Production storage fields, origin handling and legacy-assigned-ID migration are checkpoint-3 work; this helper does not serialize them into user files. Existing embedded or randomly assigned UUIDs must not be reclassified by UUID version alone.

## Independent test vector

For the 24-byte WAV fixture consisting of `RIFF`, little-endian 16, `WAVE`, `data`, little-endian 4, and bytes 01 00 02 00, Python hashlib independently produced:

- Framed SHA-256: `d18267b5d12c59d86442cf8a876931b900ba9753276a637a4889042711fee3de`
- Recording ID: `d18267b5-d12c-89d8-a442-cf8a876931b9`

The browser asserts these literal expected values rather than deriving the expectation with the helper under test.

## Reads, cancellation and cache

Sampling makes one bounded prefix read plus a small framing allocation. This bound applies to hashing; the embedded-ID reader may perform additional container metadata reads. Files/iCloud may still download an entire remote file before supplying a slice. No network-transfer saving is promised.

The resolver caches successful results in memory against the exact immutable File/Blob object. A new object is inspected again even if its filename, size and date match. Clearing the cache simulates a fresh rebuild and must reproduce the same identity. Blocked/read-failed/cancelled results are not cached. Check abort before work, after embedded inspection, after the prefix read, after digest completion and before returning a cached result; in-flight filesystem/crypto operations themselves cannot be interrupted. Cached results are frozen. Callers must supply immutable snapshots.

## Ambiguity

The grouping helper groups ready IDs case-insensitively and retains every candidate location. Two or more candidates mean `ambiguous`, including identical copies, duplicate embedded IDs and prefix-equivalent files. It never picks a winner or merges records. Blocked/invalid candidates remain in a separate unresolved list so later UI cannot silently discard them. Recording identity is not byte-for-byte equivalence. Retaining the full digest helps detect truncated-UUID collisions but cannot distinguish identical sampled inputs.

## Verification and next boundary

**22 synthetic Chrome groups passed**: independent hash vector; embedded Apple/iMuse priority; absent-ID fallback; rename/rebuild stability; size/prefix changes; intentionally indistinguishable tails; bounded reads for a logical 500-MiB file; small files; immutable snapshot cache and new-snapshot reinspection; malformed/conflicting/unsupported/unreadable metadata; short reads; cancellation; invalid sizes; ambiguity; and existing manifest/TXT validator compatibility.

The large-file read test uses a synthetic sparse object, not a real 500-MiB download or performance benchmark. No user archives or Memora IndexedDB were used. Real MacBook/iPhone timing, iCloud behavior, missing-list reconstruction, parent-folder resolution and fallback playback are **checkpoint 2**, not established by this run. Production integration, retirement of source-UUID dependency/recovery copies, legacy header cleanup and the later UI redesign remain pending. See the [checkpoint plan](archive/2026-11-21-contracts/Recording_Identity_Checkpoints.md).
