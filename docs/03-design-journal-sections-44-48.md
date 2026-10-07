# 44. Whisper Model Investigation and Current Understanding

A substantial part of the recent work has been understanding what Memora's Whisper model choices actually mean in a browser application.

## 44.1 Model size is a practical resource decision

The Whisper hierarchy remains:

    tiny → base → small → medium → large-v3

These are not simply five levels of transcription quality. They represent materially different resource requirements, download/cache sizes, inference cost, memory pressure, and practical device compatibility.

The browser cache also contains multiple assets per model rather than one simple model file. Settings therefore reports both storage size and number of cached files.

The recent desktop cache measurements demonstrated the scale of the difference: Tiny, Base, Small, Medium, and Large-v3 can consume hundreds of megabytes to multiple gigabytes of browser storage.

This makes model selection a storage and device-capability problem as well as a transcription-quality choice.

## 44.2 The same model name does not imply the same execution environment

A model can be run through different Transformers.js versions, execution backends, quantizations, and device capabilities. The recent Memora work has demonstrated a particularly important split:

    Desktop
        Transformers.js 4.0.0
        WebGPU

    iPhone/iPad
        Transformers.js 3.7.2
        worker / WASM path

Consequently, the fact that a model runs on the desktop does not establish that the same model can run on the iPhone.

## 44.3 Desktop results

The desktop environment has a powerful NVIDIA GPU and successfully provides WebGPU to Transformers.js. Medium has been practical on the desktop, and the desktop runtime has been moved to the newer Transformers.js 4.0.0 path.

Large-v3 was also investigated on the desktop. An attempted load failed because the expected Hugging Face asset could not be located, specifically an expected quantized decoder file under the `Xenova/whisper-large-v3` repository. This exposed an important architectural weakness in hard-coded model loading: the application can fail because a repository's file layout or available quantization differs from what the application assumes.

The Large-v3 failure is therefore useful evidence for the next architecture rather than a reason to keep adding one-off filename exceptions.

## 44.4 iPhone results

The iPhone has been substantially more constrained. Whisper has been run successfully on the iPhone using the worker/WASM path, but model sizes that are practical on the desktop are not automatically practical on the phone.

The practical testing boundary reached so far is approximately:

- larger models are feasible on the desktop;
- Small has been the largest Whisper model successfully used on the iPhone in the recent testing;
- attempts to move the iPhone to a useful WebGPU Whisper path have not yet produced a reliable way to run the larger models.

The important conclusion is not that iPhone WebGPU is categorically impossible. Rather:

> WebGPU availability on the device has not yet translated into a reliable, useful WebGPU Whisper execution path for Memora.

Settings may report WebGPU availability, but that does not by itself establish that the Whisper pipeline can use WebGPU successfully, nor that a larger model will fit and perform acceptably.

## 44.5 Why WebGPU was investigated on iPhone

The motivation was straightforward: the desktop's successful WebGPU path suggested that a GPU backend might reduce the iPhone's CPU/WASM limitation and make larger Whisper models practical.

Testing showed that this assumption could not simply be carried across platforms. iPhone Safari can expose WebGPU availability, but the existing Whisper implementation remained tied to its worker/runtime path and the larger models did not become automatically usable.

This reinforced the need to distinguish three separate questions:

1. Is WebGPU available?
2. Can Transformers.js use WebGPU for this particular model and execution path?
3. Can this particular device run that model with acceptable memory, stability, and performance?

Memora should answer all three before presenting a model as recommended.

---

# 45. Model Selection: From Hard-Coded Choices to Dynamic Capability Detection

The next model-related architectural step is to replace the assumption that Memora already knows the complete and permanently valid set of Whisper models with a dynamic model-selection system.

## 45.1 Why the current hard-coded approach is fragile

The current application knows a fixed set of model choices and maps those choices to known repository/model identifiers and expected assets.

This works while the repository structure and Transformers.js expectations remain stable, but the Large-v3 investigation demonstrated the weakness of this approach. Hugging Face repositories can change model assets, filenames, quantizations, or repository layouts. A model name alone therefore cannot guarantee that the exact files Memora expects still exist.

A hard-coded list also cannot adequately account for:

- desktop versus iPhone capability;
- WebGPU versus WASM execution;
- available browser storage;
- cached versus uncached models;
- model-specific quantization/asset variants;
- future Whisper models;
- changes in Transformers.js model support.

## 45.2 The future model registry

The preferred architecture is a small model registry/configuration layer rather than scattering model names throughout `app.js`, `whisper.js`, and the UI.

Conceptually each model entry should describe things such as:

    user-facing name
    repository/model identifier
    model family
    approximate size
    supported runtime/backend
    quantization/variant
    language/operation capabilities
    minimum practical device class
    cache identity
    status / availability

The registry should describe candidates, not blindly declare them usable.

## 45.3 Dynamic availability checking

At startup or when the model selector is opened, Memora should determine what is actually usable on the current device rather than merely displaying the complete hard-coded list.

The check should be layered:

    Model candidate
          ↓
    Is the repository/model address valid?
          ↓
    Are the required assets available?
          ↓
    Does the current Transformers.js version support them?
          ↓
    Which backends are available?
          ↓
    Is the device likely to support the model's resource requirements?
          ↓
    Test/load if necessary
          ↓
    Present as usable / unavailable / cached / not cached

The most expensive operations should not be performed merely to populate the initial selector. A lightweight capability check should come first, with actual model loading reserved for when the user chooses a model or when a targeted validation is necessary.

## 45.4 Cache-aware model selection

Memora should distinguish:

- available online;
- already cached locally;
- currently usable;
- unavailable for this runtime;
- failed validation;
- not yet checked.

This is particularly important because model downloads are large and the application should not repeatedly rediscover or redownload models unnecessarily.

The existing browser cache should remain useful when the network is unavailable. A cached model that has already been validated should be preferred over unnecessarily repeating an online discovery process.

## 45.5 Handling model-repository changes

The future system should not assume that a Hugging Face repository will always contain a particular filename. When model loading fails because an expected asset is missing, Memora should be able to perform a targeted discovery/validation step rather than permanently encoding a new filename into the application.

The proposed strategy is:

    normal load
        ↓
    cached/known model information
        ↓
    if load fails because assets are missing
        ↓
    targeted model/asset discovery
        ↓
    identify a compatible available variant
        ↓
    cache the validated model configuration
        ↓
    retry

If no compatible variant exists, the model should be marked unavailable for that runtime rather than repeatedly attempting the same failing load.

## 45.6 Do not make model discovery depend on every launch

The application should not search Hugging Face on every startup. Model discovery is a fallback/refresh operation, not the normal execution path.

The preferred hierarchy is:

    validated local model configuration/cache
                    ↓
             use local knowledge
                    ↓
          if unavailable/invalid
                    ↓
          perform targeted discovery
                    ↓
          validate and cache result

This preserves offline behavior while allowing Memora to recover from model-repository changes.

## 45.7 Device-specific recommendations

Eventually the selector should be able to say, in effect:

    Tiny       Available
    Base       Available
    Small      Available / recommended
    Medium     Desktop only
    Large-v3   Not currently available on this device

The exact labels should be determined by testing rather than guessed from model size alone.

On the iPhone, WebGPU availability should be treated as one capability input, not as proof that the WebGPU Whisper path is viable.

On the desktop, the NVIDIA/WebGPU environment can permit larger models, but the application should still distinguish a model that is technically loadable from one that has actually been validated for Memora's transcription pipeline.

## 45.8 Model selection should remain user-visible

Dynamic detection should improve the model selector rather than hide it.

The user should still be able to choose the quality/resource tradeoff. Memora's responsibility is to prevent impossible or known-invalid choices and to communicate why a model is unavailable when that is useful.

The eventual selector should therefore be based on:

    user preference
          +
    device capability
          +
    runtime/backend capability
          +
    model availability
          +
    cache state

rather than on a fixed list alone.

---

# 46. Next Development Steps: Dynamic Model Selection

The next model-development work should proceed incrementally rather than replacing Whisper loading wholesale.

## 46.1 Step 1 — isolate model definitions

Move the model candidates and their user-facing metadata into one dedicated configuration/registry module.

The first change should not alter the actual transcription behavior. It should simply remove duplicated model definitions from the rest of the application.

## 46.2 Step 2 — expose runtime capabilities

Create a small capability report for the current environment, including at least:

- platform/device class;
- browser;
- Transformers.js version/path;
- WebGPU availability;
- current Whisper backend;
- known storage/quota information;
- relevant model-cache state.

Settings already provides much of the information needed for this report and can become the diagnostic surface for it.

## 46.3 Step 3 — validate candidate models

Introduce a model validation layer that can determine whether a candidate is genuinely loadable by the current runtime.

Validation should be deliberately cheaper than performing a full transcription. Where possible it should inspect the expected model assets and runtime compatibility before committing to a large download or inference operation.

## 46.4 Step 4 — make the selector capability-aware

Only after the registry and validation layer are working should the Transcribe model selector be changed to use them.

The UI can then distinguish, for example:

- usable now;
- cached;
- available but not cached;
- unsupported on this device;
- unavailable because required assets could not be found.

## 46.5 Step 5 — test the WebGPU path independently

Before declaring iPhone WebGPU support, run a small controlled Whisper test that answers the three separate questions established above:

1. WebGPU is available.
2. Transformers.js can execute the selected Whisper model through WebGPU.
3. The selected model is stable and useful on the iPhone.

Only then should WebGPU become a selectable/advertised Whisper backend on iPhone.

## 46.6 Step 6 — add model discovery as a fallback

Once normal cached/known model loading is stable, add targeted discovery for failed model loads. This is the point at which Memora can become resilient to Hugging Face repository changes rather than requiring a code change whenever a model asset moves or a quantized variant is renamed.

## 46.7 Step 7 — cache the validated result

A successful discovery/validation should be remembered locally so that the same model does not need to be rediscovered on every run.

The browser cache should therefore store both model assets and enough validated model configuration to identify how those assets were successfully loaded.

## 46.8 Step 8 — only then consider broader automatic model updates

Automatic discovery should not become an uncontrolled background downloader. Memora should remain conservative about downloading multi-gigabyte model assets.

The eventual system should prefer:

- cached validated models;
- explicit user choice before large downloads;
- targeted discovery after an actual failure or explicit refresh;
- clear reporting of model size and compatibility.

---

# 47. Current Model/Runtime Status

The current state can be summarized as follows:

| Area | Current understanding |
|---|---|
| Whisper engine | Transformers.js |
| Desktop Whisper runtime | Transformers.js 4.0.0 · WebGPU |
| iPhone/iPad Whisper runtime | Transformers.js 3.7.2 · worker/WASM path |
| Desktop GPU | WebGPU successfully available and useful |
| iPhone WebGPU | Reported available, but not yet established as a reliable Whisper backend |
| Desktop practical model range | Larger models are practical; Medium has been successfully used |
| iPhone practical model range | Small has been the largest successfully used in recent testing |
| Large-v3 | Investigated; a desktop load attempt failed because an expected quantized decoder asset could not be located |
| Model cache | Browser Cache API, with Settings reporting actual cached model groups and storage |
| Model selection | Still fundamentally based on known model choices; dynamic capability-aware selection is next |
| Model discovery | Not yet implemented as a general fallback |

The key architectural conclusion is that **model selection should become a capability/availability decision rather than a hard-coded list of model names**.

The Settings work has already created the beginnings of the diagnostic infrastructure needed for that transition: runtime reporting, browser storage/quota reporting, model-cache accounting, and visibility into cached model assets.

---

# 48. Development Philosophy Reinforced by the Model Work

The Whisper/WebGPU investigation reinforced the project's existing incremental-development philosophy.

Memora should not assume that a technically available browser capability automatically translates into a useful application capability. Each significant claim should be tested in the actual pipeline and on the actual target device.

The preferred progression is:

    capability exists
          ↓
    isolated test
          ↓
    Memora integration
          ↓
    real-world device test
          ↓
    retain only if useful
          ↓
    document the decision

This is particularly important for iPhone work, where memory pressure, browser restrictions, runtime versions, GPU support, and large local models interact in ways that are difficult to infer from any single API capability flag.

The same principle applies to model repositories: a model that exists conceptually or is listed by name is not necessarily a model that Memora can load successfully today.

The next work should therefore build on the working Settings and runtime diagnostics, introduce dynamic model configuration in a small step, and test each layer before changing the user-facing transcription workflow.

