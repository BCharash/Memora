# 49. Latest Development Milestone: Whisper Model Testing, Desktop Worker Isolation, and Medium q4 Resolution

The recent Whisper investigation established several important pieces of the desktop transcription architecture and resolved a significant Medium-model loading problem. The work was deliberately diagnostic and incremental because the same Medium q4 configuration had previously worked successfully for hundreds of real Memora transcriptions.

## 49.1 Desktop Whisper worker

Memora now uses a dedicated desktop Whisper Web Worker for the WebGPU transcription path rather than creating the Transformers.js Whisper pipeline directly in the main application thread.

The desktop worker is responsible for:

- loading Transformers.js 4.0.0;
- creating the automatic-speech-recognition pipeline with `device: "webgpu"`;
- receiving the exact model repository and dtype configuration selected by Memora;
- loading the Whisper model;
- performing transcription with the established Whisper options, including 30-second chunks and 5-second stride;
- returning status, transcription, and error messages to the main application.

The main `whisper.js` module therefore coordinates the worker rather than owning the heavy WebGPU inference session itself.

This is distinct from the existing iPhone worker. Desktop and iPhone continue to use separate workers because they use different Transformers.js/runtime configurations.

## 49.2 Why the desktop worker was introduced

The worker architecture was introduced as part of the investigation into model/resource behavior on the desktop.

The investigation had produced failures such as:

    Can't create a session.
    failed to allocate a buffer of size 1828728265

and:

    failed to call OrtRun(). ERROR_CODE: 6
    ERROR_MESSAGE: std::bad_alloc

These failures occurred after larger Whisper models had been used and raised the question of whether the production transcription path was retaining model/runtime state that an isolated test did not.

Moving the desktop Whisper pipeline into its own worker provides a clear execution boundary. The worker can be terminated when its model is released, allowing the complete worker-side execution environment to disappear rather than relying on partial cleanup of a pipeline object.

The production path was also corrected so that a worker is explicitly terminated when model loading fails, rather than being left alive merely because no transcriber object had yet been assigned.

## 49.3 Disposable model self-test

A dedicated Whisper self-test was added to the Settings area.

The desktop self-test uses the model registry as its source of model configurations and tests the actual registered repository/dtype combinations rather than reconstructing model configuration from display names.

Each test configuration is run in a brand-new disposable Web Worker. After loading and transcription, the worker is terminated before the next configuration is started.

The current desktop test set includes:

- Tiny;
- Base;
- Small;
- the explicit Medium configurations;
- Large-v3.

The test records loading time, transcription time, release status, transcription result, and errors. It can therefore distinguish a model-load failure from a transcription failure and provides a controlled way to compare configurations.

The self-test is deliberately separate from ordinary transcription. Its purpose is to establish whether a particular model/runtime/configuration can work in a fresh execution environment without changing the normal user workflow.

## 49.4 The Medium q4 investigation

Medium q4 became the important diagnostic case because it had a contradictory history.

The model had previously worked successfully for hundreds of real Memora transcriptions, so the recent failure could not reasonably be treated as evidence that Medium q4 was inherently unsupported.

During the investigation, production transcription sometimes failed during ONNX session creation with a request for a buffer of exactly 1,828,728,265 bytes. That value corresponded to the unquantized `decoder_model_merged.onnx` representation of the Xenova Whisper Medium repository rather than the intended q4 decoder configuration.

The diagnostic self-test, however, was able to load the intended Medium q4 configuration when it used the exact registry record.

This established an important distinction:

    model name: Medium

is not sufficient to identify the implementation.

The actual working configuration is a combination of:

    repository
        +
    exact model representation / dtype
        +
    runtime
        +
    Transformers.js version

For Medium q4, the intended desktop configuration is the registry record corresponding to:

    repository: Xenova/whisper-medium
    runtime: WebGPU
    dtype: q4

## 49.5 Resolution: use the exact registry configuration

The production transcription path was then tested using the exact `medium-webgpu-q4` registry configuration that the self-test used.

This resolved the problem: Medium q4 loaded successfully through the production transcription path.

The important conclusion is not that Medium q4 needed a special Whisper implementation. Rather, the production path had been resolving the Medium model differently from the tested registry configuration.

The registry therefore became the authoritative description of the tested model implementation for this diagnostic case.

This also explains why simply passing the model name `medium` was insufficient: a model name identifies the family, but not necessarily the exact ONNX representation that should be loaded.

## 49.6 Architectural consequence

The investigation reinforces the direction already established in the model-selection work: Memora should move toward configuration-based model resolution rather than model-name-based resolution.

A future resolver should be able to consider, as one unit:

- model family;
- repository;
- exact ONNX representation/dtype;
- runtime;
- platform;
- Transformers.js version;
- known validation status;
- cached availability;
- device capabilities and resource constraints.

The current Medium fix is intentionally small. It establishes the correct source of truth for the known working Medium q4 implementation without attempting to build the complete automatic resolver prematurely.

The long-term goal remains that the application can determine which registered implementation is appropriate for the current device and runtime, validate it when necessary, and remember successful configurations.

## 49.7 Resource-management principle reinforced

The worker investigation also established that resource release should be treated as a first-class part of Whisper architecture.

The desired lifecycle is:

    create worker
          ↓
    load exact model configuration
          ↓
    transcribe
          ↓
    release / terminate worker

and, importantly, on failure:

    create worker
          ↓
    load fails
          ↓
    terminate worker

This avoids leaving a partially initialized Whisper execution environment alive after a failed model load.

The disposable self-test provides an especially clean diagnostic boundary because each model begins with a new worker rather than inheriting the previous model's worker state.

## 49.8 Development lesson

This investigation reinforced a useful debugging principle for Memora:

    do not infer model incompatibility from a failure in one application path
    when the same configuration has previously worked and an isolated path
    can load it successfully.

Instead, compare the exact inputs and execution boundaries between the working and failing paths.

In this case, that comparison ultimately exposed the difference in model configuration resolution and led to the Medium q4 fix.

The result is both a working production path and a clearer architectural basis for the future dynamic model resolver.


# 50. Whisper Model Registry and Configuration Architecture

The Whisper work has now introduced a dedicated **Whisper Model Registry**. This is a significant architectural step beyond maintaining a simple list of model names.

## 50.1 Why a registry is necessary

A model name such as `medium` identifies a model family, but it does not completely describe the implementation that Memora will actually load. The working Medium investigation demonstrated this directly.

A usable Whisper implementation may depend on several dimensions at once:

- model family
- model repository
- runtime
- platform
- exact ONNX representation / dtype / quantization
- Transformers.js version
- validation status

For example, the current Medium desktop implementation is represented by the registry configuration `medium-webgpu-q4`, which identifies the Medium family, the `Xenova/whisper-medium` repository, WebGPU runtime, desktop platform, and q4 configuration.

The registry therefore describes **implementations of models**, not merely model names.

## 50.2 Registry records

Each registry entry has an explicit configuration identity. The configuration ID makes otherwise similar model choices distinguishable.

Conceptually, a registry record contains information such as:

    configuration ID
    model family
    label
    repository
    runtime
    platform
    configuration / dtype
    status
    validation information

This allows Memora to represent multiple implementations of the same model family. Medium, for example, can have several WebGPU configurations rather than being forced into a single ambiguous `medium` definition.

## 50.3 Desktop and iPhone configurations

The registry also distinguishes platform/runtime combinations. Desktop Whisper currently uses WebGPU, while the iPhone path uses the separate WASM worker architecture.

This means the registry can describe configurations for:

- desktop WebGPU
- iPhone/iPad WASM
- future runtime/platform combinations

The registry is therefore intended to become the common model-description layer while the actual worker implementation remains responsible for executing the selected configuration.

## 50.4 Registry schema and normalization

The registry has a schema version and normalization/migration step so that records created under earlier terminology can be brought into the current representation without losing existing configuration information.

One example was the transition from the earlier `iphone-worker` runtime label to the more general `wasm` runtime, together with explicit platform information. Missing platform information can also be inferred from the runtime when migrating older records.

The normalization process preserves existing records while adding missing baseline configurations. This provides a path for the registry to evolve without treating an older stored registry as an entirely new configuration.

## 50.5 Baseline configurations

Memora maintains a baseline set of known model configurations. These baseline records provide the stable definitions used by model-management and testing code.

The baseline currently represents the desktop Whisper choices and the iPhone configurations separately. Desktop includes Tiny, Base, Small, Medium variants, and Large-v3 configurations; iPhone configurations are represented separately rather than incorrectly exposing desktop-only configurations as available on iPhone.

The registry is therefore both:

- a description of what Memora knows about; and
- a foundation for determining what should be tested or made available on a particular platform.

## 50.6 Registry-driven self-test

The Whisper self-test was changed to obtain its test configurations directly from the model registry rather than reconstructing model definitions independently.

The test sequence identifies registry configuration IDs, and each ID is resolved to its complete registry record before the test begins. Each desktop configuration is then loaded, transcribed, and released in a disposable worker. The current test covers Tiny, Base, Small, the explicit Medium variants, and Large-v3, with the ordering chosen to expose resource/cleanup problems.

This is important because the self-test now tests the same concrete configurations that the registry describes rather than a parallel interpretation of those models.

## 50.7 Settings integration

The registry is exposed in Memora Settings as **Whisper Models**. The Settings view can show:

- **This device** — configurations relevant to the current device/runtime
- **All devices** — the broader registry

The current-device configurations are visually emphasized when the All Devices view is displayed. Native radio controls are used for the scope selection rather than treating the active state as an inverted button color.

This makes the registry useful both as an internal model-management structure and as an understandable diagnostic view for the user.

## 50.8 Validation status

Registry entries include validation information so that Memora can distinguish a configuration that is merely known from one that has actually been tested.

The current system is not yet a fully automatic capability resolver. Validation data therefore provides a foundation for future work rather than claiming that every configuration is automatically safe or optimal on every device.

## 50.9 Relationship to the Medium q4 discovery

The Medium q4 problem demonstrated why the registry matters. The production transcription path initially resolved `medium` through the older model-definition path. The self-test, however, used the exact `medium-webgpu-q4` registry configuration. When production was changed to use that exact registry configuration, Medium q4 loaded successfully.

The lesson is important:

    `medium`

was not sufficient to describe the implementation.

    `medium-webgpu-q4`

identified the tested implementation precisely enough to reproduce the working behavior.

The registry therefore became more than documentation. It became the concrete source of truth for the tested model implementation.

## 50.10 Future role: model resolution

The long-term purpose of the registry is to support a model resolver that can choose an appropriate implementation without requiring the user to understand the underlying ONNX/runtime details.

A future resolver can consider, together:

- requested model family
- platform
- available runtime
- device capabilities
- exact repository and ONNX representation
- dtype / quantization
- Transformers.js version
- cached model availability
- previous validation results
- resource requirements

The registry is therefore the foundation for eventual autonomous model selection. The current implementation deliberately stops short of building that complete resolver; it first establishes reliable, explicit configurations and a way to test them.

## 50.11 Architectural principle

The Whisper Model Registry should be treated as the authoritative description of **what a Whisper configuration is**, while the Whisper workers are responsible for **executing that configuration**.

This separation gives Memora a clearer architecture:

    Model Registry
          ↓
    exact configuration
          ↓
    capability / validation decision
          ↓
    Whisper worker
          ↓
    Transformers.js
          ↓
    ONNX implementation

This architecture avoids hiding important implementation choices inside scattered model-name conditionals and provides a controlled foundation for future automatic model selection, validation, caching, and resource management.

---

# 51. Latest Development Milestone: Search Transcript Presentation, Audio Playback, and Context Highlighting

This milestone refines how Search results are presented and how a user can inspect the source recording. The goal is to make the several semantic retrieval representations useful together without showing the same transcript repeatedly or losing the direct sentence match.

## 51.1 One complete transcript per search result

Search retrieves candidates through multiple semantic representations: sentence-level matches and contextual chunks of different sizes. These representations serve different purposes. A short match can identify a precise statement, while a larger contextual chunk can show the surrounding thought.

The result display now brings these signals together under one transcript result rather than presenting every retrieval representation as a separate copy of the same transcript.

The intended presentation is:

- one result group per transcript file;
- the original transcript text displayed once in that group;
- sentence-level and contextual retrieval matches represented by color within that text;
- unmatched text retained in its normal appearance;
- the transcript's recording/audio metadata retained where available.

This keeps the full narrative readable while showing why different parts of it were retrieved. A transcript found through several representations should not appear several times merely because several indexed items matched the query.

## 51.2 Highlight colors and priority

The transcript display uses four colors to distinguish the direct sentence match from contextual matches:

| Color | Meaning |
|---|---|
| Yellow | Direct positive sentence match |
| Pale blue | Narrow 3–1 contextual chunk |
| Pale orange | Medium 5–2 contextual chunk |
| Pale green | Broad 7–3 contextual chunk |

Yellow is the highest-priority signal. A sentence that directly matches the query remains yellow even when it is also part of one or more contextual chunks.

Contextual highlighting follows the overlap-suppression hierarchy:

1. Keep positive sentence matches in yellow.
2. Suppress a 3–1 blue chunk if it overlaps any positive sentence match.
3. Suppress a 5–2 orange chunk if it overlaps a sentence match or an accepted 3–1 chunk.
4. Suppress a 7–3 green chunk if it overlaps a sentence match, an accepted 3–1 chunk, or an accepted 5–2 chunk.

For this rule, overlap means sharing at least one sentence. If a broad chunk overlaps a narrower accepted match, the entire broad chunk is suppressed; it is not clipped to show only the non-overlapping remainder. Chunks of the same size do not suppress one another.

This hierarchy favors the most specific available evidence and avoids layering several colors over the same passage. It does not change semantic retrieval thresholds or sentence rankings: it is a presentation rule applied after retrieval.

## 51.3 Preserve direct sentence matches

An earlier highlighting problem showed that contextual coloring could cause the original yellow sentence matches to disappear. The design rule is therefore explicit: contextual presentation must never override a valid yellow sentence match.

The renderer resolves color assignments with yellow taking precedence. It uses both positional references and normalized sentence text as a fallback because sentence boundaries and punctuation can differ slightly between indexing and displayed transcript text.

Sentence matching for this display normalizes Unicode, letter case, and punctuation while preserving the underlying transcript wording. The highlighting is visual only; it does not rewrite the source transcript.

## 51.4 Hide/show full transcript

Search results include a compact Hide/Show Transcript control so that the user can choose whether to inspect the full transcript immediately.

The control is intended to reduce the vertical space occupied by long transcripts while keeping the retrieval evidence and the result's identity available. Expanding a transcript reveals the same complete transcript with the color-coded matches; collapsing it hides that full-text section rather than removing or changing the underlying result.

This complements the existing Collapse all controls for the overall Search result list. The two levels serve different purposes:

- **Hide/Show Transcript** controls the full text within an individual result.
- **Collapse all** controls the expanded result sections across the Search result list.

The interaction is a presentation preference, not a change to indexing, retrieval, or stored transcript content.

## 51.5 Search-result audio control

Search results now provide an audio-playback control when the transcript record contains an audio-relative path or original recording filename.

On desktop, Memora first attempts to resolve the audio file from the selected Search source and any previously selected audio root. It can search within the permitted directory tree for a matching filename. If the recording is outside the selected Search directory, the application can ask the user to select the relevant parent folder; the selected root can then be reused for other results in the current page session.

When the recording is loaded, the compact play button is replaced by the browser's full native audio controls. This avoids leaving a redundant small play button beside a visible player.

The audio player is loaded on demand. Memora does not preload the entire collection of audio recordings. When Search results are replaced, existing object URLs are revoked and old audio sources are released so that obsolete players do not unnecessarily retain resources.

## 51.6 iPhone audio selection and session reuse

The browser File System Access API used by the desktop workflow is not available in the same way in iPhone Safari. In particular, a directory handle cannot be used to browse upward to a parent directory, and `showDirectoryPicker()` is not available on iPhone.

For iPhone, the Search audio control therefore uses the native file picker to select audio files. The picker supports selecting multiple recordings. Selected `File` objects are retained in a page-session cache, indexed by lower-cased filename, so later Search results can reuse a recording already selected without asking the user to select it again.

The cache stores file references, not copies of the audio data. The actual audio player is created for the recording currently requested. If the selected batch does not contain the recording associated with the current result, Search reports that the matching file was not selected and allows the user to try another batch.

After a file is loaded, the full native audio controls remain visible. If Safari blocks automatic playback, the user can start playback through those controls.

This is a browser-session convenience, not persistent audio storage. Reloading or closing the page may require selecting the recordings again. The iPhone file-picker workflow is separate from the iOS share-sheet workflow used to save exported files.

## 51.7 Scope and implementation boundaries

The milestone is confined to Search-result presentation and access to source audio. It does not alter the durable `.txt` transcript files, the semantic embedding model, the indexing representations, or the existing Search → Combine handoff.

The principal changes are in `searchUI.js`. The Search index and storage modules remain responsible for their existing indexing and persistence duties.

The current implementation has passed a JavaScript syntax check. That check does not substitute for end-to-end testing in desktop browsers and iPhone Safari. In particular, selecting multiple audio files and playing them through iPhone Safari still requires practical device validation.

## 51.8 Design conclusions

The Search result should be a readable transcript, not a stack of competing copies of the same transcript. Semantic representations contribute evidence to that single view, and color communicates the relative specificity of the evidence without changing the underlying retrieval scores.

Direct sentence matches remain visually authoritative. Context chunks add surrounding meaning only when they do not duplicate a narrower accepted match. Audio playback is optional and on demand, with desktop folder resolution and iPhone file selection kept separate to respect their different browser capabilities.

These rules preserve the central Memora principle that the individual transcript remains durable source material, while Search provides a derived, navigable view over that material.

---

# 52. Search Controls: Lexical Fuzzy Matching and Semantic Filtering Sliders

The Search tab now has two adjustable controls positioned above the search query box. They let the user tune lexical matching and semantic result filtering while working through searches, without changing the underlying transcript files or the semantic index.

## 52.1 Lexical fuzzy-matching slider

The **Lexical fuzzy matching** slider controls how closely each query word must match a word in the transcript for a lexical match to qualify.

- The default is **80%**.
- The range is **70%–100%**, in five-percentage-point increments in the current UI logic.
- Lower settings allow more spelling variation; higher settings demand closer matches.
- At **100%**, lexical matching requires exact word matches.
- The threshold is applied to each word individually. A strong match for one word cannot compensate for a weak match for another word in the query.
- When a lexical match is displayed, bolding is limited to the actual matched text span rather than every occurrence of the same query word elsewhere in the transcript.

The setting is saved on the current device. When the user changes it with a query already entered, Memora reruns that query after the slider change is committed. This avoids repeatedly rerunning the full search while the user is dragging the control.

## 52.2 Continuous semantic-filtering slider

The **Semantic filtering** slider controls how many of the highest-ranked semantic candidates are retained for display. Unlike the lexical control, it is not a similarity threshold and does not change the semantic scores themselves.

The slider is continuous, with **Low**, **Medium**, and **High** shown as guide labels rather than as the only selectable positions:

- **Low** retains all candidates returned by semantic retrieval.
- Moving right progressively retains a smaller fraction of the candidates.
- **Medium** is a visual midpoint, not a separate mode.
- **High** retains fewer of the highest-ranked candidates.
- The experimental range retains between **100% and 50%** of the available semantic candidates.

The filtering is applied separately to sentence-level results and to each contextual-window family. This is intended to avoid allowing one representation family to eliminate another merely because their result counts or score distributions differ. Lexical matches are not filtered by this control.

This is a result-count experiment, not a calibrated relevance cutoff. Retaining fewer candidates can remove useful results, and the proportion retained does not necessarily translate into the same proportion of unique transcript files shown because different candidates can refer to the same transcript or overlapping passages.

The semantic setting is saved on the current device. Existing saved settings from the earlier three-level version are mapped to the nearest position when the continuous slider is initialized.

## 52.3 How the two controls work together

The controls serve different purposes:

- **Lexical fuzzy matching** adjusts tolerance for word-level textual differences.
- **Semantic filtering** adjusts how many of the highest-ranked semantic candidates are retained.

Both lexical and semantic search still run. Lexical matches remain prioritized in result ordering and are not removed by semantic filtering. Existing semantic highlighting, contextual-overlap suppression, transcript deduplication, and audio controls remain separate from these slider settings.

The sliders are deliberately placed above the query box so that they can be adjusted as part of an active search rather than buried in Settings. Their preferences are local to the current browser/device.

## 52.4 Validation status and limitations

The JavaScript implementation passed a syntax check. This does not establish end-to-end behavior in every browser. The continuous semantic slider should be checked in the running app to confirm that intermediate positions update the retained fraction smoothly and that saved preferences are restored as expected. Search relevance should also be evaluated against real transcript queries before treating any setting as a recommended default beyond the current experimental defaults.

---

# 53. Paragraphing Revision 4: Production Implementation and Decision Record

**Date:** 18 October 2026  
**Status:** Revision 4 is the selected paragraphing implementation. The algorithm-selection decision is documented; any future production edits must use the current project files supplied at the time of implementation.

## 53.1 Decision: retain Revision 4 rather than reopen the algorithm search

The full-archive comparison and editorial review support keeping Revision 4 (R4) as the preferred paragraphing method rather than switching to Revision 5 (R5). This is a practical editorial decision based on the available archive, not a claim of objective correctness at every boundary.

The reviewed disagreements were:

- Of 110 boundaries proposed by R4 but not R5, 67 were judged useful or defensible, 40 unnecessary or fragmenting, and 3 borderline.
- Of 45 boundaries proposed by R5 but not R4, 18 were judged useful or defensible, 21 unnecessary or fragmenting, and 6 borderline.

These labels are subjective editorial judgments. They do not constitute ground-truth labels or a formal statistical test. Nevertheless, the unique R4 boundaries were more often judged helpful than the unique R5 boundaries. The R5 persistence test appeared to remove useful breaks as well as some poor ones.

The decision is to avoid another broad algorithm-design cycle by default. Keep R4 as the current implementation and preserve R5 as a comparison candidate. Reopen the decision only if a specific, repeatable defect or meaningful new evidence warrants it.

## 53.2 What Revision 5 changed, and why it was not selected

R5 added a persistence check intended to require a semantic shift to remain evident beyond the immediate boundary. The motivation was reasonable: avoid separating an idea from its example, explanation, or continuation merely because adjacent sentences differ semantically.

The comparison did not establish that this extra persistence condition reliably distinguishes the editorial cases that matter. Paragraph boundaries can mark a new example, a personal application, a story, a subtopic, or a pause after a completed idea even when the language remains semantically related. R5's more conservative output therefore did not automatically mean better paragraphing.

Counts were treated as supporting evidence, not as the decision criterion. The manual review of unique boundaries was more informative than paragraph totals alone.

## 53.3 Production Revision 4 configuration

The supplied production `paragraphing.js` identifies itself as Revision 4 and uses the following configuration:

```js
const REV4_CONFIG = {
    reprocessAboveWords: 120,
    minSegmentWords: 42,
    minSegmentSentences: 2,
    shortWindow: 2,
    longWindow: 4,
    minimumScore: 0.058,
    quantile: 0.62,
    localRadius: 1,
    minBoundaryGapSentences: 2,
    softReviewWords: 165,
    pressureCap: 0.035
};
```

The algorithm's established principles remain:

- Semantic change is the primary signal.
- Length is a soft readability preference; length alone never forces a break.
- No transition-word, discourse-marker, or phrase lists are used.
- The algorithm preserves the spoken wording and inserts paragraph boundaries.
- Existing blank-line paragraphing is treated as intentional and is preserved.
- Paragraphing runs in the dedicated `paragraphing-worker.js`, keeping inference off the main application thread.
- The worker uses Transformers.js 3.7.2 and `Xenova/all-MiniLM-L6-v2` with `q8` weights.

The worker serializes embedding requests through a queue and returns sentence embeddings to `paragraphing.js`, which computes boundary scores and applies the selected R4 logic. Paragraphing remains lazy: the model is loaded only when paragraphing is actually requested.

## 53.4 Safe implementation and validation sequence

The next implementation step previously organized for the paragraphing work is to create a standalone HTML utility that accepts a ZIP of transcript files, applies the exact R4 implementation, and downloads a new ZIP with the original filenames preserved. The input archive must remain unchanged. Where practical, relative folder paths should also be preserved.

After that utility is available, production changes should be made only after the current production source files have been supplied again. The current user-supplied files are authoritative; older project ZIPs and copies from earlier conversations must not be substituted for them.

The implementation should be validated on representative transcripts and compared with the standalone R4 output. The goal is faithful transfer of the selected algorithm, not another algorithm redesign.

## 53.5 Limits of the decision

R4 is the selected current approach, not a claim that every proposed boundary is desirable. The reviewed classifications are editorial and specific to the evaluated archive. They do not prove that R4 will behave identically on all future speech, model/runtime versions, or transcript styles.

The correct response to a future problem is to identify and reproduce the specific failure, inspect its context, and make a controlled change only if the evidence warrants it. Do not restart broad revision experimentation simply because the algorithm is imperfect.

---

# 54. Semantic Search Embedding Model Decision: Keep MiniLM, Do Not Add E5 Yet

**Date:** 18 October 2026  
**Status:** MiniLM remains the production/default semantic-search embedding model. E5-small was evaluated experimentally but is not adopted.

## 54.1 Evaluation question

The benchmark compared the existing `Xenova/all-MiniLM-L6-v2` model with `Xenova/multilingual-e5-small` for semantic retrieval over a representative collection of 91 transcripts and 28 queries. It tested sentence representations and overlapping contextual chunks with window/overlap settings 3–1, 5–2, and 7–3.

The purpose was to determine whether E5's multilingual model would improve practical retrieval enough to justify adding another model and its operational cost.

## 54.2 Benchmark results

The reported results favored MiniLM overall:

| Measure | MiniLM | E5-small |
|---|---:|---:|
| Mean reciprocal rank (MRR) | 0.7777 | 0.7347 |
| Queries with a relevant result in top 5 | 26/28 | 23/28 |
| Queries with a relevant result in top 30 | 28/28 | 28/28 |
| Approximate benchmark duration | 10 min 23 sec | 18 min 45 sec |

These results are specific to this benchmark dataset and its query judgments; they are not a universal ranking of the two models. For the current Memora use case, however, E5 did not improve the overall ranking measures and took substantially longer to run.

## 54.3 Manual review of difficult queries

Focused inspection of Q16, Q24, and Q25 exposed potential ranking/aggregation issues that should be investigated separately from the choice of embedding model.

- **Q16 — ordinary service/cleaning as spiritual practice:** MiniLM retrieved “Deep kitchen cleaning” at useful individual chunk ranks in the 5–2 and 7–3 representations, but the final result rank fell to 23. E5's final result for “Seva Groundhog Day” ranked 10, while it did not retrieve “Deep kitchen cleaning” in the observed results.
- **Q24 — Ganga and samadhi:** MiniLM ranked “Magical temple” at 3, while E5 ranked it at 16, although E5 also returned other relevant results.
- **Q25 — control of mind:** MiniLM ranked “Can't control the mind” first in the final results. E5 placed it at 23 even though some of its individual chunk representations ranked it first.

The discrepancy between strong individual representation ranks and weaker final ranks suggests that the aggregation or ranking stage may be losing useful evidence. That is a separate problem from whether E5 produces better embeddings.

## 54.4 Decision and rationale

Keep MiniLM as the default and do not add E5 as a selectable production model at this stage.

Reasons:

1. MiniLM achieved better overall MRR and top-five retrieval on the current benchmark.
2. Both models found at least one relevant result within the top 30 for all 28 queries, so E5 did not improve that coverage measure.
3. E5 took approximately 18 minutes 45 seconds compared with MiniLM's 10 minutes 23 seconds for the benchmark.
4. Adding another model would increase implementation, testing, caching, and maintenance complexity without demonstrated overall benefit.
5. The difficult-query inspection points to a possible final-ranking/aggregation issue worth investigating before replacing or expanding the embedding model.

This decision does not establish that E5 is intrinsically inferior or that it could never help a different language/query distribution. It means that the evidence from this test does not justify adding it to Memora now.

## 54.5 Follow-up direction

If semantic retrieval is improved next, first inspect how sentence and chunk candidates are combined into final transcript rankings. In particular, test whether a very strong match from one representation is being diluted or demoted when the different representation families are aggregated.

Keep the embedding-model choice fixed during that work so ranking changes can be evaluated without confounding them with a model change. Reconsider E5 only if a clearly defined later test shows a meaningful benefit for the intended corpus and user queries.

---

---

# 55. Search Transcript Editing and Index Refresh Workflow

**Date:** 20 October 2026  
**Status:** Implemented in the current Search/Combine workflow; visual behavior should still be checked in the running app.

## 55.1 Purpose

Transcript editing from Combine is intended to let the user correct an existing transcript without losing the ability to search the updated text. Saving an edit must update the durable transcript file and refresh the current Search view so the user can immediately see the effect of the change.

## 55.2 Save and refresh behavior

The current edit workflow in Combine was refined so that, after a transcript edit is saved successfully, Memora:

- updates the in-memory transcript record to reflect the saved text;
- invalidates/rebuilds the relevant Search index entries for the changed transcript through the existing indexing workflow;
- reruns the current Search query so the results and highlights reflect the edited text;
- refreshes the visible Search results rather than leaving stale transcript text or stale highlighting on screen; and
- returns the view to the top so the user can see the Search controls and indexing status.

The intent is to make the result of editing visible immediately, while retaining the existing explicit index-update action for committing the refreshed index state.

## 55.3 Explicit Update Search Index action

The Search workflow still includes an **Update Search Index** action. Saving an edited transcript and rerunning the current query does not remove the need for the user to use this existing action when the UI indicates that the index needs updating. The interface should make that action easy to notice because it is located above the query area, while the user's attention is usually on the search box and results.

The current visual refinement makes the enabled button more conspicuous with a vivid blue fill and a slow, gentle pulsing blue halo. A separate thin black outline surrounds the halo; it is a distinct outline rather than a dark shadow blended into the blue glow. The button's label and indexing behavior remain unchanged. The animation is disabled when the operating system requests reduced motion, and the button retains a visible keyboard-focus indicator.

This is a presentation improvement only. It must not change indexing semantics, result ranking, or the stored transcript content.

## 55.4 Responsibilities and boundaries

The durable individual `.txt` transcript remains the source of truth. Search results, highlights, and the Search index are derived representations of that content. Editing should update the source file first, then refresh the derived views through the established workflow.

The change does not introduce a new embedding model or change the semantic representations, retrieval thresholds, lexical matching, contextual highlighting, or Search-to-Combine handoff. It is a workflow and presentation refinement around transcript edits and index refresh.

## 55.5 Validation notes

The updated save-and-refresh behavior was reported by the user to appear to work in practice. The CSS change for the distinct black outline was corrected after the first attempt produced a single dark pulsing halo. The revised CSS uses a separate pseudo-element outline. Its appearance should still be checked in the running browser; a source change alone does not establish that every browser renders the intended visual effect identically.

