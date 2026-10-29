# Offline Whisper Tiny: executable implementation handoff

Prepared 29 October 2026. Status: plan only; no runtime implementation has been performed.

## Copy this prompt into the implementing ChatGPT session

> Implement `docs/Offline_Whisper_Tiny_Implementation_Plan.md` in this repository. First read `docs/CURRENT_STATUS.md`, applicable AGENTS.md instructions, and Git status. Work through the numbered phases in order, implementing and verifying each coherent checkpoint. Preserve current transcription APIs, larger-model behavior, existing database ownership, and unrelated changes. Build a shared offline Whisper Tiny service with WebGPU and WASM, automatic fallback, verified installation, and offline cold-start support. Inspect exact pinned runtime/model artifacts rather than guessing filenames or compatibility. Record changes, tests, and remaining hardware checks in this document. Do not commit, publish, reset storage, or modify the separate iMuse repository. If browser/device execution is unavailable, implement the browser harness and report precisely which checks remain unexecuted. Do not claim completion from mocked inference alone.

This prompt requires a session with repository/file-editing tools. A text-only ChatGPT session can prepare patches but cannot apply them or verify this checkout.

## 1. Outcome and scope

After one explicit online installation, the application must reopen without networking and transcribe a local recording using Whisper Tiny. It must support WebGPU and CPU/WASM independently of device identity. iMuse will later call the same service repeatedly during active recording sessions.

Default model: multilingual `onnx-community/whisper-tiny`, preserving language selection and translation. Do not silently substitute `tiny.en`. Default backend preference: `auto`. Keep explicit `webgpu` and `wasm` choices for diagnostics. Auto attempts WebGPU and falls back to WASM on unavailable adapter or failed initialization. Explicit WebGPU reports failure rather than silently changing backend.

Implement this in Memora first. Integration with iMuse recording, voice activity detection, live partial text, recording persistence, repository migration, and a broad model-registry redesign are later work. Save existing audio/transcript behavior. Offline Tiny does not promise offline Search, paragraphing, or larger models.

## 2. Verified starting point

- `js/whisper.js`: shared production API; separate desktop/iOS workers selected using `isIOS`; loaded models reused; individual pending-operation slots are not a safe concurrent request queue.
- `js/whisper-desktop-worker.js`: dynamically imports Transformers.js 4.0.0 from jsDelivr; explicitly selects WebGPU.
- `js/whisper-ios-worker.js`: imports Transformers.js 3.7.2 from jsDelivr; pipeline has no explicit backend/dtype; existing working iPhone route must remain intact for other models initially.
- `js/modelManager.js`: Tiny already exists; registry contains desktop WebGPU and iOS WASM records. Cache presence currently means any matching file exists, not complete offline readiness. Availability checks contact Hugging Face.
- `js/transcription.js`: `transcribeRecording(file, model, language, operation, statusCallback)` calls `loadTranscriber` then `transcribeAudio`, preserving result shape `{ file, filename, metadata, transcript, model }`.
- `js/audioProcessor.js`: decodes/resamples to 16 kHz; its already-16-kHz branch returns channel zero rather than mixing stereo. Address this explicitly for shared Tiny input.
- `js/whisperSelfTest.js` and `js/whisper-test-worker.js`: existing diagnostics and fixture; some runtime labels describe requested routes rather than measured execution.
- `js/runtime.js`: identity and capability helpers already exist. `navigator.gpu` presence alone does not establish a usable adapter/pipeline.
- `index.html`: external `mp4box@0.5.4` script; offline readiness must include this dependency. A web manifest exists, but no service worker was found during this inspection.
- `database.js` owns version-5 application schema. Do not add speculative stores or introduce a second database opener. `imuse-recording-breadboard` is outside scope.

Reinspect all of these before editing; another session may have changed them.

## 3. File map

| File | Required responsibility |
| --- | --- |
| `js/whisper.js` | Preserve exports/signatures; route Tiny through new service; retain existing other-model paths initially. |
| `js/whisperTinyService.js` (new) | Singleton worker ownership, serialized operations, request IDs, lifecycle, backend preference, and resolved backend reporting. |
| `js/whisper-worker.js` (new) | Tiny pipeline/inference with explicit WebGPU/WASM; only worker imports the local ML runtime. |
| `js/offlineModels.js` (new) | Install/verify/status/remove Tiny package, scoped Cache Storage, progress, abort, and recovery. |
| `js/offlineSetupUI.js` (new) | Bind offline controls/status; keep download mechanics outside Settings rendering. |
| `vendor/transformers/<version>/` (new) | Pinned browser runtime and all matching JS/WASM sidecars actually required by both backends; license notices. |
| `vendor/mp4box/` (new) | Local copy of current pinned browser dependency and license. |
| `models/whisper-tiny/manifest.json` (new) | Package version, immutable source revision, backend configurations, exact file URLs, bytes, SHA-256, and licenses. |
| `offline-assets.json` (new) | Versioned explicit application/runtime precache inventory, including transitive imports and fixture assets. |
| `service-worker.js` (new) | Project-scoped shell/runtime caching and cache-only serving of verified model assets at application URLs. |
| `js/app.js`, `js/settings.js`, `index.html`, existing stylesheet | Register service worker; add install/remove/retry/status and backend preference controls; replace MP4Box CDN reference. |
| `js/modelManager.js`, `js/runtime.js` | Add narrowly scoped Tiny variant/reporting integration; preserve existing IDs and other-model behavior. |
| `tests/offline-whisper.html` and `tests/offline-whisper.test.js` (new) | Browser integration harness with isolated test caches; real inference remains an explicit separately enabled test. |
| `tests/README.md`, this document | Reproduction steps, evidence, known limitations, and resume state. |

Do not delete the two legacy workers until all existing consumers have deliberately migrated. A single new Tiny worker avoids forcing a simultaneous larger-model/iOS runtime upgrade.

## 4. Runtime/model packaging checkpoint

1. Inspect official documentation for the chosen exact package version and actual package contents. Start evaluation with existing desktop Transformers.js 4.0.0, not an automatic upgrade to latest. If that version fails Tiny WASM/iOS validation, choose and document a tested version for the new Tiny worker only.
2. Obtain the immutable Hugging Face commit revision and inspect repository files. Identify encoder, merged decoder, processor, tokenizer, generation/configuration files, and any external tensor data the selected pipelines read.
3. First evaluate explicit `q8` on both backends. Treat this as a candidate, not a known compatible configuration. If GPU requires a different dtype, validate and package both variants. Record real file names; do not derive quantized filenames by simply appending the dtype.
4. Vendor matching Transformers.js/ONNX runtime artifacts, including sidecar modules dynamically imported by runtime code. Set local runtime/WASM paths using APIs supported by the pinned version. Never mix WASM binaries from one ONNX version with JS from another.
5. Generate a populated manifest with real byte counts and SHA-256 hashes. No placeholder hashes/revisions, guessed download sizes, or floating `main` URLs in the completed package.
6. Add a repeatable artifact preparation script if practical. Weights are downloaded into browser storage, not committed to Git. Commit runtime files only after checking repository/deployment size limits; record provenance and license notices.
7. Demonstrate real online fixture inference for both configurations before calling the candidate package supported. Record unavailable hardware separately; do not substitute a fake GPU success.

## 5. Offline storage and delivery contract

Use Cache Storage for large assets, with app-path-scoped cache names. Derive the application base from module/service-worker URLs, not origin-root `/models/` paths: deployment must work under `/Memora/` and later `/iMuse/`.

Recommended routing: install downloads from immutable upstream URLs into a package-specific cache using synthetic same-origin URLs beneath `<app-base>/models/whisper-tiny/<package-version>/`. Configure the worker's local model root and manifest layout consistently with the actual Transformers.js URL generation. The service worker serves these model URLs from the active verified cache only. A missing model response must be a clear failure, never the HTML shell or an implicit remote download.

Configure Tiny with local models enabled and remote Hub loading disabled using the pinned library's supported options. Local JS/WASM URLs are mandatory. This restriction is Tiny-specific; do not globally break existing remote larger-model loading in legacy workers.

Installer API, with equivalent naming acceptable:

```js
getOfflineTinyStatus() // package version, missing files, bytes, ready/error
installOfflineTiny({ onProgress, signal })
verifyOfflineTiny()
removeOfflineTiny()
```

- Serialize installs/removals and prevent duplicate downloads. Install into a new versioned staging cache; never overwrite a working package mid-download.
- Check response success and readable contents, expected byte count, and SHA-256. Reconstruct stored responses with suitable MIME headers where needed. Account for hash verification memory overhead; download/hash large files sequentially.
- Mark a package active only after every required file passes. A small metadata response in a dedicated app-scoped cache can hold the active manifest/version pointer; no new IndexedDB store is needed. Update that pointer only after verification, and recover from crashes by checking the complete manifest again.
- Keep the old active package until the replacement is complete and no active worker needs it. Interrupted install, quota errors, and aborts leave the old working package usable. Clean only this app's abandoned staging packages.
- Installation status must include the shell/runtime package and service-worker control, not just weights. Revalidate completeness at startup; missing/evicted files invalidate readiness. Full hashes are required during installation and explicit integrity verification; ordinary startup may check required entries and recorded manifest identity to avoid repeatedly hashing every weight.
- Report progress bytes/files and actionable errors. Show actual required storage from the manifest. Use storage estimates and request persistence where supported; refusal does not imply guaranteed data loss or successful persistence. Browser eviction remains possible.
- Remove only Tiny-owned assets. Release Tiny before removing its active package. Never clear all origin caches, transcripts, embeddings, or databases. Preference metadata can use an app-path-namespaced localStorage key; weights must not.

## 6. Worker/service contract and lifecycle

Expose a reusable service approximately as follows, preserving the facade's existing return values:

```js
loadTiny({ backend: 'auto', onStatus })
transcribeTiny(audioFloat32, { language, task, signal }) // { text, ... }
getTinyRuntimeStatus() // requested backend, resolved device, package, state
releaseTiny()
```

1. Each worker request/reply carries `requestId`; message types include load, transcribe, progress/status, result, error, and disposal as appropriate. Resolve/reject the matching promise exactly once.
2. Serialize complete jobs, including model/configuration transitions. Integrate Tiny and legacy model access at the facade so a concurrent load cannot replace another job's model between load and inference. A load-only queue is insufficient. Preserve the current caller API; add an atomic internal/job API for `transcribeRecording` if needed.
3. Deduplicate simultaneous loads of the same package/backend. Keep a successful pipeline warm throughout an active session. Release explicitly, on package change/removal, or through an explicit memory policy; do not reload after every clip.
4. Auto tests the adapter and attempts WebGPU initialization in the worker. On failure dispose partial resources, then attempt explicit WASM using the already installed package. Report why fallback occurred. Explicit WASM must not attempt GPU.
5. Use single-thread WASM when cross-origin isolation/shared memory are unavailable. Do not require COOP/COEP headers that ordinary GitHub Pages cannot provide. Validate exact pinned runtime settings.
6. A backend preference/variant is part of loaded identity. Do not accidentally reuse a WebGPU pipeline for a forced-WASM request.
7. Define finite load/inference timeouts and abort behavior. If runtime cancellation is unavailable, worker termination is the hard cancellation mechanism: reject pending requests, clear stale references, and recreate on the next request. No dangling promises after `error`, `messageerror`, termination, or disposal.
8. Retain original PCM or a recoverable copy when transferring buffers so a failed GPU attempt can retry once on WASM in auto mode. Do not detach caller-owned audio unexpectedly. Limit automatic inference retry to a classified backend/device failure, not invalid audio or arbitrary transcription errors.
9. Preserve language auto-detection and `task: transcribe|translate`; pass through supported options consistently. Preserve existing 30-second chunk/5-second stride defaults for longer recordings.
10. Distinguish requested device, successful pipeline device, and hardware-provider telemetry. Do not claim measured GPU execution from an API-presence check. Report only what the pinned runtime can establish.

Normalize input to mono 16 kHz Float32 PCM in `audioProcessor.js`, including same-rate stereo. Validate empty/nonfinite input before inference. Existing file decoding remains the entry point; recording-segment callers can later supply PCM directly. This phase does not implement recording capture or silence detection.

## 7. Service worker and application integration

1. Register using app-relative URLs and scope. Enumerate the complete local module/CSS/icon/runtime/MP4Box dependency closure for the transcription shell. Inspect imports in features initialized by `app.js`; ensure optional online features cannot block shell startup.
2. Precache an explicit versioned shell/runtime inventory. Treat a failed required cache entry as incomplete installation. Keep test fixture audio and expected text available for offline diagnostics.
3. Intercept only this application's paths and allowlisted asset types. Serve navigation fallback only for app document navigations, never for missing JS/WASM/model requests. Do not intercept unrelated applications on the same origin.
4. Require an active controlling service worker before claiming readiness; handle the first-install control transition explicitly. Existing uncontrolled tabs must show an honest reload/setup state.
5. Define update behavior: a new worker/cache version must not delete assets required by a running old page/model. Avoid unconditional `skipWaiting` during active work. Offer activation/reload at an idle checkpoint; garbage-collect owned old versions after they are no longer needed.
6. Add Settings controls: install/repair, verify, remove, progress, installed version/bytes, readiness, and backend preference Auto/WebGPU/WASM. Label loaded state separately from installed state. Install is explicit; no surprise large download at startup.
7. Tiny production calls use installed local assets when ready. If absent, show setup guidance; preserve an explicitly described online Tiny route if needed for compatibility, but do not silently label it offline. Never make readiness depend on a fresh Hugging Face availability API request.
8. Add explicit backend-specific offline Tiny registry records without renaming existing records. Keep existing validation evidence attached to its original configuration/version. Do not mark new variants validated until tested. Broader resolver/ranking migration is out of scope.
9. Update relevant Settings/runtime labels to reflect the new Tiny service; avoid rewriting unrelated legacy reporting. Existing standalone diagnostics must remain usable. Add an offline Tiny diagnostic using the same production service so it tests the actual offline path.

## 8. Ordered implementation checkpoints

Complete these in order and append evidence after each. Make coherent local changes; do not leave broken imports between checkpoints.

1. **Inventory and package selection:** inspect current source/Git state, record dependencies, pin artifacts, produce populated manifest and provenance, establish actual backend compatibility where executable.
2. **Worker and service:** implement the local Tiny worker/service plus queue/lifecycle tests. Keep legacy production paths intact until the service is ready.
3. **Installer and service worker:** implement verified staged installation, local routing, shell packaging, and version recovery. Exercise interrupted installation and cache misses.
4. **Production/UI wiring:** route installed Tiny through the shared facade, add setup controls, correct input normalization, and preserve other model APIs. Add offline diagnostic entry point.
5. **Verification and handoff:** run available browser tests, verify cold-start inference and regressions, document exact untested hardware and package sizes, and leave a concise changed-files/evidence/resume report.

If a real package compatibility issue appears, resolve or document that specific issue before layering UI over an unverified backend. If hardware is unavailable, finish independently verifiable work and clearly retain the hardware gate as pending.

## 9. Acceptance checks

Use isolated app-prefixed test caches and fixtures. Never delete production data to create a test scenario.

| Check | Required evidence |
| --- | --- |
| Manifest integrity | Every listed artifact has immutable provenance, actual size/hash, and correct local URL; dependency closure has no required CDN fetch. |
| Installer completeness | Missing tokenizer/weight/runtime, corrupt bytes, interrupted install, duplicate install, abort, quota failure, and staged update preserve correct readiness and old active package. |
| Scope isolation | Remove/update clears only owned caches; `/Memora/` and `/iMuse/` cache names and URLs differ correctly. |
| Queue/lifecycle | Two overlapping jobs return to correct callers; load deduplication, Tiny/legacy transition, forced backend change, termination, cancellation, timeout, and failed reload reject/resolve cleanly. |
| PCM | Known stereo 16-kHz fixture mixes correctly; non-16-kHz audio becomes mono 16 kHz; empty/nonfinite audio rejects clearly. |
| Real WASM | Force WASM, run existing fixture, record nonempty text, WER, load/inference duration, exact runtime/model revision. |
| Real WebGPU | Force WebGPU on available hardware; same evidence, report resolved backend and actual runtime observability. |
| Auto fallback | Simulated adapter/initialization failure selects WASM; real inference succeeds using installed fallback assets. Forced WebGPU fails visibly under the same condition. |
| Offline cold start | Install online, close tabs, stop server access/network, reopen installed app URL, load local fixture/recording, transcribe in forced WASM and WebGPU where available. A warm already-open tab is insufficient. |
| No external dependency | Browser network inspection shows no required external requests during offline startup/Tiny inference, including runtime sidecars and MP4Box. |
| Eviction/recovery | Remove one owned required cache entry; readiness becomes incomplete, UI offers repair, no false offline-ready state. |
| Repeated use | At least ten sequential clips reuse one loaded pipeline; UI remains responsive and results map to correct jobs. Record memory observations without inventing precision. |
| Existing behavior | Larger-model selection/load path, language/translation, transcript save/export, Settings, and existing database browser suites still work as applicable. |
| Devices | Mac/Windows WebGPU and WASM, iPhone Safari WASM; iPhone WebGPU only if actually supported and validated. Record browser/OS versions and user-run versus agent-run evidence. |

Use the existing fixture and expected transcription to report WER; establish and document a realistic Tiny threshold from actual baseline output rather than requiring identical punctuation or borrowing a larger-model threshold. Add a silence fixture to observe hallucination behavior, but defer full voice activity detection.

Mocked failures validate orchestration only. They do not establish real WebGPU/WASM compatibility, offline cold start, or iPhone performance. Run `tests/database.html` and `tests/database-integration.html` after production integration; do not repeat unchanged suites unnecessarily.

## 10. Completion report and remaining limits

The implementing session must update this document with:

- Exact runtime version, model commit, dtype per backend, required bytes, licensing, and artifact preparation command.
- Changed files and preserved public APIs; any deliberate departure from this plan and its reason.
- Actual tests run with results, output transcript/WER/timings, device/browser identity, and unexecuted checks.
- Cold-start offline evidence, fallback evidence, scope-isolated cleanup evidence, and update/eviction recovery evidence.
- Known limits: first installation requires connectivity; browser storage can be evicted; browser audio decoding varies; mobile execution may pause in background; Tiny accuracy/performance must be measured. No claim of background continuous recording/transcription is implied.
- Exact next action for iMuse integration: inspect its recording handoff, send completed segments into the shared service, and persist audio independently of transcription. Do not implement that migration here.

No commit or deployment is authorized by this handoff. Leave the completed implementation reviewable in the working tree.

## Reference documentation

Consult the documentation matching the pinned package version; current documentation may describe newer APIs.

- Transformers.js local models/runtime paths: https://huggingface.co/docs/transformers.js/custom_usage
- Transformers.js environment/cache configuration: https://huggingface.co/docs/transformers.js/api/env
- Model repository to inspect and pin: https://huggingface.co/onnx-community/whisper-tiny
- Local constraints/current acceptance: `CURRENT_STATUS.md`
- Larger registry architecture, separate scope: `Memora_Model_Registry_and_Self_Test_Architecture_Plan.md`
- Future iMuse migration context: `archive/iMuse migration.md`

## Execution log

- 29 October 2026: Plan created from current source inspection. No runtime changes, model downloads, or inference tests performed as part of writing this document.
