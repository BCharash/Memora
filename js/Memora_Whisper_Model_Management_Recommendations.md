# Memora — Whisper Model Management Recommendations

**Date:** 2026-09-30  
**Purpose:** Design recommendations for making Memora's Whisper model handling robust, cache-friendly, and usable offline.

---

## 1. Current situation

Memora uses Transformers.js to run Whisper locally in the browser.

The current architecture has different execution paths:

### Desktop

- Transformers.js 4.0.0
- WebGPU
- Uses the computer's GPU
- Currently able to run Whisper Medium
- Large-v3 currently fails because the configured model-file combination does not exist in the selected Hugging Face repository

### iPhone/iPad

- A separate Web Worker
- Transformers.js 3.7.2
- Currently Small is the practical upper limit
- The iPhone should not be expected to run Medium or Large-v3 merely for architectural symmetry

The model catalog currently contains repository names and, for some models, explicit dtype configurations.

---

# 2. Important architectural principle

## Hard-code the model identity; discover implementation details when necessary.

Memora should maintain a **small curated catalog of supported Whisper model families**, for example:

- Tiny
- Base
- Small
- Medium
- Large-v3

The catalog can identify the intended repository, but Memora should avoid unnecessarily hard-coding internal ONNX filenames such as:

`decoder_model_merged_q4.onnx`

Those filenames and available quantizations can change in a model repository.

The recent Large-v3 failure illustrates this problem: the configured combination caused Transformers.js to request a file that was not present in the repository.

---

# 3. Recommended model-loading strategy

Use a **cached-first, self-healing** strategy.

Normal operation should NOT query Hugging Face every time.

### Normal path

```text
User selects model
       |
       v
Does Memora have a known-good cached configuration?
       |
      YES
       |
       v
Load cached model
       |
       v
Transcribe locally
```

This should require no network connection.

This is particularly important for the iPhone version and for Memora's intended ability to work offline.

---

# 4. First-time model use

If the requested model has never been downloaded:

```text
User selects model
       |
       v
Known-good local model?
       |
      NO
       |
       v
Is network available?
       |
      YES
       |
       v
Resolve compatible model configuration
       |
       v
Download required model files
       |
       v
Verify successful loading
       |
       v
Save/cache configuration
       |
       v
Transcribe
```

If there is no network connection and the model has not previously been cached, Memora should clearly tell the user that the model must first be downloaded while online.

---

# 5. Error recovery / dynamic discovery

Memora should **not dynamically search Hugging Face on every run**.

Instead, discovery should be a fallback mechanism used when a known cached configuration cannot be loaded.

Recommended flow:

```text
Try known-good cached configuration
       |
       +---- SUCCESS ----> Use model
       |
       +---- FAILURE
                |
                v
        Classify the error
                |
          +-----+------+
          |            |
      Model/file     Other error
       problem       (audio, memory,
          |          WebGPU, etc.)
          |              |
          v              v
   Attempt model      Report error
   discovery/update
```

Only errors that plausibly indicate a model/repository/configuration problem should trigger discovery.

Do NOT use model discovery for unrelated errors such as:

- corrupt audio
- unsupported audio format
- microphone problems
- WebGPU failure
- insufficient memory
- browser security errors
- user cancellation

---

# 6. Model manifest / cache metadata

When Memora successfully resolves and loads a model, it should save a small local manifest describing the known-good configuration.

Conceptually:

```json
{
  "model": "large-v3",
  "repository": "Xenova/whisper-large-v3",
  "revision": "known revision or commit",
  "transformersVersion": "4.0.0",
  "device": "webgpu",
  "dtype": {
    "encoder_model": "fp16",
    "decoder_model": "q4"
  },
  "status": "verified",
  "lastChecked": "2026-09-30"
}
```

The exact fields can be determined during implementation.

The important idea is that Memora remembers:

> "This exact model configuration worked on this device."

That prevents unnecessary network discovery on subsequent runs.

---

# 7. Prefer verified revisions where practical

Hugging Face repositories can change over time.

For reproducibility, Memora should preferably remember the repository revision/commit associated with a successfully verified model configuration rather than relying indefinitely on a moving `main` branch.

This gives Memora two useful properties:

### Stability

A model that worked yesterday continues to refer to the same known-good model files.

### Recovery

If the known-good revision eventually fails or is unavailable, Memora can perform discovery and resolve a newer compatible configuration.

---

# 8. Device-specific model availability

The model selector should represent **logical model families**, while Memora determines what is practical on the current device.

For example:

### iPhone

```text
Tiny       available
Base       available
Small      available
Medium     not currently practical
Large-v3   not currently practical
```

### Desktop with capable GPU

```text
Tiny       available
Base       available
Small      available
Medium     available
Large-v3   potentially available
```

The application should not force identical model choices across platforms.

The important goal is a common Memora architecture with device-appropriate implementations.

---

# 9. Do not assume that the same model name means identical inference

For example, "Whisper Small" on desktop and "Whisper Small" on iPhone may differ in:

- Transformers.js version
- ONNX model files
- dtype / quantization
- execution backend
- numerical precision
- device hardware
- audio preprocessing
- generation/decoding behavior

Therefore, when evaluating transcription quality between desktop and iPhone, record the actual implementation details rather than relying only on the displayed model name.

---

# 10. Current Transformers.js difference should be retained as a known issue

Current Memora code uses:

### Desktop

Transformers.js 4.0.0 with explicit WebGPU.

### iPhone worker

Transformers.js 3.7.2 without an explicitly specified execution device.

This difference may contribute to the observed difference in transcription quality between desktop and iPhone even when both are nominally using Whisper Small.

It should be investigated before assuming that the iPhone's lower performance is solely caused by hardware.

Do not change the iPhone implementation solely on this assumption; test it first.

---

# 11. Large-v3 desktop issue

The current Large-v3 configuration requests:

```text
encoder_model: fp16
decoder_model_merged: q4
```

The resulting load attempt requests:

```text
decoder_model_merged_q4.onnx
```

The selected repository does not provide that file, resulting in a model-loading error.

This is a **model repository/configuration mismatch**, not evidence that the desktop GPU is incapable of running Large-v3.

The proper fix should be to identify a valid Large-v3 configuration supported by the chosen Transformers.js version and repository, rather than simply changing filenames manually.

---

# 12. Recommended architecture

Add a model-resolution layer between Memora's UI/model catalog and Transformers.js.

Conceptually:

```text
                    MEMORA UI
                       |
                       v
                Model Catalog
                       |
                       v
              Model Resolution
                    Layer
                       |
          +------------+------------+
          |                         |
          v                         v
     Local Manifest           Device Capability
       / Cache                     Check
          |                         |
          +------------+------------+
                       |
                       v
              Known-good config?
                  /                          YES           NO
                 |             |
                 v             v
             Load it      Online discovery
                              |
                              v
                         Verify config
                              |
                              v
                         Cache result
                              |
                              +------+
                                     |
                                     v
                              Transformers.js
                                     |
                                     v
                              Whisper inference
```

---

# 13. Offline-first behavior

Memora should treat offline use as a deliberate feature, not an accident.

### If model is cached:

**No Internet required.**

### If model is not cached:

Internet is required for the initial download.

### If a cached model fails while offline:

Memora should not silently attempt network access indefinitely. It should report that the locally cached model could not be loaded and that an online model update/recovery may be required.

---

# 14. User experience

The complexity of Hugging Face, ONNX filenames, revisions, dtype choices, and Transformers.js should remain mostly invisible to the user.

The user should see something simple such as:

```text
Whisper model

○ Tiny
○ Base
● Small
○ Medium
○ Large-v3
```

Memora handles the implementation details.

If a model is not yet downloaded:

> "This model needs to be downloaded before it can be used offline."

If recovery is necessary:

> "Memora is updating the model configuration. This may require an Internet connection."

Avoid exposing raw errors such as:

`decoder_model_merged_q4.onnx not found`

unless the user opens a diagnostic/developer view.

---

# 15. Recommended development order

Do not implement the entire dynamic system at once.

### Phase 1 — Document current behavior

Record:

- model catalog
- repository
- Transformers.js version
- device/backend
- dtype
- known working models

### Phase 2 — Add a model manifest/cache

Remember the configuration that successfully loaded.

### Phase 3 — Make loading use the cached configuration first

No network request during normal operation.

### Phase 4 — Add error classification

Distinguish model-loading errors from unrelated runtime errors.

### Phase 5 — Add online recovery/discovery

Only invoke repository discovery when a model-specific failure warrants it.

### Phase 6 — Verify and cache the newly discovered configuration

Once it works, save it so future runs return to the offline/cached path.

---

# 16. Design goal

The overall design should be:

> **Stable when things don't change, adaptive when they do.**

Memora should normally use a known, verified local model configuration.

If Hugging Face changes a repository, model files, or available quantizations, Memora should not break permanently. It should be able to recognize the model-loading failure, investigate the current repository configuration when online, find a compatible configuration, verify it, and remember the successful result.

This gives Memora:

- offline operation
- faster subsequent launches
- reproducible model behavior
- resilience to Hugging Face repository changes
- device-specific model selection
- a path for future model additions
- less hard-coded dependence on individual ONNX filenames

---

## 17. Important principle for future Memora development

Do not "fix" individual model-loading failures by changing filenames until the underlying model-resolution architecture has been considered.

The Large-v3 error is a useful example of why.

Instead of:

```text
Error
  ↓
Change filename
  ↓
Try again
```

the long-term architecture should be:

```text
Error
  ↓
Determine what configuration is actually available
  ↓
Determine what configuration the current device can run
  ↓
Select a compatible configuration
  ↓
Verify
  ↓
Cache
```

That approach should make Memora substantially more robust as the underlying model ecosystem evolves.
