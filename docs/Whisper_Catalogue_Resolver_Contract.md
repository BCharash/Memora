# Whisper catalogue/resolver — staged contract (3A)

9 November 2026. Implemented in `js/whisperConfigurations.js`. First 3B migration: modelManager consumes definitions through a legacy baseline projection; actual execution resolver callers remain unmigrated. Candidate build 2026-11-09.4 awaits user Settings/list verification. No worker, model, database or runtime probe is opened on import. Current application behavior/build identifier is unchanged.

## Authority and scope

The replacement catalogue contains the same 13 built-in IDs, family labels, repositories, legacy platform/runtime labels and loader dtype semantics as modelManager's baseline. Each definition owns its loading instructions, platform restrictions, family-default flag and test permission/order. UI options can be derived from that metadata; no new parallel ID list is needed.

The old hand-written registry baseline has been removed and replaced by a projection from canonical definitions. Legacy family catalogue and self-test option lists remain active until their separate migrations. Do not describe the whole application as consolidated yet. Do not remove persisted records, rename IDs or reset validation to adopt the new module.

## API

| Export | Contract |
|---|---|
| getWhisperConfigurationDefinitions() | Synchronous deeply immutable list of all 13 definitions. Definitions contain no test results. |
| listWhisperConfigurations(environment, options) | Synchronous immutable compatibility/policy-filtered list; purpose defaults to self-test and uses definition test order. No inference, downloads or validation lookup. |
| resolveWhisperConfiguration(request, environment, options) | Async exact-ID/family resolution; success returns a frozen full definition with SHA-256 fingerprint and explicit provenance/unknown validation. Selection problems return ok:false with code/reason. Technical fingerprint failures reject rather than masquerading as incompatibility. |
| fingerprintWhisperConfiguration(definition) | Async SHA-256 over canonical execution inputs; requires Web Crypto (HTTPS/localhost). Does not read model files or persist evidence. |

Environment is supplied from shared runtimeIdentity; the module does not classify devices again. Options purpose is production or self-test. Optional capability observations explicitly reject absent workers/WebGPU where required. Omitting observations does not establish support; success reports that capability/initialization/execution remain unverified.

The canonical dtype owner is `loader.dtype`; the old `configuration.dtype` storage/UI shape will be projected at the legacy adapter boundary during 3B, not maintained as a second editable field in this catalogue.

## Preserved selection semantics and limitations

- Known desktop OS targets: Windows, macOS, Linux. Desktop defaults: Tiny/Base/Small omit dtype, Medium selects existing q4, Large selects encoder fp16/decoder q4.
- iOS family defaults use the existing `*-iphone-default` IDs, library 3.7.2 and omit device/dtype. Legacy runtime label wasm records intended routing, not an explicit backend request or execution trace.
- iOS Medium now resolves to its correctly labelled iOS definition rather than a desktop q4 ID; the new resolver is unused, so the current production shortcut remains unchanged until a deliberate 3B migration. Actual iOS loading options are still repository/default only.
- Existing iOS Large definition is retained for production compatibility; existing self-test exclusion is retained. A definition/default is not a recommendation or evidence of stability. No additional device/model trial is requested by 3A.
- Desktop self-test's medium-default exclusion and mixed-precision/q4f16/q4 order are preserved; iOS test list remains Tiny/Base/Small/Medium. These are policy/option lists, not automatic test sequences.
- Wrong-platform exact IDs fail explicitly; they never switch worker or become another model. Unknown IDs/families/purpose fail explicitly. Android/unknown targets are rejected by this conservative staged resolver; current broad non-iOS production routing is untouched. Review this intentional restriction before migrating unverified platforms.
- No GPU-to-WASM fallback, dtype upgrade, eligibility gate or cached-model availability assertion is introduced.

## Identity and freshness

Fingerprint inputs: repository/revision, runtime library name/version, worker script/protocol/implementation revision, loader device/dtype/options, plus fingerprint-schema version. Object keys are sorted recursively; null/omitted device/dtype and empty loader options canonicalize to existing omission semantics. Per-component dtype order does not affect identity. Labels, timestamps, validation summaries and test ordering do not change execution fingerprints. Configuration ID and definitionRevision are recorded separately.

All upstream repository revisions currently remain null/unpinned. Hashing declared inputs does not prove immutable downloaded weights; results explicitly report that limitation. Worker implementation revisions are maintained metadata, not automatic hashes of source files: bump them for material execution changes. Future generated asset filenames must not become accidental model identity changes; use a deliberate worker identity/protocol policy when build conversion is revisited.

Actual backend/session evidence, inference recipe/task/language, fixture and WER protocol remain run-level observations. No validation is inherited merely because a definition resolves. Persisted attempt history and schema changes remain later checkpoints.

## Verification and next break

`tests/whisper-configurations.html` now runs 13 groups in real browser JavaScript/Web Crypto. All passed in isolated Chrome: legacy record parity, deep immutability, five family defaults on three desktop OS fixtures plus iOS, legacy test-option order, every exact ID, exclusions, invalid/cross-platform requests, supplied missing APIs, SHA-256 stability, material identity changes, and truthful unknown provenance/evidence. These are simulated environment/definition checks, not model/hardware support tests.

modelManager now imports the canonical definitions; it does not call the resolver or fingerprint routine when creating legacy records. A saved-evidence integration test and independent baseline snapshot passed. User Settings/list verification is requested; no model inference is required. Next, 3B should introduce adapters/projections and migrate modelManager/read-only UI, self-test and production in separately reviewable changes. Keep schema owner and historical evidence intact. Use exact configuration/worker-boundary parity to retire Medium's workaround and duplicate desktop test worker safely. Do not migrate all callers automatically after 3A passes.

### 3B self-test option checkpoint — 9 November 2026

Build 2026-11-09.6 removes the duplicate desktop/iOS self-test ID arrays. whisperSelfTest now filters canonical definitions by the existing iOS/non-iOS platform split and test.allowed, sorts by test.order, then returns the legacy registry projection. Choices and execution remain unchanged; the stricter resolver OS/capability gates are not activated by this list migration. Thirteen catalogue and five Settings groups passed; user device acceptance remains pending. Medium resource/benefit policy is deferred and Medium inference is not requested.
