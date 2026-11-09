# Whisper catalogue and selection contract

Current through build **2026-11-09.23**, reviewed 9 November 2026. This replaces the earlier staged 3A/3B handoff wording. See [current status](CURRENT_STATUS.md) for what is complete, deferred and authorized.

## Ownership

`js/whisperConfigurations.js` owns the 13 immutable built-in definitions: exact ID, family/label, repository/revision, library and worker identity, platform/OS restrictions, loader device/dtype/options, production family-default flag and self-test permission/order. Definitions contain no test results.

`modelManager.js` projects those definitions into legacy registry record shapes and availability family metadata. It preserves saved registry validation/custom evidence; those fields are not another editable execution authority. The former Medium production shortcut and hand-maintained self-test ID arrays are gone. Production and tests use the same desktop/iOS worker scripts; the obsolete separate desktop test worker is removed.

| API | Contract |
|---|---|
| `getWhisperConfigurationDefinitions()` | Synchronous deeply immutable list of 13 definitions. |
| `selectWhisperConfigurationDefinition(request, environment, options)` | Shared synchronous exact-ID/family/default/platform selection core; explicit error result for invalid or incompatible selection. |
| `listWhisperConfigurations(environment, options)` | Shared synchronous listing with purpose/policy and canonical test ordering. No inference or eligibility lookup. |
| `resolveWhisperConfiguration(request, environment, options)` | Async wrapper over selection, returning immutable definition, SHA-256 fingerprint and explicit provenance; technical hash failures reject. |
| `fingerprintWhisperConfiguration(definition)` | SHA-256 of canonical declared execution inputs; requires Web Crypto. No downloads or storage mutation. |

Production uses the shared selector through `whisperProductionEligibility.js`, not the async wrapper as its direct loader entry. Exact-context evidence construction uses the same fingerprint function. A single selection core matters more than routing every consumer through an unnecessarily asynchronous wrapper.

## Selection policy

- Desktop OS definitions cover Windows, macOS and Linux; iOS is separate from phone/tablet form factor. Android/unknown targets have no qualified production definition; there is no silent execution fallback.
- Desktop family defaults: Tiny/Base/Small omit dtype; Medium uses q4; Large uses fp16 encoder/q4 decoder. iOS defaults omit device/dtype and retain their existing library/default behavior. The intended WASM label is not an explicit backend execution trace.
- Self-test uses `purpose: "self-test", legacyNonIOSChoices: true` to preserve its historical non-iOS menu. That list-only exception cannot enable unsupported production or exact-ID resolution.
- Desktop Medium's non-testable default-dtype variant stays excluded; iOS self-tests offer Tiny/Base/Small/Medium, excluding Large. Definition membership alone is not eligibility or advice to run resource-heavy trials.
- Exact incompatible IDs fail explicitly. They cannot silently become Tiny or another platform/configuration.
- Transcription choices include only currently qualified **family defaults**. Testing an alternative variant does not qualify or replace the family default. Exact configuration loading remains guarded against caller repository/dtype overrides.

## Identity and evidence

Fingerprint inputs include repository/revision, library name/version, worker script/protocol/implementation revision, loader device/dtype/options and fingerprint schema. Keys are canonicalized recursively; omitted/null defaults retain omission semantics. Labels, ordering and timestamps do not change execution identity.

The eligibility context additionally records actual execution worker, validation protocol, fixture digest, inference recipe, browser user agent, shared runtime identity and observed capabilities. Changed contexts require fresh validation. Upstream repository revisions remain unpinned; declared fingerprints do not freeze downloaded weights. Worker revisions are maintained metadata, not automatic source hashes.

Keep four questions separate:

| Question | Authority |
|---|---|
| What is requested? | Canonical definition and shared selection policy. |
| Can files be found? | Availability/cache checks, which do not prove offline readiness or execution. |
| What happened in a test? | Durable attempts and observational diagnostics. |
| May this configuration transcribe here now? | Current-context eligibility and production gate. |

Legacy scalar/omitted-dtype availability still accepts the existing generic ONNX-pair readiness check; Large uses its cloned component map. Exact per-configuration cache manifests are not implemented. Settings now shows current eligibility, with older registry validation in collapsed historical disclosures. Other platforms are labeled not evaluated on this device; custom/older records cannot borrow a canonical ID's qualification when definition fields differ.

## Verification and remaining scope

Independent pre-migration full-record snapshot parity, saved-evidence preservation, selection/list compatibility and fingerprint checks are in [the test guide](../tests/README.md). Builds .20–.23 removed unused execution code and completed the agreed selection/availability-projection/display cleanup without changing worker inputs or fingerprints. No revalidation was required for those cleanup builds.

Normal-transcription failure feedback, exact offline manifests, variant-selection policy changes, automatic sequences/retries and further resource diagnosis are separate future work. They are not prerequisites for keeping the completed consolidation checkpoint.
