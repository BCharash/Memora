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
