# iMuse and Memora — Native Development Roadmap

## Purpose
Preserve the existing PWAs while adding installable Windows and macOS applications for personal use and friends, without mandatory annual developer fees. This is a planning document for handoff to Codex, not an instruction to immediately modify either repository.

## Existing environment
- iMuse: approximately 16,000 lines of HTML/CSS/JavaScript; durable audio recording, IndexedDB recovery, pause/resume, silence detection, audio export, prospective Whisper voice commands and title suggestions.
- Memora: approximately 25,000 lines; Transformers.js Whisper transcription, model registry, lexical and semantic search, Combine, transcript editing, archive metadata and audio playback.
- Windows: Alienware Aurora R8, Intel i9-9900K (8 cores/16 threads), RTX 2080 Ti (11 GB VRAM), 64 GB RAM.
- Mac: Intel MacBook Pro 2018, macOS Sequoia 15.7.7. Also support Apple Silicon and other compatible macOS versions.
- iPhone: retain PWA support; native iOS distribution is a separate decision.
- Existing workflow: VS Code, Codex, GitHub Desktop, GitHub Pages.

## Architecture options
| Approach | Advantages | Limitations |
|---|---|---|
| Simple WebView wrapper | Fast, minimal changes | Retains browser restrictions |
| Hybrid native app | Reuses UI and logic; native services | Requires bridge and platform testing |
| Full native rewrite | Maximum native integration | Expensive, duplicates existing logic |

Prefer the hybrid approach. Tauri 2 is the leading candidate, subject to proof-of-concept testing. It uses Rust native services and WebView2 on Windows, WKWebView on macOS. Electron bundles Chromium and offers more consistent rendering but has a larger footprint. Swift/SwiftUI with WKWebView is an attractive Apple-only alternative. Capacitor primarily targets mobile. Tauri also supports mobile, but does not bypass Apple signing or iOS restrictions.

## Shared architecture
```text
 iMuse HTML/CSS/JS          Memora HTML/CSS/JS
          |                         |
          +--- Platform adapters ---+
                       |
        Shared native services (Rust/Tauri)
        filesystem, audio, inference, model storage,
        metadata, SQLite, hardware and memory diagnostics
                  /             \
       Windows / CUDA       macOS / Metal or CPU

 Existing PWA builds continue using browser adapters.
```
Maintain one repository per application. Use capability detection and share JavaScript across Windows and Mac. Preserve browser fallbacks, archive formats, recording IDs, UUIDs, transcript metadata, search and Combine behavior. Give the bridge narrowly scoped commands and permissions. Pass authorized paths or handles for large audio files.

For Memora, keep the existing HTML/CSS/JavaScript frontend and GitHub Pages PWA deployment. Add Windows and macOS packaging targets in the same repository after the standalone Tauri lab passes. Keep archive rules, metadata parsing and recording identity in the shared code. Start with an archive adapter for selecting and reopening an authorized folder, listing and reading files, opening audio for playback, and saving output. Drive destination controls from the active adapter's write capability. Use the existing browser storage path for the PWA and retain separate local stores initially. The archive files provide continuity between builds. Transfer of browser-only preferences or other local state requires a separate design.

Extract a shared Rust library when both applications have demonstrated a common need. Introduce SQLite if a specific storage requirement warrants it.

## iMuse native opportunities
- Stream audio directly to durable disk storage instead of accumulating large browser Blobs.
- Preserve recording fidelity and existing pause/resume and silence detection behavior.
- Implement crash recovery, interruption handling, device changes, and automatic saving.
- Validate output formats and metadata against Memora's identification logic.
- Investigate native headset controls, wake-word detection, and Whisper commands; do not assume headset support is guaranteed.
- Native background recording on mobile may help, but iOS restrictions and distribution remain separate challenges.
- Test long recordings, interruptions, low disk space, forced termination, and recovery before replacing the existing recorder.

## Memora native opportunities
- Persistent authorized archive access, direct file writes, audio playback and source resolution.
- Persistent model files instead of browser-managed caches; consider sharing models with iMuse when formats are compatible.
- Native batch transcription, hardware detection, RAM/VRAM diagnostics and native semantic embeddings.
- Preserve existing lexical/semantic search, Combine, editable transcripts, metadata and archive identity.
- Keep native inference optional until validated. Embedding changes may require re-embedding; do not silently mix incompatible embedding spaces or alter existing hashes.

### First Memora desktop milestone

Package the shared frontend in a standalone Tauri lab and run the same workflow on Windows and the Intel MacBook Pro. Use a disposable copy of a representative archive and the existing recording identity and shared-folder fixtures where practical.

1. Select an archive and reopen it after restarting the desktop app. Verify how the app handles a moved folder or access that must be granted again.
2. Resolve and play original audio, search transcripts, run Combine, and save an output inside an authorized destination.
3. Open the exported result in the existing PWA and verify the content, archive UUID, recording IDs and transcript metadata. Run the equivalent workflow in the PWA to check for regressions.
4. Test a packaged install with a fresh profile. Check metadata parsing, DOCX export and worker startup against the current CDN dependencies. Define which features work on first launch offline and which require model or asset downloads, then test both cases.

Start Mac testing early. WKWebView needs its own validation of workers, audio playback and model loading, and distribution needs testing on both Intel and Apple Silicon. Check installer launch on fresh systems before sharing builds with friends. Windows may be the more involved platform for native GPU transcription because CUDA packaging and compatibility on the RTX 2080 Ti need separate validation. Keep native Whisper, native embeddings and Voice Memos import independent of the first desktop milestone. Record engine, model and configuration identity so native inference results cannot silently reuse incompatible caches.

## Native inference benchmark lab
Compare Transformers.js/WebGPU (current baseline), whisper.cpp CPU, whisper.cpp CUDA on Windows, whisper.cpp Metal where supported on Mac, and faster-whisper/CTranslate2 CUDA on Windows. WhisperKit/Core ML and MLX Whisper (Apple Silicon) are additional candidates. Native model formats may differ from existing ONNX models. CUDA runtime and driver compatibility must be tested, particularly for the RTX 2080 Ti; Metal acceleration on Intel Macs is not guaranteed.

Use identical short and longer reference audio, comparable model variants, quantization and decoding settings. Report WER, real-time factor (transcription time/audio duration), load time, loaded and peak RAM/VRAM, stability and output quality. Distinguish cold/warm runs. Native inference is not automatically faster. Validate on both existing computers before selecting an engine.

## Apple Voice Memos import
Goal: export recordings by original recording year into user-selected folders such as `Voice Memos 2021`, preserving the metadata required by Memora. Also offer all-years export into separate folders. The current manual workflow uses Share > Options > Editable rather than Rendered > Save to Files.

Candidate approaches: Shortcuts (limited actions), standalone HTML with user-selected folders and SQLite WASM (limited protected filesystem access and file timestamps), AppleScript/Accessibility UI automation (fragile), or native read-only library access (preferred investigation).

Known candidate library location on recent macOS:
`~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/`

Inspect rather than assume the presence of `.m4a`, edited/layered formats such as `.qta`, and `CloudRecordings.db` with WAL/SHM files. Paths and schemas are private implementation details and can change. Discover known locations, inspect schema dynamically, read SQLite consistently and never modify Apple's library. Full Disk Access or other user-granted permissions may be required.

### Diagnostic before implementation
1. Count recordings by year using original recording date; determine local availability.
2. Compare direct original copies against manually exported Editable and Rendered versions for ordinary and edited recordings.
3. Compare embedded MP4 metadata, audio payload, duration, title, edit information and Memora Recording ID. Do not assume direct copies are equivalent to Editable exports.
4. Determine whether playback of a cloud-only recording triggers a usable local download.
5. Test whether download can be automated through Accessibility without modifying recordings.

### Cloud availability
Voice Memos iCloud sync is distinct from ordinary iCloud Drive. Enable Voice Memos iCloud sync on source device and Mac, open Voice Memos and allow synchronization. No documented public bulk-download API or Download All command was established in the discussion. Playback-triggered download is a hypothesis requiring testing. UI automation may require Accessibility permission and may break across macOS versions or languages. Some older systems cannot display newer layered recordings. Do not promise complete cloud retrieval.

### Export requirements
Preview counts by year, available locally, missing/cloud-only, and destination. Copy bytes without re-encoding where validated; preserve original dates and titles, resolve filename collisions, verify hashes, skip previously exported identities, and produce an explicit report of successes, skips, unavailable files and errors. Do not silently omit recordings. Avoid overwriting existing files. Distinguish successful local export from completed iCloud Drive upload. Consider integrating importer as a native Memora module rather than a separate app. Existing commercial reference: https://support.flaviocopes.com/docs/exporter-for-voice-memos (not a dependency).

## Development and distribution
Free tools: Tauri, Rust, Xcode (compatible version), Visual Studio Build Tools subject to applicable license, whisper.cpp, CUDA Toolkit, GitHub. Continue using VS Code and Codex. Build Windows installers (.exe/.msi) and macOS .app/.dmg or ZIP. Compile Mac Universal 2 (Intel + Apple Silicon) where all dependencies support it; test both architectures and establish minimum OS versions. Windows and Mac builds generally need appropriate platform toolchains.

No mandatory annual fee for local desktop development or informal direct distribution. macOS ad hoc signed builds may require users to authorize launch in System Settings > Privacy & Security; managed computers may prohibit this. Developer ID signing, notarization and Mac App Store distribution generally require paid Apple Developer Program membership (US$99/year or local equivalent). Windows unsigned installers may trigger SmartScreen; commercial signing is optional for informal distribution. Friends should not need Xcode or Python if dependencies are packaged correctly. Native iOS distribution has different provisioning and signing constraints; retain PWA unless separately addressed. Do not advise disabling OS security globally.

## Estimates from discussion
These are preliminary AI-assisted active development/testing estimates, not measured commitments or a repository audit.

| Task | iMuse hours | Memora hours |
|---|---:|---:|
| Architecture review | 2–4 | 3–5 |
| Tauri integration | 2–4 | 2–4 |
| Existing functionality validation | 3–5 | 4–8 |
| Filesystem/storage | 3–6 | 4–8 |
| Native recording | 8–16 | — |
| Audio playback/processing | 2–4 | 3–6 |
| Native Whisper | 3–6 | 6–12 |
| Native embeddings | — | 6–12 |
| Voice Memos importer | — | 6–12 |
| Platform refinements | 4–8 | 4–8 |
| Installers | 2–4 | 2–4 |
| Regression testing | 8–16 | 8–16 |
| Arithmetic total | 37–73 | 48–95 |

Combined planning allowance: roughly 75–140 hours with shared work, potentially more if compatibility or recording recovery proves difficult. The earlier iMuse upper total of 69 hours was an arithmetic underestimate; the individual rows sum to 73. Excludes native mobile distribution and unresolved cloud-only Voice Memos automation. Estimated code retention: iMuse 75–90%, Memora 85–95%; illustrative only, with additional native code required.

- Level 1: basic desktop wrappers, 1–3 days.
- Level 2: useful hybrid native capabilities, 2–4 weeks part-time.
- Level 3: mature desktop applications, 4–8 weeks part-time (dependent on hours available and test results).

## Proposed roadmap
| Period | Deliverable |
|---|---|
| Week 1 | Standalone Tauri lab on Windows and Intel macOS. Package the frontend and test the Memora archive round trip with the PWA. Check WebView, WebGPU, WASM, IndexedDB, ES modules, workers and model loading. |
| Week 2 | Use the lab results to define Memora's archive adapter and verify fresh installs and offline behavior. Identify infrastructure that both apps can reuse. |
| Week 3 | iMuse native recorder, pause/resume, silence detection, recovery and saving |
| Week 4 | Memora native Whisper benchmarks and optional integration |
| Weeks 5–6 | Independent follow-ups for Voice Memos diagnostics/import and native embeddings, subject to the earlier lab results. |
| Weeks 7–8 | Regression testing, installers, Intel/Apple Silicon/Windows compatibility and friends' testing |

Start with a standalone lab. Use the Memora archive milestone and the iMuse recording proof of concept to establish what each app needs. Treat the calendar and code-retention estimates as placeholders until the archive round trip and packaged runtime checks pass. Keep each phase independently usable and reversible.

## Codex handoff / next action
Inspect the latest repositories before changing code. Map browser-specific APIs, audio lifecycle, model registry, file operations and metadata contracts. Use the standalone Tauri lab to validate the first Memora desktop milestone and turn the results into a proposed archive adapter interface. Test native iMuse recording to disk and native Whisper in separate experiments. Record results for each platform and revise estimates before modifying production apps. Use separate branches and preserve existing PWA deployments. This planning document authorizes no production code changes.

## Open questions and limitations
- Memora's source has been reviewed for hybrid readiness. Native wrapper tests, benchmarks and a current iMuse repository review are pending.
- Tauri is a proposed choice, not a final validated decision; embedded WebViews may lack APIs used by the PWAs.
- Native inference speed, model compatibility, memory benefits and recording reliability require measurement.
- Voice Memos direct-copy metadata equivalence and cloud-only download automation remain unproven.
- Supported OS versions, Apple Silicon testing access, installer security warnings and shared library packaging need decisions.
- The estimates are contingent on scope, available Codex usage, and actual testing effort.
