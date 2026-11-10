# Whisper catalogue and selection contract

Current through source build **2026-11-10.14**, reviewed 10 November 2026. This replaces the earlier staged 3A/3B handoff wording. See [current status](CURRENT_STATUS.md) for what is complete, deferred and authorized.

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

Production failure feedback/reviews are implemented in candidate .8 through the existing evidence bridge, without changing canonical definitions. Exact offline manifests, variant-selection changes, automatic sequences/retries and further resource diagnosis remain separate future work. They are not prerequisites for keeping the completed consolidation checkpoint.

## Future candidate discovery and device-specific variant selection

Recorded 10 November 2026 after user discussion. **Future design only; not implemented by current fixed defaults or authorized by this document alone.**

There may be multiple valid exact implementations of Tiny, Medium, Large or another family, differing in repository, quantization, runtime and worker requirements. A family name is not enough to select the best implementation. Catalogue membership, executable compatibility, successful validation and preferred-production selection are distinct states.

The proposed stages are:

1. **Reviewed candidate introduction.** Add exact configurations through deliberate canonical catalogue updates; show compatible untested candidates in Settings for evaluation. Do not silently introduce them into production or run resource-heavy tests automatically. UI clearly distinguishes new/untested, failed/suspended and qualified candidates.
2. **Device-local comparison.** Preserve per-configuration/context accuracy-gate results, inference/load timing, observed interruptions/failures and cache/resource evidence where actually measurable. Compare like-for-like fixtures/recipe/cache conditions. One pass is not reliability proof; API disposal is not measured physical memory release. A result on one browser/device cannot qualify another.
3. **Preferred variant within a family.** Select only eligible candidates under a transparent preference, such as speed-oriented, accuracy-oriented or balanced. Show the chosen exact ID and reason, let the user override, preserve prior choices/history and handle a later hold without silent substitution. Settle preference persistence, fallback consent and stale-evidence handling before implementation.
4. **Broader discovery later.** Remote repository discovery may suggest candidates, but repository presence/file names do not prove our worker/runtime can execute them. Review repository provenance/revision, loader configuration, runtime compatibility and test permission before admission to the canonical catalogue. No arbitrary downloaded code or model execution follows from discovery alone.

Current WER ≤15% on one short English fixture is a qualification gate, **not a defensible ranking of general transcription accuracy**. Accuracy-based recommendations require broader representative evaluation; performance measurements and reliability observations remain separate dimensions. Do not recommend a model solely because it is larger or passed once. The user's observations that Medium was slower than Large and gave less useful accuracy on the MacBook motivate evidence-based selection, not universal removal of Medium.

Until that policy is designed and tested, `production.familyDefault` and exact-context eligibility remain the production authority. Multiple passing Medium candidates do not automatically compete for the dropdown. This roadmap follows reliable failure provenance/eligibility work and is separate from automatic sequential testing and its future retry policy.

### Diagnostic-only worker envelope — .7

Optional structured worker failure evidence is versioned separately from successful execution/protocol identity. Error payload additions leave current worker execution revision/protocol 2 and configuration fingerprints unchanged because loader/inference/disposal behavior and successful messages are unchanged. Existing qualification is retained; matching schema/configuration/stage checks prevent new diagnostics borrowing another context. Future material execution changes still require an explicit revision/fresh-validation decision.
