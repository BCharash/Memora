# Memora Design Journal

**Version:** 9
**Status:** Living document  
**Project:** Memora  
**Purpose:** Organize, transcribe, preserve, and combine recordings from Apple Voice Memos and other audio sources.

---

## 1. Project Purpose

Memora is a standalone web application intended to turn recordings—particularly Apple Voice Memos—into durable, organized, searchable text.

The initial use case is importing recordings from an iPhone, extracting their original recording metadata, transcribing them with Whisper, and saving individual timestamped transcription files.

The individual transcription files are intended to be durable source material. A separate **Combine Files** function can later assemble those files into larger chronological or alphabetical collections without requiring the original audio to be retranscribed.

Memora is intended to be useful personally and for friends and is not currently intended as a commercial product.

---

## 2. Original Problem / Use Case

The principal use case is capturing thoughts over time in Voice Memos and eventually turning those recordings into an organized written record.

Important requirements emerged from that use case:

- Preserve the original recording date and time.
- Preserve the Apple Voice Memo UUID when available.
- Preserve the original filename.
- Record the duration.
- Transcribe recordings locally where practical.
- Save each transcription as an independent file.
- Avoid making a single combined file the only copy of the transcription.
- Allow additional transcription files to be added later.
- Rebuild a complete combined text or HTML document from the existing individual files.
- Eventually allow the combined HTML to link to or play the corresponding audio.

---

## 3. Core Design Principles

### 3.1 Preserve source information

The original recording's metadata is more important than the time at which the file happens to be imported.

Memora therefore distinguishes:

- **recording date/time** — when the Voice Memo was recorded
- **import/process date/time** — when Memora processes it

The recording date/time is used for organization and filenames.

### 3.2 Individual files are durable source material

A transcription should produce an independent file that remains useful even if Memora changes.

The combined batch document is therefore an output, not the primary source.

This allows a user to:

1. Transcribe some recordings.
2. Add more recordings later.
3. Transcribe the new recordings.
4. Run **Combine Files** again.
5. Produce a new complete combined document from all existing transcription files.

### 3.3 Separate responsibilities

Memora should not become one large JavaScript file containing every operation.

The application should separate:

- UI coordination
- audio processing
- metadata extraction
- Whisper transcription
- transcription workflow
- storage/file operations
- combining existing transcription files
- HTML generation

This separation is intended to make the application easier to understand, test, modify, and eventually incorporate into a native application.

### 3.4 Desktop and iPhone should share the core architecture

The desktop and iPhone workflows are different primarily because their browser file-system capabilities differ.

The core concepts—recording metadata, transcription records, Whisper processing, saved transcription format, and combining—should remain platform-independent.

Platform-specific differences should primarily live in the storage/input/output layer.

---

# 4. Intended User Workflow

## 4.1 Transcription

The primary desktop workflow is:

1. Select an **Audio Source** folder.
2. Memora finds supported audio recordings in that folder.
3. Display the recordings with metadata.
4. Select or deselect individual recordings.
5. Select a Whisper model.
6. Transcribe the selected recordings.
7. Save an individual transcription file for each recording.
8. Display the transcription results.

The source folder itself is initially the default destination.

The user can instead:

- use the source folder,
- create/use a `transcription` subfolder,
- or browse for another destination folder.

## 4.2 Combine Files

**Combine Files** is a separate top-level function.

It does not require an Audio Source.

Its intended workflow is:

1. Select a **Text Source** folder.
2. Memora finds existing individual transcription `.txt` files.
3. Display the files.
4. Select or deselect individual files.
5. Choose a sort order.
6. Create a combined `.txt` file.
7. Create a combined `.html` file.

The initial sort choices are:

- Date — newest first
- Date — oldest first
- Name — A → Z
- Name — Z → A

Audio association may be added later.

---

# 5. User Interface

The application header contains:

- Memora icon
- Memora name
- tagline: **“Remember what you recorded.”**

The application has three principal operating tabs:

- **Transcribe**
- **Combine**
- **Search**

**Settings** is not an operating tab. It is accessed through a settings gear in the application header and manages Memora rather than performing a recording/transcription/search operation.

The header has a three-part visual arrangement:

- the tab-specific Memora icon remains left-justified in its existing location;
- the Memora title and tagline remain centered;
- the Settings gear is right-justified.

The tab-specific icon behavior is preserved: the icon changes with the active operating tab.

The Transcribe tab contains:

- Audio Source
- Destination
- Recordings
- Transcription

The Combine Files tab contains:

- Text Source
- existing transcription files
- sorting controls
- combined output controls

The interface should remain calm, minimal, and easy to understand rather than becoming a dense collection of controls.

---

# 6. Planned Architecture

The intended JavaScript structure is:

    Memora/
    ├── index.html
    ├── manifest.json
    ├── design-journal.md
    ├── css/
    │   └── style.css
    ├── icons/
    └── js/
        ├── app.js
        ├── audioProcessor.js
        ├── metadata.js
        ├── whisper.js
        ├── whisper-worker.js
        ├── transcription.js
        ├── storage.js
        ├── combine.js
        ├── paragraphing.js
        └── html.js

Not all modules need to be created at once. The architecture will be introduced incrementally.

---

# 7. Module Responsibilities

## app.js

The UI coordinator/orchestrator.

It should:

- connect UI controls to application operations
- maintain cross-feature UI state
- call the appropriate modules
- update status and results
- coordinate handoffs between Search and Combine

It should not contain the detailed implementation of every subsystem.

Feature-specific rendering and event wiring should live in their UI modules.

## audioProcessor.js

Responsible for converting source audio into the form required by Whisper.

The current important operations are:

- decode supported source audio
- resample it to 16 kHz
- provide Whisper with a format-neutral audio representation

The application currently recognizes common audio extensions including M4A, MP3, WAV, WebM, MP4, AIFF, FLAC, and OGG. Actual browser codec support may vary by device/browser; the extension list is not intended to promise that every codec combination will decode everywhere.

This is an audio-processing module, not a recording module.

There is intentionally no `recorder.js` requirement in Memora because Memora does not record audio.

## metadata.js

Responsible for extracting metadata from supported audio files.

For Apple Voice Memos, it can extract the recording date/time and Voice Memo UUID from embedded MP4 metadata. For more generic browser-decodable audio, duration is available even when recording-date or UUID metadata is not.

Important information includes:

- recording date/time
- duration
- Voice Memo UUID
- other useful metadata discovered during development

MP4Box is currently used for MP4/M4A metadata parsing.

## whisper.js

Responsible for Whisper model loading and transcription machinery.

The current implementation uses Transformers.js.

The application should continue to support model selection and should not unnecessarily require the user to select a language when Whisper can determine it.

Current model choices include:

- Tiny
- Base
- Small
- Medium
- Large-v3

Large-v3 has previously failed in testing and should not be reopened unless specifically requested.

## Metadata provenance

Memora should not guess where a recording came from.

A recording may originate in Apple Voice Memos, iMuse, another recording application, a download, or a copied/edited file. The common metadata model therefore remains provenance-agnostic.

The common record should preserve information Memora actually knows, such as:

- original filename
- recording date/time, when known
- file date, when available
- duration
- unique recording ID, when available

Apple Voice Memo UUIDs are preserved when present. A future iMuse integration may provide its own recording ID and locally known recording time, but that should be represented through the same general metadata model rather than by assuming every file is a Voice Memo.

## whisper-worker.js

Reserved for worker-side Whisper processing where appropriate.

The goal is to keep heavy transcription work from unnecessarily blocking the UI.

## transcription.js

High-level transcription workflow.

Conceptually:

    recording
        ↓
    metadata
        ↓
    audio processing
        ↓
    Whisper
        ↓
    TranscriptRecord
        ↓
    saved transcription

This module should coordinate the transcription process without owning the user interface.

## storage.js

Responsible for file and folder operations.

This module is especially important because desktop and iPhone have different browser storage/file APIs.

Responsibilities include concepts such as:

- selecting source folders/files
- enumerating files
- reading files
- creating folders
- writing files
- generating unique filenames

The storage abstraction is intended to make later iPhone support possible without rewriting the core transcription logic.

## combine.js

Responsible for combining existing transcription files.

It should:

- read individual `.txt` transcription files
- parse their relevant metadata/content
- create structured records
- sort records
- provide the records to the output layer

It should not perform transcription.

## paragraphing.js

Responsible for the optional semantic paragraphing of transcript text.

The paragraphing implementation is deliberately separate from both Whisper transcription and Combine Files. It receives transcript text and returns the same spoken words with paragraph breaks inserted.

The production module is based on the previously tested **Memora — Hybrid Paragraph Test 2** algorithm. It uses:

- Transformers.js 3.7.2
- the browser-local `Xenova/all-MiniLM-L6-v2` MiniLM model
- `q8` model weights
- sentence-level embeddings
- semantic transition, paragraph-center fit, forward semantic direction, rhetorical/continuation cues, and modest length pressure
- the established boundary-selection logic

The module does not introduce paragraph-length rules, word-count thresholds, sensitivity controls, additional semantic models, LLM paragraphing, or other new heuristic layers.

The module exposes two conceptual operations:

- `paragraphize()` — paragraphizes raw transcript text
- `paragraphizeTranscript()` — intended for a future workflow that paragraphizes complete existing transcript files while preserving their metadata

The current transcription workflow uses `paragraphize()` after Whisper has produced the raw transcript. Combine Files also uses `paragraphize()` when its **Create paragraphs** option is selected.

Paragraph embeddings are requested through `semantic.js`, which runs inference in the existing `semantic-worker.js`. Paragraphing therefore reuses the same MiniLM worker/model as Search where it is already loaded, and model inference no longer blocks the page's main thread. The model remains lazy: ordinary transcription and Combine operations do not load it unless paragraphing is requested.

Paragraphing preserves input that already contains blank-line paragraph breaks and skips embedding it again. This avoids unnecessary model work when Combine receives transcripts that were paragraphized during transcription.

## html.js

Responsible for rendering structured records as HTML.

It should not own the logic for finding or sorting transcription files.

Later it may add:

- links to original audio
- HTML audio players
- other navigation features

---

# 8. Structured Data

The central conceptual record is a transcription record.

An initial representation is:

    TranscriptRecord {
        file,
        filename,
        metadata,
        transcript,
        model,
        audioRelativePath
    }

The structure may later include:

- Voice Memo UUID
- recording date/time
- duration
- original audio reference
- transcription model
- transcription segments
- segment timestamps
- source filename

The important design principle is that the transcription result is represented as structured data before being rendered into a particular output format.

For Combine Files paragraphing, the existing `TranscriptRecord` structure is retained. Paragraphing changes only the `transcript` text carried by the records; metadata, filename, model, operation, and audio-relative-path information remain intact. This allows the same processed records to feed TXT, DOCX, and HTML generation.

---

# 9. Individual Transcription Files

The current filename convention uses the recording date, recording name, Whisper model, and—when applicable—the translation operation.

For transcription:

    YYYY-MM-DD - basename - model.txt

For translation to English:

    YYYY-MM-DD - basename - model - eng.txt

The `-eng` suffix is used only when the operation is **Translate**. Ordinary English transcription does not receive the suffix.

For example:

    2026-09-26 - Recording Name - medium.txt

and:

    2026-09-26 - Recording Name - medium - eng.txt

The recording date is used rather than the full recording time in the filename. The full recording date/time remains available as metadata.

If a filename collision occurs, Memora adds a numeric suffix rather than overwriting an existing file.

Example:

    ... - small.txt
    ... - small-2.txt

The exact filename convention may evolve as the application architecture is refactored.

The contents currently include:

- original filename
- recording date
- duration
- Voice Memo ID
- Whisper model
- Operation (`transcribe` or `translate`)
- original language when relevant to translation
- separator
- transcript

The saved text format is intentionally simple and durable.

The operation is stored explicitly in the transcript metadata rather than being inferred from the filename. Combine Files uses this metadata to distinguish transcription from translation.

For backward compatibility, older transcript files without an `Operation:` line are treated as transcription files.

### Audio Relative Path Metadata

Individual transcript files can also preserve the relationship between the transcript and its original audio recording.

When Memora can determine the relative path from the transcription destination back to the selected audio source folder, it writes an additional metadata field:

    Audio Relative Path: ../recording.m4a

The path is relative to the location of the individual transcript file. It is deliberately stored with the transcript rather than relying on the current location of the audio source, because the transcript may later be selected for combining independently of the original source-folder selection.

This allows the combined HTML generator to reconstruct the path to the original audio when the combined HTML is created within a location whose relationship to the transcript/source hierarchy can also be determined.

The metadata is not displayed as part of the combined HTML's visible transcript content. It remains available in the durable individual `.txt` file as provenance information.

The current implementation supports relative paths when the transcription destination is the selected source folder or a descendant of it. If the destination is an unrelated folder, Memora cannot safely calculate a relative path between the two File System Access handles, so no audio-path metadata is written.

This preserves the intended architecture: audio remains an external file and does not need to be embedded into every transcript or HTML document.

---

# 10. Duplicate Detection

The Apple Voice Memo UUID is intended to provide a durable identifier for recordings.

Where available, Memora should use the Voice Memo UUID to help recognize the same recording even if:

- the file is imported more than once
- the filename changes
- the file is moved

The exact duplicate-handling UI and policy remain to be finalized.

---

# 11. Whisper / Transcription Design

Whisper is used as the transcription engine.

The application currently uses Transformers.js and has successfully demonstrated local browser-based transcription.

The transcription process currently includes audio preprocessing and Whisper chunking appropriate for recordings longer than 30 seconds.

The application should expose model choices representing different tradeoffs between:

- speed
- resource requirements
- transcription accuracy

The exact default model may evolve after further testing.

---

# 11A. Language and Operation Controls

Memora distinguishes the **language** of the recording from the **operation** performed by Whisper.

The intended behavior is:

- **Auto-detect** → Translate to English; the operation selector is disabled.
- **English** → Transcribe; the operation selector is disabled.
- **Portuguese, Spanish, French, German, Sanskrit, and other explicit non-English languages** → the user can choose Transcribe or Translate.

The initial operation state must be established when the page loads because Auto-detect is the default language selection.

The selected operation is recorded in the individual transcript metadata.

When the operation is Translate, the filename receives the `-eng` suffix. When the operation is Transcribe, it does not.

Model selection treats transcription and translation as separate operations for the same recording, allowing the highest available model to be selected independently for each operation.

Combine Files uses the stored `Operation:` metadata rather than relying on filename parsing.

Desktop browsers can provide access to a directory through the File System Access API.

The current desktop workflow uses:

    showDirectoryPicker({ mode: "readwrite" })

The source directory is enumerated for supported top-level audio files.

The source folder is deliberately treated as a folder rather than merely a collection of individually selected files because the desktop workflow needs to support:

- discovering recordings
- displaying the complete list
- selecting individual recordings
- creating a transcription folder
- writing output files

---

# 13. iPhone / iPad Design

iPhone support is an explicit part of the Memora project and must not be lost during desktop development.

The iPhone workflow is different from desktop because iOS Safari does not provide the same directory-picker capabilities available on supported desktop browsers.

The intended iPhone workflow is based on Apple's Files interface.

A tested workflow is:

1. In Voice Memos, select multiple recordings.
2. Share the recordings.
3. Choose the **Editable** export option.
4. Save them to Files.
5. Open Memora in Safari.
6. Select the M4A files through the iOS file picker.
7. Process them in Memora.
8. Save/share the generated files back through the iOS Files interface.

This workflow has already been tested successfully enough to establish its feasibility.

### iPhone testing observations

During testing:

- iPhone Safari successfully selected multiple M4A files.
- MP4Box successfully extracted metadata from the selected recordings.
- The iOS Files picker initially opens according to Apple's normal Files behavior; the web application cannot force it to begin in a particular iCloud Drive location.
- Generated files can be shared from the web application.
- Using **Share → Save to Files** successfully saved the generated files into a selected folder.

The final iPhone implementation has not yet been completed.

### Architectural implication

The iPhone implementation should reuse:

- metadata processing
- audio processing
- Whisper/transcription logic
- TranscriptRecord structure
- transcription file format
- combining logic
- HTML generation

It should provide a different storage/input/output implementation where necessary.

iCloud support is a future possibility, but it is not a prerequisite for the initial iPhone implementation.

---

# 14. HTML Output

The HTML output is intended to be more than a prettier copy of the combined text.

Eventually it should provide a navigable representation of the recordings and their transcriptions.

The longer-term design may include:

- recording title
- recording date/time
- duration
- transcript
- link to original audio
- audio player
- navigation between recordings

## 14.1 Audio association through relative paths

The combined HTML can now associate a transcript entry with its original audio without embedding a copy of the audio into the HTML.

The individual transcript carries:

    Audio Relative Path: ../recording.m4a

When Combine Files reads the transcript, that value becomes part of the structured record. If the combined HTML destination is itself within the relevant source hierarchy, Memora calculates the additional relative path needed from the combined HTML to the original audio.

For example:

    Audio Source/
    ├── recording.m4a
    └── transcription/
        ├── 2026-09-26 - recording - small.txt
        └── combined/
            └── combined.html

The individual transcript can contain:

    Audio Relative Path: ../recording.m4a

The combined HTML is two directory levels below the audio source, so its effective audio reference becomes:

    ../../recording.m4a

This keeps the audio external and avoids unnecessarily increasing the size of every generated HTML document.

The path is meaningful only as long as the referenced files remain in the corresponding relative locations. Moving the audio or changing the relevant folder hierarchy can therefore invalidate the reference.

If Combine Files is asked to create HTML in an unrelated folder for which Memora cannot establish a valid relative relationship to the audio source, the generated HTML does not expose an audio-playback control. This avoids displaying a control that is known not to have a valid source.

## 14.2 Suppressing audio playback on iPhone/touch devices

A separate issue arose during testing: external audio references that work from desktop browsers are not reliably playable when standalone HTML is opened from the iPhone Files application in Safari.

Rather than allowing a nonfunctional audio player to appear on iPhone, the generated HTML uses progressive enhancement.

The generated HTML contains the audio reference as a data attribute rather than immediately assigning it to the `<audio>` element's `src`. The audio control is hidden by default.

When JavaScript runs, Memora checks:

    (pointer: fine) and (hover: hover)

Only when that desktop-style pointer/hover combination is present does Memora enable the audio control. The user initially sees a small play button; when it is activated, the audio source is assigned and the browser's native audio controls are displayed.

On touch/coarse-pointer devices such as the iPhone, the control remains hidden. If JavaScript is unavailable, it also remains hidden.

This means the generated document does not present an apparently usable audio control in an environment where external local-file audio has not been reliably demonstrated.

The decision is deliberately based on observed platform behavior rather than on assuming that iPhone browsers can or cannot play a particular audio format.

## 14.3 Standalone HTML text-size controls

Generated HTML also uses progressive enhancement for reading-size controls.

With JavaScript available, the reader receives a continuous slider from 12px through 32px.

Without JavaScript, the document provides a CSS-only fallback with discrete choices:

- 12px
- 16px
- 20px
- 24px
- 28px
- 32px

The default is 16px. A small `A` appears at the left and a large 32px `A` at the right.

The fallback uses radio inputs and the CSS `:has()` selector on a common reader container rather than depending on JavaScript.

### Development and testing history

This fallback was not the first implementation attempted. Several rounds of testing were required because standalone HTML opened from the iPhone Files application behaves differently from an ordinary web page.

The testing established the following:

1. A normal JavaScript slider works in desktop browsers.
2. Opening the generated HTML directly from Files on iPhone Safari did not provide sufficiently reliable JavaScript behavior for the reader controls.
3. Fragment/link-based approaches were tested and were not reliable in that standalone iPhone context.
4. A CSS-only approach was then tested independently in a minimal standalone HTML file.
5. CSS radio buttons combined with `:has()` successfully changed the transcript font size in iPhone Safari without JavaScript.
6. The same fallback was then incorporated into the generated HTML.
7. A further interaction between the fallback's default checked radio button and the JavaScript slider was discovered: the checked CSS rule could override the slider's font-size variable even when JavaScript was running.
8. The solution was to clear the fallback radio-button checked states when JavaScript initializes the normal slider.
9. The inner JavaScript template literals also required careful escaping in `html.js`, because the generated HTML itself is constructed inside an outer JavaScript template literal. Without that escaping, `${...}` expressions were evaluated while generating the HTML source and caused a JavaScript syntax/import failure.
10. The final implementation was tested with the 32px option on iPhone and with the continuous slider in desktop Edge.

The result is a deliberately layered design:

- desktop/normal browser → continuous JavaScript slider
- standalone iPhone HTML with restricted JavaScript → CSS-only size buttons
- 16px → default
- 32px → available specifically for comfortable iPhone reading

No external stylesheet is required for these generated HTML controls; the required CSS and JavaScript are embedded in the standalone document.

# 15. Combine Files Is Deliberately Separate

A significant architectural decision is that combining files should not happen automatically as part of transcription.

Reasons:

- Individual transcript files are durable source material.
- New transcript files may be added at any time.
- A combined document should be regenerable from the current collection.
- Users may want to combine files without performing any transcription.
- Users may want different sort orders.
- The combined output is a derived artifact rather than the authoritative source.

Therefore:

    Transcription
        → individual transcript files

and separately:

    Existing transcript files
        → Combine Files
        → combined TXT
        → combined HTML

This separation is a core design decision.

---

# 16. Decisions Rejected or Deferred

## Automatic batch output after transcription

A previous design considered automatically creating a combined TXT and HTML file after every transcription batch.

This was rejected.

The reason is that combining should be an independent operation that can operate on the complete collection of existing transcription files.

## `recorder.js`

A recorder module is not needed in Memora because Memora imports existing recordings rather than recording new audio.

## Immediate iPhone-specific rewrite

The application will not be redesigned around iPhone-specific APIs at the expense of the desktop architecture.

Instead, platform differences should be isolated primarily in storage/input/output.

## Immediate iCloud integration

Direct iCloud integration is desirable to explore eventually but is not required for the first implementation.

The initial iPhone workflow can use Apple's Files picker and Share → Save to Files.

---

# 17. Relationship to iMuse

Memora is currently being developed as a standalone project.

The iMuse project has an existing architecture involving:

- `audio.js`
- `recorder.js`
- `whisper.js`
- `whisper-worker.js`

Memora is not intended to modify iMuse at this stage.

However, Memora's architecture should remain compatible with eventual incorporation of useful components or concepts into iMuse.

In particular:

- Memora's audio-processing concepts should remain separable.
- Whisper processing should remain independent of UI.
- Transcription should be represented as structured data.
- Storage should be abstracted.
- Platform-specific functionality should not become entangled with the transcription engine.

The goal is compatibility and future reuse, not immediate code sharing.

---

# 18. Testing History

## Standalone HTML audio-path testing

Audio playback was tested separately before changing the Memora architecture.

The tests progressed through increasingly controlled cases:

- HTML in a combined/transcription folder referencing audio in its parent source folder.
- A test using simulated transcript metadata containing an `Audio Relative Path:` field.
- A minimal same-folder HTML/audio test with no metadata, no JavaScript, and no CSS.
- A separate file-picker test to determine whether iPhone Safari could select an M4A through `<input type="file" accept="audio/*">`.

The results established an important distinction:

- Windows desktop browsers successfully played the external M4A through a relative path.
- iPhone Files/Safari did not provide reliable external local-file audio playback, even in a minimal same-folder test.
- The iPhone file picker also did not reliably expose the M4A as selectable through the standalone HTML file-input test.
- The M4A itself remained playable normally from the iPhone Files application.

The architecture was therefore deliberately **not** changed to embed audio into the HTML. The external relative-path architecture remains the desktop implementation, while the generated HTML suppresses the audio control on touch devices.

A later end-to-end desktop test confirmed that the new Memora implementation works: a newly created transcript containing `Audio Relative Path:` produced a combined HTML document with a working desktop audio control. When HTML was created in a location for which no valid audio relationship could be established, the audio control was correctly omitted.

Only after this desktop behavior was verified was the change committed and tested on iPhone. The iPhone test confirmed that the generated HTML can be opened successfully with the intended text-size fallback while not exposing the unsupported external audio control.

## iPhone file-selection test

A temporary test application was used to verify the iPhone file workflow.

The test demonstrated:

- multiple M4A selection
- M4A metadata extraction
- generation of metadata/transcription-style files
- generation of combined HTML
- successful saving of generated files through the iOS Share → Save to Files workflow

The temporary test project was not intended to become the final Memora implementation.

## Desktop transcription

Memora has already demonstrated browser-based Whisper transcription of M4A recordings.

The application has also demonstrated:

- model selection
- audio decoding
- 16 kHz resampling
- metadata extraction
- individual transcript creation
- destination-folder handling
- recording selection and sorting

---

# 19. Current Refactoring Plan

The current application contains substantial functionality in `app.js`.

The next development stage is continued architectural refactoring and refinement rather than adding a large amount of new functionality at once.

Planned sequence:

1. Keep the current working desktop version stable and commit only after testing.
2. Continue incremental cleanup/refinement of language and operation controls.
3. Add audio links/player support to the generated HTML.
4. Refine the iPhone file/folder structure and workflow around Apple's Files interface.
5. Validate the storage abstraction across desktop and iPhone.
6. Perform cross-platform testing of transcription, output, audio association, and file handling.
7. Explore direct iCloud integration only if it provides a practical advantage.
8. Complete the final architecture and design documentation.

The application should be kept functional after each significant step.

---

# 20. Development Philosophy

Memora should be developed incrementally.

Each architectural change should be:

1. small enough to understand,
2. testable,
3. committed when stable,
4. documented when it represents a meaningful design decision.

The application should not be rewritten wholesale simply because a cleaner architecture is possible.

The goal is to move from the working prototype toward a well-separated architecture while preserving working behavior.

---

# 21. Future Possibilities

The following are intentionally future work rather than current requirements:

- direct iCloud integration
- richer audio association
- audio playback in generated HTML
- segment-level transcript timestamps
- more sophisticated duplicate detection
- searchable transcription library
- native iOS application
- native Android application
- integration of selected Memora architecture into iMuse

These should not drive unnecessary complexity into the current implementation.

---

# 22. Next Development Focus

The next two major areas are:

### 22.1 Audio links — completed

The audio-link enhancement has been implemented using relative path metadata rather than embedding audio in the HTML.

The design preserves the distinction between:

- the transcript as durable text source material
- the original audio as the source recording
- the HTML document as a derived presentation that can optionally connect the two

Desktop HTML can now play the external audio when a valid relative path can be established. The audio control is deliberately suppressed when that relationship cannot be established or when the generated HTML is opened in a touch-oriented environment where local external audio has not been reliably demonstrated.

### 22.2 iPhone file structure

After audio association, the next major task is to refine the iPhone workflow around Apple's Files model.

The objective is to determine a practical file/folder structure that works naturally on iPhone/iPad while remaining compatible with the existing desktop workflow.

The iPhone design should preserve the same conceptual separation:

- source audio
- individual transcript files
- combined outputs
- optional future audio associations

The web application's storage layer should absorb the differences between desktop directory handles and iOS file selection/share behavior rather than forcing the rest of the application to become platform-specific.

Direct iCloud integration remains a later possibility rather than a prerequisite.

# 22. Current Status

Memora has progressed beyond the proof-of-concept stage and has a working desktop transcription and Combine Files workflow.

The current implementation supports:

- importing supported audio files from a source folder
- extracting recording metadata where available
- preserving Apple Voice Memo recording date/time and UUID when present
- selecting Whisper models
- selecting a language and transcription/translation operation
- saving individual timestamped transcription files
- recording the Whisper model in transcript metadata and filenames
- a separate **Combine Files** workflow for existing transcript files
- selecting individual transcript files or all files
- sorting transcripts by recording date or name
- generating combined TXT, DOCX, and HTML output
- choosing a title for combined output and using it for the output filenames
- selecting the output location, including a `Combined` subfolder
- filtering duplicate recordings in combined output in favor of the highest available Whisper model
- adjustable text size in generated HTML
- progressive CSS-only text-size controls for standalone HTML when JavaScript is unavailable
- relative audio-path metadata in individual transcripts
- desktop HTML audio playback through relative external audio references
- suppression of the audio control when a valid audio relationship is unavailable or the environment is touch-oriented
- text-size range of 12px–32px, including a 32px reading option for iPhone
- desktop support for a broader set of common audio extensions, subject to browser/device codec support
- a tested iPhone workflow for selecting multiple M4A files and saving generated files through Share → Save to Files
- explicit transcription/translation operation metadata
- `-eng` filename suffix for translation output only
- independent model selection/provenance for transcription and translation operations
- audio-path metadata and desktop HTML audio association
- optional semantic paragraphing during individual transcription
- optional semantic paragraphing during Combine Files output generation
- paragraphing applied consistently to combined TXT, DOCX, and HTML output
- non-destructive Combine Files paragraphing that leaves individual transcript source files unchanged
- safe reuse of paragraphing on transcripts that are already paragraphized
- Settings area for read-only browser storage accounting
- persistent semantic-index storage reporting
- cached Whisper/MiniLM model storage reporting
- refreshable storage information

The Combine Files milestone has been tested and committed.

The language/operation refinement and standalone HTML text-size progressive enhancement have now been implemented and tested.

The audio-link milestone has now been implemented and tested. Optional paragraphing is now available both during transcription and during Combine Files output generation. The next planned development step remains refinement of the **iPhone file structure/workflow**.

---


# 23. Recent Combine Files Milestone

The **Combine Files** workflow has now become a distinct, working part of Memora rather than only a planned feature.

## 23.1 Individual transcript files remain the source material

The combined document is generated from the saved `.txt` transcription files rather than from the original audio.

This preserves the earlier architectural decision that individual transcription files are durable source material and that combined documents are derived artifacts.

## 23.2 Whisper model provenance

The Whisper model used for each transcription is now preserved in two places:

- the individual transcript's metadata
- the individual transcript filename

The filename convention therefore includes the model, for example:

    2023-06-15 08-40 - Prarabda karma 2 - small.txt

When the same recording exists at multiple model levels, the Combine Files operation can prefer the highest available model so that the combined document does not unnecessarily contain multiple transcriptions of the same recording.

The current model hierarchy is:

    tiny → base → small → medium → large-v3

## 23.3 Sorting

Combine Files provides four sort choices:

- Date — newest first
- Date — oldest first
- Name — A → Z
- Name — Z → A

A design correction was made after testing showed that filename ordering was not sufficient to guarantee chronological ordering. The recording date stored inside each transcript is now treated as the authoritative date for date sorting.

The displayed transcript list and the generated combined output are intended to use the same ordering.

## 23.4 Output destinations

The Combine Files workflow now follows the same destination concept used by transcription:

- Use Source Folder
- Create/use a `Combined` folder
- Browse for Another Folder

The `Combined` folder is created as a subfolder of the selected Text Source folder when needed.

## 23.5 Combined document presentation

The combined TXT format was refined so that the transcription belongs to its metadata rather than being separated from it by a divider. A solid divider separates one recording entry from the next.

The generated HTML follows the same conceptual structure and is intended as a readable document rather than merely a formatted copy of the TXT file.

The HTML now includes adjustable text sizing without requiring the document to be regenerated.

### Progressive enhancement for standalone HTML

The text-size control was deliberately designed as a progressive enhancement because generated HTML may be opened directly from the iPhone Files application in Safari, where JavaScript behavior can be restricted.

When JavaScript is available:

- the continuous text-size slider is displayed;
- the reader can select any size from 12px through 32px;
- the current size is displayed beside the slider.

When JavaScript is unavailable:

- a CSS-only fallback is displayed;
- discrete buttons provide 12, 16, 20, 24, 28, and 32px;
- 16px is the default;
- a small `A` appears on the left and a large 32px `A` on the right.

The fallback uses CSS radio buttons and `:has()` rather than JavaScript. This was tested successfully when the generated HTML was opened directly from iPhone Files in Safari.

The 32px option was added specifically to make reading on an iPhone more comfortable without reading glasses.

## 23.6 Accessibility and visual hierarchy

The interface was refined with accessibility in mind, including the user's protanopia. Tabs and ordinary action buttons are deliberately differentiated by more than color alone, using different visual treatments and hierarchy.

Destination buttons also have a visible selected state so the currently active output destination is apparent without relying only on text or color.

## 23.7 Development milestone

The Combine Files workflow and its presentation refinements were tested and committed as a stable milestone.

The next changes should continue to be incremental and should avoid disturbing the now-working transcription workflow.

# 24. Paragraphing Architecture and User Functions

Memora now has two user-facing places where the same semantic paragraphing capability can be requested. Both use the shared `paragraphing.js` module and the same established Hybrid Paragraph Test 2 algorithm. The difference is **when the paragraphing is applied and whether the individual transcript files are changed**.

## 24.1 Transcription — Create paragraphs

The **Transcription** tab has a **Create paragraphs** checkbox alongside the transcription controls.

When selected, the workflow is:

    Audio recording
        ↓
    metadata extraction
        ↓
    audio processing
        ↓
    Whisper transcription
        ↓
    optional `paragraphize()`
        ↓
    individual transcript file

In this mode, paragraphing is applied to the fresh Whisper transcript before the individual `.txt` file is saved.

Therefore:

- the saved individual transcript contains the paragraph breaks;
- the paragraphized transcript becomes part of the durable source material;
- the original audio is not modified;
- the paragraphing model is loaded only when the option is selected.

If the checkbox is not selected, the Whisper transcript is saved without this additional paragraphing stage.

## 24.2 Combine Files — Create paragraphs

The **Combine Files** tab has a separate **Create paragraphs** checkbox positioned directly below the combined document title and above the three output buttons.

When selected, the workflow is:

    selected transcript files
        ↓
    read transcript records
        ↓
    sort records
        ↓
    select highest-model records
        ↓
    optional `paragraphize()` on each selected transcript
        ↓
    combined TXT / DOCX / HTML

In this mode, paragraphing is an **output-stage transformation**.

The individual `.txt` files are not rewritten. Instead, Memora creates an in-memory version of each selected record with the paragraphized transcript text and sends those processed records to the requested output generator.

This allows the same source collection to be combined either with or without paragraphing.

## 24.3 One paragraphing engine, two entry points

These two controls deliberately do not represent two different paragraphing systems.

Both call:

    paragraphing.js
        ↓
    `paragraphize()`

The distinction is the surrounding workflow:

    Transcription:
    Whisper → paragraphize → save individual transcript

    Combine:
    read existing transcript → paragraphize → create combined output

This keeps the paragraphing algorithm in one place and avoids maintaining separate versions of the semantic paragraphing logic.

The existing `paragraphizeTranscript()` function remains available for the future workflow of paragraphizing complete existing transcript files while preserving their metadata. It is not required by either of the two current user-facing paragraphing controls.

## 24.4 Why both functions are useful

The two controls serve different practical needs.

**Create paragraphs during Transcription** is appropriate when the user wants the individual transcript files themselves to contain the paragraph structure.

**Create paragraphs during Combine Files** is appropriate when the user wants to leave the individual transcript files untouched but wants a particular combined document to have paragraph structure.

This distinction preserves the project's central principle that individual transcript files are durable source material while combined documents are derived outputs.

It also means that paragraphing does not have to be decided permanently when a recording is first transcribed. A later Combine Files operation can still apply the same paragraphing algorithm to the existing collection.

## 24.5 Re-paragraphing existing paragraphized transcripts

The Combine Files function does not need to determine whether an input transcript has already been paragraphized.

Testing with the earlier batch-paragraphized corpus established that applying the paragraphing process again preserves the existing paragraph structure rather than destroying it.

This permits a simple workflow:

- unparagraphized transcripts can be paragraphized during Combine;
- already paragraphized transcripts can also be passed through the same function;
- no paragraph-state metadata or detection heuristic is required.

This is consistent with the project's preference for avoiding additional layers of complexity when the existing algorithm already behaves safely.

# 24.1 Latest Development Milestone: Optional Paragraphing in Combine Files

The Combine Files workflow has been extended so that paragraphing can be applied at the point where combined documents are created.

This is intentionally an **output-stage transformation**, not a change to the durable individual transcript files.

## 24.1.1 User interface

The Combine Files tab now places a **Create paragraphs** checkbox:

1. directly below **Combined document title**
2. directly above the three combined-output buttons

The three output choices remain:

- Create Combined TXT
- Create Combined DOCX
- Create Combined HTML

The checkbox is independent of the transcription-tab paragraphing control. The transcription control affects newly generated individual transcripts; the Combine Files control affects only the combined output being created.

This preserves a simple mental model:

- **Transcription → Create paragraphs**: paragraph the individual transcript being saved.
- **Combine Files → Create paragraphs**: paragraph the transcript text used for the combined document, without modifying the source `.txt` files.

## 24.1.2 Combine processing sequence

The normal Combine Files pipeline remains intact:

    selected transcript files
            ↓
    readTranscriptFiles()
            ↓
    sortTranscriptRecords()
            ↓
    selectHighestModelRecords()
            ↓
    output generation

When **Create paragraphs** is checked, one additional stage is inserted after the records have been selected:

    selected transcript files
            ↓
    readTranscriptFiles()
            ↓
    sortTranscriptRecords()
            ↓
    selectHighestModelRecords()
            ↓
    optional paragraphize() for each selected record
            ↓
    TXT / DOCX / HTML output

This placement is deliberate.

Paragraphing occurs only after Combine Files has determined which transcript records actually belong in the combined document. Therefore:

- duplicate recordings are resolved first;
- the highest-model selection remains unchanged;
- the established sort order remains unchanged;
- the same paragraphized records can be used by all three output formats.

The paragraphing operation does not perform transcription and does not reread or modify the original audio.

## 24.1.3 Source files remain unchanged

A major design decision is that Combine Files paragraphing is **non-destructive**.

If the user selects **Create paragraphs**, Memora does not rewrite the individual `.txt` transcript files.

Instead, it creates an in-memory processed version of each selected `TranscriptRecord` and passes those records to the requested output generator.

This preserves the original individual transcripts as durable source material while allowing different combined documents to be generated with or without paragraphing.

For example, the same source collection can produce:

- a combined TXT without paragraphing;
- a combined TXT with paragraphing;
- a combined DOCX with paragraphing;
- a combined HTML without paragraphing;

without changing the underlying transcript files.

## 24.1.4 Existing paragraphized transcripts

The Combine Files paragraphing option was deliberately designed so that it does not need to determine whether a transcript has already been paragraphized.

Testing with the previously batch-paragraphized transcript corpus established that running the paragraphing process again preserves the existing paragraph structure rather than destroying it.

This is important because transcript collections may contain a mixture of:

- older transcripts that have already been paragraphized;
- newly generated transcripts without paragraph breaks;
- transcripts that have been paragraphized by an earlier batch process.

The Combine Files workflow can therefore apply the same paragraphing operation uniformly rather than introducing a separate detection system.

This avoids another layer of state or heuristic detection and follows the project's general preference for keeping the system simple.

## 24.1.5 Metadata and separator preservation

Combine Files continues to parse the established individual transcript format.

The paragraphing operation is applied to the transcript body represented by the `transcript` field of the structured record. It does not paragraphize or alter the metadata block.

Consequently, the following remain properties of the individual record:

- original filename
- recording date
- file date when available
- duration
- Voice Memo ID when available
- Whisper model
- operation
- original language when relevant
- Audio Relative Path when available

The existing Combine Files separator handling is also unchanged.

A previous batch-paragraphing experiment exposed an important compatibility issue: an older paragraphized corpus had used a 20-hyphen metadata separator, while normal Memora transcript files use the established 50-hyphen separator. The old corpus was subsequently regenerated with the normal 50-hyphen separator. The paragraph structure survived that correction, and Combine Files then worked normally.

The resulting decision is that paragraphing itself should not introduce another transcript-file format. The existing individual transcript format remains authoritative.

## 24.1.6 All three output formats use the same processed records

The paragraphing operation is performed before the output-type branch.

Therefore the same paragraphized transcript records feed:

    TXT
      ↓
    combineTranscriptRecords()

    DOCX
      ↓
    createCombinedDOCX()

    HTML
      ↓
    createCombinedHTML()

This avoids implementing three independent paragraphing mechanisms.

It also means that paragraph boundaries are consistent across TXT, DOCX, and HTML generated from the same Combine Files operation.

## 24.1.7 Progress reporting

Paragraphing can be substantially more expensive than simply reading transcript files because it loads the local semantic model and computes sentence embeddings.

The Combine Files status area therefore reports paragraphing progress while it is occurring.

The user can see which selected transcript is currently being processed, for example:

    Creating paragraphs for 1 of N: filename

The paragraphing module also reports semantic-model loading and sentence-analysis progress through the existing status callback.

This makes the additional processing visible rather than leaving the user with an apparently stalled Combine Files operation.

## 24.1.8 Model reuse and optional resource cost

Paragraphing remains optional.

If the checkbox is not selected:

- the paragraphing module is not needed;
- the MiniLM model is not loaded;
- Combine Files follows the existing path with no semantic-analysis overhead.

If the checkbox is selected:

- `paragraphing.js` is loaded lazily;
- the MiniLM model is loaded when first needed;
- the model is cached and reused for subsequent transcripts in the same page session.

This is consistent with the existing desktop batch-processing philosophy: expensive local models should be loaded only when the user explicitly requests the corresponding function.

## 24.1.9 No change to combine.js

The Combine Files parser and record-processing module remains unchanged.

This is an intentional architectural boundary.

`combine.js` continues to be responsible for:

- reading transcript files;
- parsing their metadata and transcript body;
- creating structured records;
- sorting records;
- selecting the highest available model records;
- providing records to the output layer.

Paragraphing is a transformation of the transcript text after those responsibilities have been completed. It therefore belongs in `paragraphing.js` and is orchestrated by `app.js`.

This avoids making `combine.js` responsible for a semantic text-processing task that is also needed independently by the transcription workflow and may later be used for an explicit **Paragraph existing transcripts** operation.

## 24.1.10 Architectural rationale

The new Combine Files option reinforces several existing Memora design principles:

1. **Individual transcript files remain the source material.**
2. **Combine Files remains a derived-output operation.**
3. **Paragraphing remains a reusable independent module.**
4. **Output formats do not contain their own paragraphing logic.**
5. **Existing sorting and duplicate/model-selection behavior is preserved.**
6. **Paragraphing is optional because of its additional model and computation cost.**
7. **Already-paragraphized transcripts do not require special detection.**
8. **No new paragraphing heuristics are introduced merely to support Combine Files.**
9. **The same processed record can feed TXT, DOCX, and HTML.**
10. **The change is intentionally small and localized to the UI/orchestration layer.**

The resulting architecture is:

    Individual transcript files
              ↓
        Combine Files
              ↓
       record selection
              ↓
       optional paragraphing
              ↓
       structured records
          ↙    ↓    ↘
        TXT   DOCX   HTML

This preserves the separation between source data, processing, and presentation.

# 24. Latest Development Milestone

The audio-format work expanded Memora beyond an M4A-specific workflow.

The application now treats the source as audio rather than specifically as M4A, while retaining Apple-specific metadata extraction when that metadata is actually present. The metadata display distinguishes recording date from file date and does not invent a source classification.

The application architecture continues to treat iPhone support as a storage/input/output problem rather than a reason to duplicate the transcription system.

The immediate next milestone is audio association in generated HTML. Once that is stable, attention will move to the practical iPhone file structure and workflow.

# 25. Latest Development Milestone: Operation Metadata and Accessible HTML Controls

Two refinements were completed after the previous milestone.

## 25.1 Transcription versus translation

Memora now records the selected operation explicitly in each transcript's metadata:

- `transcribe`
- `translate`

The filename convention adds `-eng` only to translation output.

The operation is stored as metadata rather than inferred from the filename. Combine Files therefore has a reliable source for distinguishing transcription from translation.

For recordings that have both versions, operation is part of the recording identity for model-selection purposes, allowing the best available Whisper model to be selected independently for each operation.

## 25.2 Standalone HTML text-size progressive enhancement

Generated HTML now supports two levels of text-size control.

With JavaScript, the reader receives a continuous slider from 12px to 32px.

Without JavaScript, the reader receives CSS-only size buttons. This is important because standalone HTML opened directly from iPhone Files in Safari does not always execute JavaScript in the same way as a normal web page.

The CSS fallback was tested successfully on iPhone Safari. The normal slider was tested successfully in Edge and desktop browsers.

The fallback design uses:

- a small `A` at the left;
- discrete size buttons;
- 16px as the default;
- a large 32px `A` at the right.

The 32px option was added specifically for comfortable iPhone reading without reading glasses.

These controls are implemented entirely in `html.js`; no external stylesheet is required, preserving the portability of the generated standalone HTML document.

---

# 26. Latest Development Milestone: Relative Audio Association and Progressive HTML Playback

The HTML/audio association milestone was completed after a series of isolated tests designed to distinguish browser security/file-system behavior from Memora's own implementation.

## 26.1 Relative audio metadata

Individual transcripts can now preserve an `Audio Relative Path:` metadata field. Combine Files carries that field into its structured records and adjusts it for the location of the generated combined HTML.

This allows desktop HTML to reference the original recording without embedding the audio file.

The implementation intentionally does not claim support for arbitrary unrelated source and destination folders. A relative path is generated only when the File System Access API can establish the relevant folder relationship.

## 26.2 Audio-control suppression

Because external local-file audio was not reliably playable from standalone HTML opened through iPhone Files/Safari, the generated HTML does not show a misleading play button on iPhone.

The control is hidden by default. JavaScript enables it only when the environment reports a fine pointer and hover capability. The audio `src` is not assigned until the desktop user activates the play button.

This also means that an HTML document created without a valid audio relationship contains no usable audio control.

## 26.3 Testing before architectural commitment

The audio implementation was preceded by minimal standalone tests rather than immediately changing Memora.

Tests included:

- relative-path audio from a nested `transcription/combined` directory
- metadata-driven relative paths
- a minimal same-folder HTML/audio test
- a minimal iPhone file-input test
- desktop Windows tests using both ordinary folders and iCloud Drive

These tests established the desktop behavior and the iPhone limitation sufficiently to justify keeping audio external rather than embedding it.

The successful final test then confirmed that a newly generated Memora transcript carries the path metadata, Combine Files reconstructs the appropriate HTML reference, and the desktop audio control works.

## 26.4 Resulting architectural decision

Keep original audio external.

Do not embed audio into generated HTML merely to accommodate an unproven iPhone local-file playback path.

The relative-path metadata remains part of the durable transcript design. Future iPhone work should first determine whether a different delivery mechanism—rather than embedded audio—is able to provide reliable playback before revisiting this decision.


---

# 28. Latest Development Milestone: Metadata Stability and Resource Reduction

The metadata reader was optimized after iPhone stability testing revealed that the original implementation was unnecessarily memory-intensive.

## 28.1 Problem observed during iPhone transcription

The original metadata workflow loaded the entire MP4/M4A file into memory and then created a full-file decoded text representation in order to search for the Apple Voice Memo UUID.

This was especially significant on iPhone because Memora was already loading and processing substantial audio/model resources. The full-file text conversion created another potentially large memory allocation even though only a small amount of metadata was required.

During the broader iPhone stability investigation, several transcription crashes were observed. A controlled metadata experiment that removed the full-file `TextDecoder` step produced a major improvement: batches containing multiple recordings of roughly 1.5–2 minutes and a single recording of approximately 15 minutes completed successfully, including optional paragraphing.

The result did not prove that metadata processing was the only source of instability, but it provided strong evidence that unnecessary whole-file memory allocation was contributing materially to resource pressure.

## 28.2 Direct byte search instead of full-file text decoding

The Voice Memo UUID is now located without converting the entire file into a JavaScript string.

The optimized approach:

1. Reads the MP4/M4A structure needed for metadata.
2. Uses MP4 box/header information to locate the relevant metadata fields.
3. Searches bounded byte ranges directly for the Voice Memo UUID pattern.
4. Avoids creating a full decoded text copy of the complete recording.

This preserves the required metadata while substantially reducing temporary memory pressure.

## 28.3 Bounded MP4/M4A metadata reading

The metadata reader was subsequently taken further so that it no longer needs to treat the complete audio file as one large metadata buffer.

The implementation reads the required MP4/M4A box/header information, including the movie-header information used for duration/timescale, and examines only bounded regions where the required metadata is expected.

The design goal is now:

> Read only the bytes needed to answer the metadata question.

This is preferable to reading and decoding a complete recording simply to obtain a small amount of embedded metadata.

## 28.4 Cross-device testing

The optimized metadata reader was tested with real iPhone recordings and with a Samsung recording.

The resulting behavior was reported as working correctly on both the user's Windows PC and iPhone under a range of test conditions.

The metadata milestone is therefore considered complete for the current architecture.

## 28.5 Architectural consequence

Metadata extraction is now treated as a resource-sensitive operation rather than merely a parsing problem.

This reinforces a broader Memora principle:

- avoid whole-file conversions when a bounded read can provide the same information;
- minimize temporary duplicate representations of large recordings;
- preserve the metadata model while reducing the memory cost of obtaining it.

This change was deliberately confined to `metadata.js`; the higher-level transcription architecture did not need to change.

---

# 29. Latest Development Milestone: iPhone File-System and Save Workflow

The iPhone file-writing work established a practical browser-based output strategy without requiring Safari to provide a writable destination directory handle.

## 29.1 The platform constraint

Desktop Memora can use the File System Access API to select a directory and write files directly into it.

iPhone Safari does not provide the same general-purpose writable directory workflow. A desktop-style destination-folder abstraction therefore cannot simply be copied to iPhone.

The design decision was to keep the core transcription/storage concepts platform-independent while using an iPhone-specific input/output mechanism.

## 29.2 Selected iPhone strategy

The chosen strategy is:

1. Select recordings through the iPhone file-input workflow.
2. Transcribe them normally.
3. Store each completed transcript in Memora's IndexedDB safety layer.
4. Keep the completed transcript files in an in-memory export queue.
5. After the batch is complete, use the iOS share sheet to let the user choose the actual Files destination.
6. Save the shared transcript files through **Share → Save to Files**.

The user therefore chooses the physical Files location only when the completed batch is ready to be saved.

This avoids pretending that Memora has a writable iPhone folder handle when it does not.

## 29.3 IndexedDB as a safety/recovery layer

The iPhone workflow does not depend solely on the share sheet.

Each completed transcript is first saved through `storage.saveTranscriptRecord()` into the existing Memora IndexedDB store.

The conceptual separation is therefore:

    transcription
        ↓
    durable IndexedDB transcript record
        ↓
    iPhone export file
        ↓
    Share → Save to Files

The browser-side stored record acts as a safety layer during the batch. The user does not have to keep the Files save dialog open while transcription is occurring.

Audio itself is not stored in IndexedDB as part of this workflow.

## 29.4 iPhone destination UI

The iPhone Destination area was initially implemented with a separate **Select iPhone Files as Destination** button. Testing showed that this did not actually select a folder; it only established an application state.

The workflow was subsequently simplified.

For a source selected through the iPhone file-input path:

- the desktop destination choices are hidden;
- the iPhone output controls are shown automatically;
- no separate destination-selection button is required;
- the actual Files location is selected only when the user saves the completed batch.

This keeps the interface aligned with what the destination control actually does.

## 29.5 File naming and duplicate handling

The existing transcript naming convention remains in effect on iPhone.

The filename incorporates:

- recording date when available;
- original recording filename;
- Whisper model;
- `-eng` when the operation is translation.

On iPhone, Memora does not try to determine whether the eventual Files destination already contains a file with the same name. The actual physical destination is chosen later through the iOS share sheet, so filename conflict handling is left to the Files workflow rather than duplicated inside Memora.

This keeps the iPhone implementation faithful to the actual platform workflow: Memora creates the intended filename, and iOS Files handles the physical save.

## 29.6 Final iPhone transcript export-batch behavior

The iPhone workflow uses an in-memory `pendingIPhoneExports` queue for transcripts completed in the current transcription batch.

The state progression is:

    new transcription batch
        ↓
    no pending export files

    each transcript completes
        ↓
    transcript saved to IndexedDB
        ↓
    File object added to pendingIPhoneExports

    batch completes
        ↓
    Save N Transcripts to Files

    user taps Save
        ↓
    iOS share sheet
        ↓
    Share → Save to Files

After a successful share, the generated `File` objects remain available in the current batch. The Save button therefore remains usable for another share operation, rather than being disabled or clearing the queue immediately. This allows the same completed batch to be saved again to another Files location if needed.

The status line records the completed share, while the button continues to identify the operation as saving the current batch.

Starting a new transcription batch resets the pending export queue. Changing the Whisper model or the paragraphing choice also resets the pending export state because those choices change the resulting transcript files.

The browser's IndexedDB transcript record remains separate from the physical Files copy. IndexedDB acts as a browser-side safety/recovery layer; the Files copy is the user's durable external archive.

## 29.7 Removal of the unwanted extra text file

An iPhone-specific problem was identified in which an additional text file containing:

    Memora transcripts

was created during the share operation.

The cause was the `title: "Memora transcripts"` property supplied to `navigator.share()`.

The share call was changed to provide the transcript files without that title.

Testing then confirmed that the unwanted extra `.txt` file no longer appeared.

This is an important example of keeping the browser-generated export payload minimal: the share operation should contain the files that are intended to be saved, not additional metadata that can be interpreted as an exportable document by the receiving interface.

## 29.8 Desktop destination behavior remains separate

The desktop workflow remains based on actual directory handles and direct file writing.

The three desktop transcription destinations remain:

- Use Source Folder
- Create/use `transcription` Subfolder
- Browse for Another Folder

When the user browses to an unrelated destination, the button now changes from:

    Browse for Another Folder

to:

    Use "Folder Name"

This makes the current selected destination visible in the control itself.

The desktop file-writing mechanism was not replaced by the iPhone share mechanism.

## 29.9 Why the two workflows should remain separate

The current design deliberately treats iPhone output as a different storage/UI implementation rather than forcing the entire application to use a lowest-common-denominator file API.

Conceptually:

    Desktop:
    directory handle
        ↓
    direct file write

    iPhone:
    IndexedDB safety record
        ↓
    in-memory export File objects
        ↓
    iOS share sheet
        ↓
    Save to Files

The transcription, metadata, naming, and transcript-format layers remain shared.

The platform difference is isolated to input/output behavior.

---

# 30. Stability Lessons from the iPhone Transcription Investigation

The metadata optimization and file-system work occurred within a broader effort to make long-running iPhone transcription practical.

Several lessons are now considered part of the design record.

## 30.1 Avoid unnecessary large object creation

The strongest confirmed stability improvement came from eliminating the full-file `TextDecoder` allocation in metadata processing.

This supports treating memory allocation patterns as part of the application's platform design, particularly on iPhone.

## 30.2 Keep heavy processing separated

Whisper processing uses a worker on iPhone. Audio is converted to the format required by Whisper rather than passing browser-specific audio objects through the worker.

Optional paragraphing remains a separate lazy-loaded operation.

The metadata reader is likewise separated from transcription and now minimizes the amount of data it materializes.

## 30.3 Test changes independently

Several iPhone stability experiments demonstrated that combining unrelated changes made it difficult to identify the cause of a crash or regression.

The development procedure therefore remains:

1. establish a known working baseline;
2. change one architectural or behavioral area;
3. test it on both relevant platforms;
4. keep the change only when the observed behavior supports it.

This procedure is now considered especially important for iPhone work, where browser/resource behavior can be sensitive to the current WebKit process state.

## 30.4 Do not infer platform limitations too quickly

The iPhone experiments showed that failures were sometimes intermittent and depended on the current resource state.

For example, Tiny, Base, and Small models did not behave as though there were one simple fixed audio-duration limit. Short recordings could sometimes succeed while another run failed, and later clean runs could succeed again.

Similarly, iPhone translation was eventually demonstrated successfully with Small using Auto-detect and Translate in a multi-file batch.

The design conclusion is to distinguish:

- confirmed architectural limitations;
- observed resource pressure;
- intermittent browser/process behavior;
- and features that are actually unsupported.

This avoids unnecessarily redesigning the application based on one failure.

---

# 31. Current iPhone File/Folder and Audio Metadata Model

The physical organization remains conceptually:

    audio/
    transcription/
    combined/

The important change is that Memora now uses the existing **Audio Relative Path:** metadata field for both desktop and iPhone, but the value has a deliberately different meaning on the two platforms.

## 31.1 Desktop transcription metadata

On desktop, Memora has directory handles for the audio source and transcription destination. It therefore calculates the genuine relative path from the individual transcript file to the original recording.

Examples include:

    Audio Relative Path: ../recording.m4a

or, depending on the destination hierarchy:

    Audio Relative Path: ../../recording.m4a

The value is an actual relative filesystem path, not merely the recording filename.

## 31.2 iPhone transcription metadata

The iPhone file-input workflow does not establish the same persistent directory relationship between the selected audio and the later Files destination. Memora therefore does not invent a relative folder path.

Instead, newly generated iPhone transcripts store:

    Audio Relative Path: recording.m4a

In the iPhone case, the field is therefore a filename reference to the original recording rather than a calculated directory traversal.

This keeps one common metadata field across both platforms while preserving the important distinction between:

- a genuine desktop-relative path;
- an iPhone filename reference.

No second `Audio Filename:` field is required.

## 31.3 Why the iPhone filename reference is useful

The original audio filename is the stable correspondence key available to the iPhone workflow.

When users organize their Files folders into a conventional hierarchy, the filename can be resolved by the generated HTML without requiring Memora to have known the eventual destination during transcription.

The design also keeps the audio external. Memora does not copy or embed the M4A into each transcript or combined HTML document.

## 31.4 Backward compatibility with older transcripts

Older transcript files created before the iPhone `Audio Relative Path:` field was added may have no audio-path metadata at all.

This is not a format-breaking condition.

The HTML generator uses the audio-relative-path value when present, but falls back to the transcript's original recording filename when it is absent:

    record.audioRelativePath || record.recordingFilename

Consequently, an older transcript can still produce a working audio control on desktop when the original recording can be reached by the generated filename-based relative search.

A tested older iPhone transcript with no `Audio Relative Path:` field was therefore still able to generate HTML whose audio played successfully on the PC. This confirms that adding the metadata field improved explicit path information without making older transcript files unusable.

## 31.5 HTML path handling

The generated HTML carries the chosen audio reference in a `data-src` attribute rather than immediately assigning it to the `<audio>` element.

For a transcript with an explicit relative path, the stored path is tried first.

For a filename-only reference, the generated HTML can try the filename relative to the HTML document and then parent/grandparent locations:

    recording.m4a
    ../recording.m4a
    ../../recording.m4a

This allows an iPhone-produced transcript whose audio reference is only the filename to work naturally when the HTML and audio are arranged in the expected nearby folder structure.

On desktop, when Combine Files has a genuine `Audio Relative Path:` and a known relationship between the Text Source and combined-output folder, `app.js` adds the required prefix for the combined HTML's location. Thus the HTML receives the path appropriate to where that combined document actually resides.

## 31.6 iPhone combined HTML

For iPhone Combine Files, there is no destination folder handle from which Memora can calculate a new path prefix. The existing `Audio Relative Path:` value carried by the transcript record is therefore passed directly into the HTML generator.

This is appropriate for the iPhone filename-based reference because the physical placement of the eventual HTML file is chosen through **Share → Save to Files**.

The HTML generator itself remains platform-independent; only the path information available to it differs.

This architecture avoids coupling HTML generation to either desktop directory handles or iPhone share-sheet behavior.

# 32. Current Status After Today's Work

The current Memora architecture now has a tested desktop and iPhone workflow for transcription and Combine Files.

The current iPhone workflow supports:

- selecting multiple recordings through the iPhone file-input mechanism;
- extracting available recording metadata;
- local Whisper transcription;
- optional semantic paragraphing;
- storing completed transcript records in IndexedDB;
- preserving the original audio filename in the `Audio Relative Path:` metadata field;
- preparing transcript `File` objects for export;
- saving a completed transcript batch through the iOS share sheet and **Save to Files**;
- repeatedly sharing the same completed transcript batch during the current batch state;
- generating a single selected Combine Files output format (TXT, DOCX, or HTML) in memory;
- sharing that combined file through the iOS share sheet;
- changing the selected Combine format, title, paragraphing choice, or effective transcript selection and thereby returning the iPhone combine export state to a fresh pending state.

The current audio-association architecture supports:

- genuine desktop-relative audio paths in individual transcript metadata;
- filename-based audio references in iPhone-generated transcripts;
- propagation of audio references from individual transcripts into Combine Files structured records;
- adjustment of genuine desktop-relative paths when a combined HTML file is created deeper in the source hierarchy;
- filename fallback for older transcripts that lack an `Audio Relative Path:` field;
- external audio playback without embedding the original audio into the HTML.

The standalone generated HTML continues to use the previously established progressive-enhancement design for text-size controls and touch-oriented audio behavior.

The current desktop and iPhone storage approaches remain intentionally different while sharing the same transcription/data architecture.

The collapse/expand controls added to the recording and transcript lists are a UI usability refinement rather than an architectural milestone. They are therefore not treated as a separate architectural section in this journal.

The next development should continue incrementally, with the current transcription, iPhone save, Combine Files, and audio-association behavior treated as the working baseline.

# 33. Journal Update Policy


This document is a living design journal.

When a significant architectural or workflow decision is made, it should be added here with:

- the decision
- the reason
- important alternatives considered
- whether the decision is final, provisional, or deferred

At major milestones, the version/status at the top of this document should be updated.

The final version should provide a coherent record of how Memora evolved, not merely a list of code changes.

---

# 34. Latest Development Milestone: Final iPhone Combine Save and Unified Audio Reference

The iPhone Combine Files workflow is now considered functionally complete for the current browser architecture.

## 34.1 One selected output format

The iPhone interface presents a single format selector:

- TXT
- DOCX
- HTML

The user chooses one format and presses the corresponding **Save … to Files** action.

Memora generates only that selected combined file in memory and passes it to the iOS share sheet.

The core Combine Files processing remains shared with desktop:

    selected transcript files
        ↓
    read transcript records
        ↓
    sort records
        ↓
    select highest-model records
        ↓
    optional paragraphing
        ↓
    output generator

Only the final storage/output mechanism differs.

## 34.2 Share-sheet output instead of a destination folder

On desktop, the combined file is written directly through a selected directory handle.

On iPhone, the browser does not receive an equivalent writable destination directory handle for this workflow. The selected combined output is therefore represented as a browser `File` object and passed to:

    navigator.share({
        files: [file]
    })

The physical destination is chosen by the user through the iOS share sheet and **Save to Files**.

The share payload deliberately contains the intended file itself and does not include a separate share title that could be interpreted by the receiving interface as another file.

## 34.3 Repeatable iPhone Combine sharing

The generated combined file remains in `pendingIPhoneCombineExport` after a successful share.

This was chosen deliberately so that a user can save the same combined document again without regenerating it.

The status line reports the completed share, while the button remains associated with the current output file.

The pending combined output is reset when the effective output changes, including:

- format;
- combined title;
- paragraphing choice;
- selected transcript set;
- sorting changes that cause the processed record set to be regenerated.

This establishes a simple rule: the button represents the currently generated combined output, and a material change to that output starts a new pending state.

## 34.4 Unified audio metadata field

The `Audio Relative Path:` field is now the common audio-reference field for both platforms.

Its semantics are intentionally platform-aware:

    Desktop:
    Audio Relative Path: ../recording.m4a

    iPhone:
    Audio Relative Path: recording.m4a

The desktop value represents a genuine relative filesystem path determined from directory handles.

The iPhone value represents the original audio filename because the eventual Files destination is not known when the transcript is created.

This design avoids proliferating platform-specific metadata fields while still preserving the information actually available on each platform.

## 34.5 HTML generation from the common record

Combine Files reads `Audio Relative Path:` into the structured transcript record.

For desktop combined HTML, the application can add an additional relative prefix based on the relationship between the Text Source folder and the combined-output folder.

For iPhone combined HTML, the existing reference is passed directly because the eventual output location is selected later through Files.

The HTML renderer itself remains unaware of whether a record originated on desktop or iPhone.

It receives an audio reference and creates a deferred audio control around that reference.

The generated standalone HTML therefore remains portable at the presentation layer.

## 34.6 Fallback for legacy transcripts

A transcript created before the iPhone filename metadata was introduced may contain no:

    Audio Relative Path:

field.

Such a transcript is still usable because the HTML generator falls back to the original recording filename.

This makes the metadata change backward-compatible at the HTML layer.

The observed result is important: an older iPhone-generated transcript without the new metadata field was combined into HTML and the corresponding recording still played successfully on the PC. The newer metadata is therefore an explicit improvement in provenance/path information, not a requirement for historical transcript files to remain usable.

## 34.7 Design conclusion

The final architecture keeps three concerns separate:

    transcript metadata
        ↓
    structured record
        ↓
    HTML rendering

The transcript records the audio reference that Memora actually knows.

Combine Files preserves that information.

The HTML generator resolves it according to the location context available at generation time.

This avoids embedding the original audio, avoids requiring iPhone to simulate a desktop filesystem, and retains compatibility with older transcript files.

The current iPhone Combine implementation and unified audio-reference model are now part of the working baseline.

# 35. Latest Development Milestone: Semantic Search

Semantic Search is now the third top-level Memora function.

The current navigation is:

    Transcribe | Combine | Search

A future Record tab remains planned for eventual iMuse/Memora integration, but Record is not part of the current Memora implementation.

## 35.1 Search purpose

Search is intended to find transcript material by meaning rather than requiring an exact keyword match.

The goal is not maximum semantic precision at the expense of useful context. The current design aims to put the most likely answer first while preserving a useful semantic neighborhood around it.

The search operates on transcript sentences but presents contextual multi-sentence passages so that the user can judge the meaning of a match in its surrounding context.

Search is therefore best understood as a retrieval aid rather than a claim that every result is an exact answer.

## 35.2 Search module and model

Search logic is contained in:

    js/search.js

Semantic indexing and embedding work are separated from the main UI coordinator. The application uses the existing transcript parsing and duplicate-selection logic rather than creating a second transcript-processing system.

The current Search model is fixed to:

    Xenova/all-MiniLM-L6-v2

The user no longer selects a Search embedding model in the interface. This decision was made to simplify the Search experiment and to make retrieval-quality comparisons meaningful by keeping the embedding model constant.

The current implementation uses Transformers.js with q8 model weights.

## 35.3 Search indexing and persistent semantic storage

When a Search Source is selected, Memora reads the transcript collection and begins building the Search index immediately.

The semantic index is now persisted in an IndexedDB-backed semantic store rather than existing only for the current page session.

The individual transcript `.txt` files remain the durable source material. The semantic index is derived data and can be rebuilt if necessary.

Search indexing is associated with the transcript/source identity and current transcript content so that changed transcript files can be recognized and re-indexed rather than blindly reusing stale embeddings.

This persistent approach was adopted because full semantic embedding is the dominant cost of indexing a collection. Reusing derived embeddings avoids paying that cost unnecessarily when the same transcripts are searched again.

## 35.4 Context representations

A single sentence embedding was found to be useful for locating specific material but insufficient for reliably representing the broader context of a thought.

The current Search system therefore maintains three contextual representations:

    3–2    three sentences, one-sentence overlap
    5–3    five sentences, two-sentence overlap
    7–4    seven sentences, three-sentence overlap

The 5–3 representation is the principal in-memory contextual representation. The 3–2 and 7–4 representations are also persisted so that Search can retrieve both narrower and broader semantic context.

The overlap is deliberate. It allows a concept that falls near a chunk boundary to be represented in more than one contextual window without requiring a separate paragraph-generation step.

The previously tested 5–2 and 9–5 representations are no longer part of active Search indexing or retrieval. Existing IndexedDB records from those earlier experiments may remain physically stored until they are deliberately cleaned up; they are not read or regenerated by the current Search implementation.

## 35.5 Query processing and combined retrieval

A Search query is embedded once and used to retrieve candidates from all three active contextual representations.

The current retrieval process is:

    query
      ↓
    MiniLM embedding
      ↓
    3–2 retrieval
    5–3 retrieval
    7–4 retrieval
      ↓
    combine candidates
      ↓
    deduplicate by transcript
      ↓
    rank transcripts

The current ranking uses relative rank within each representation rather than attempting to normalize raw similarity scores across representations.

The strongest relative rank for a transcript contributes to its overall position, while evidence from the other representations is retained as supporting context.

The final Search results are capped at 30 unique transcripts. A transcript can therefore appear only once in the final displayed result set even when several of its contextual representations produce strong matches.

This design deliberately favors useful coverage and agreement across context sizes over treating a single raw cosine score as an absolute measure of relevance.

## 35.6 Sentence-level retrieval remains useful

Sentence-level semantic matches are still maintained.

They are used primarily for:

- identifying the most directly matching sentence;
- highlighting the relevant sentence in a contextual result;
- providing fallback material when contextual retrieval does not fill the available result set.

The contextual chunk is the primary displayed search result. The sentence match is supporting evidence rather than a separate transcript result.

## 35.7 Search result presentation

The current Search UI:

- groups results by transcript file;
- displays the original transcript filename;
- displays the recording filename when available;
- presents contextual matching passages;
- highlights the sentence associated with the semantic match when available;
- allows transcript selection;
- provides Select all behavior;
- provides Search → Combine handoff;
- limits the final displayed results to 30 unique transcripts.

A transcript represented by multiple matching chunks is still shown only once. This avoids filling the result list with repeated entries from the same recording.

The highlighted sentence exists in the live Search page DOM. It is not automatically inserted into Combined TXT, DOCX, or HTML because those outputs continue to be generated from the underlying transcript records.

## 35.8 Search controls and collapse behavior

Search now follows the same basic result-list usability pattern established in Transcribe and Combine.

At the top of the returned results there are:

- **Select all**, initially selected;
- **Collapse all**, initially deselected.

The controls are separated from the returned results by a double-line visual divider.

A second **Collapse all** control appears at the bottom of the returned results.

The two Collapse all controls operate on the same result cards. When results are expanded from the top control, the view remains positioned near the top controls. When results are expanded from the bottom control, the view remains positioned near the bottom controls.

This is a UI refinement only; it does not alter Search indexing, retrieval, ranking, or the Search → Combine workflow.

## 35.9 Search → Combine handoff

Search does not implement a second combining system.

When the user selects transcript files and chooses:

    Use Selected in Combine

Memora hands the actual transcript `File` objects to the existing Combine workflow.

The normal Combine pipeline remains responsible for:

    read transcript files
        ↓
    sort records
        ↓
    select highest-model records
        ↓
    optional Combine paragraphing
        ↓
    TXT / DOCX / HTML generation

Search finds material; Combine assembles it. No duplicate Combine implementation is introduced.

## 35.10 Search-derived Combine title

Search can provide a title to the existing Combine document-title field.

For example:

    What did I say about surrender and letting go?

may become:

    Memora — Search: Surrender and Letting Go

The existing Combine generators continue to handle the title normally, including using it as the basis for generated output filenames.

Title normalization remains provisional. The Search system does not currently use a generative model to infer a semantic title.

## 35.11 Search-quality evaluation

Search development has shifted from adding retrieval mechanisms indiscriminately to evaluating the current system against real questions and known answers.

The principal objective is:

    put the most likely answer first
    while retaining a useful semantic neighborhood.

Several query types are being used for calibration, including:

- exact or nearly exact phrases;
- concrete factual descriptions;
- remembered events;
- emotional descriptions;
- conceptual questions;
- spiritual/conceptual questions;
- terminology;
- ordinary conversational questions;
- known-target queries.

This evaluation is intentionally empirical. Search changes should be made only after the current behavior is understood across several query types rather than being optimized around one unusual example.

## 35.12 Ganga / Samadhi benchmark

A particularly important benchmark is:

    2023-06-20 - Ganga first samadhi - medium.txt

The transcript describes an experience later understood by the user as Samadhi, but the recording itself was made before that interpretation had been attached to it. The later filename therefore contains information that was not present in the spoken transcript.

The relevant spoken passage includes the idea of feeling at the "center of it all," together with descriptions of profound loss of ordinary self-reference and an intense experience at the Ganga.

The current semantic system does not reliably place this recording first for all of those indirect descriptions. In particular, the query:

    center of it all

was a useful calibration failure: the target material existed in the transcript, but retrieval was surprisingly weak.

Other Ganga-related queries produced better but still variable results.

This benchmark demonstrates that chunking alone does not solve every semantic retrieval problem. It should remain a regression test for future Search changes.

## 35.13 Transcription quality versus retrieval quality

The Ganga benchmark also exposed a Whisper recognition error:

    delusion

was corrected to:

    deluge

After the transcript was corrected and re-indexed, a query such as:

    heavy rain

successfully retrieved the Ganga recording at the top of the results.

This provides an important diagnostic distinction:

- a retrieval failure can result from the embedding/retrieval method;
- a transcription error can prevent the intended concept from being represented correctly in the first place.

Search evaluation should therefore distinguish transcription errors from semantic-retrieval limitations.

## 35.14 Score calibration observations

Similarity scores are useful for ranking but are not yet treated as a universal relevance threshold.

Tests showed that the score distribution varies substantially by query. For example, `samadhi`, `center of it all`, and `lose my sense of self` produced different score ranges and different degrees of separation between strong and weak results.

A conceptually relevant result can also occur surprisingly far down a raw ranking, which means that a fixed global score cutoff would be premature.

Dynamic thresholding based on the score distribution remains an experiment for the future rather than part of the current algorithm.

## 35.15 Current boundary of Search

Search currently searches transcript sentence/context text.

It does not yet incorporate semantic meaning from:

- transcript filenames;
- later user-assigned recording titles;
- user-supplied tags;
- external notes;
- other personal knowledge associated with a recording.

The Ganga benchmark demonstrates why these additional information sources may eventually matter: the later human interpretation "samadhi" was present in the filename but not in the original spoken words.

No decision has yet been made to incorporate such metadata into the embedding corpus.

## 35.16 Smart lexical expansion — deferred

A deterministic local lexical-expansion layer was considered as a possible way to improve retrieval for queries whose wording differs from the wording used in the transcript.

Several approaches were considered conceptually, including WordNet, BabelNet, ConceptNet, and corpus-aware phrase discovery.

The conclusion for the current milestone is to defer lexical expansion rather than add a large new dependency or heuristic layer without evidence that it solves the observed failures.

MiniLM can represent a supplied phrase semantically, but it does not itself generate reliable unknown paraphrases for the query. External lexical resources also have important limitations, particularly for multi-word experiential or philosophical concepts.

No lexical-expansion code has therefore been added to the current Search baseline.

# 36. Persistent Search Storage and Future Optimization

Persistent semantic storage is now implemented, but its long-term architecture remains an area for refinement.

The current design treats semantic embeddings as derived data. The transcript `.txt` files remain authoritative.

## 36.1 Current persistent representations

The active persistent Search store contains embeddings for:

    3–2 contextual representation
    5–3 contextual representation
    7–4 contextual representation
    sentence representation

Each derived record is associated with the source/transcript identity and the semantic representation used to create it.

Older experimental representations may remain in IndexedDB, but the current application does not read or regenerate them.

## 36.2 Why persistence matters

The collection used during current testing contains approximately:

    60 transcripts
    1,922 sentences

Embedding computation is much more expensive than reading the files or splitting them into sentences. Persisting embeddings therefore avoids unnecessary repeated work when the underlying transcript content has not changed.

The current implementation also invalidates/rebuilds the relevant derived data when a transcript changes, as demonstrated by correcting the Ganga transcript and observing the updated retrieval behavior.

## 36.3 Future reuse with paragraphing

The paragraphing module and Search both use MiniLM sentence embeddings.

This creates a potential future optimization:

    transcription
        ↓
    sentence splitting
        ↓
    MiniLM sentence embeddings
        ├────────→ paragraphing
        └────────→ Search index

This is not yet implemented as a shared computation path. It remains a desirable future optimization because it could avoid performing the same embedding work twice.

## 36.4 Model/version awareness

Future persistent indexes must remain aware of the semantic model and its version/revision.

A change in the embedding model should not silently mix incompatible embeddings with an existing index.

This keeps transcript files durable while allowing derived Search indexes to evolve independently.

# 37. Future Search Modes

A keyword-search mode remains a possible complementary retrieval method.

The conceptual distinction is:

    Keyword search
        exact word/phrase retrieval
        potentially chronological or alphabetical ordering

    Semantic search
        meaning/association retrieval
        relevance ordering

Keyword search would not require an embedding model and should therefore be substantially faster for exact terminology.

No keyword-search implementation is currently active.

# 38. Search Development Principles Established So Far

The Search work has established these current principles:

1. Search belongs in its own module rather than being folded into `combine.js` or paragraphing.
2. Heavy semantic indexing belongs in a Web Worker so that the browser UI remains responsive.
3. Selecting a Search Source begins indexing immediately because the selected collection is the intended search corpus.
4. MiniLM is currently fixed as the Search embedding model so retrieval experiments are not confounded by model-selection changes.
5. Semantic embeddings are derived data and may be persisted independently of the durable transcript files.
6. Active contextual retrieval uses 3–2, 5–3, and 7–4 representations.
7. The 5–3 representation is the principal contextual representation; 3–2 and 7–4 provide narrower and broader context.
8. Search results are deduplicated at the transcript level so the same transcript is not repeatedly displayed.
9. Search should hand selected transcript files to the existing Combine workflow rather than duplicating Combine functionality.
10. Search results should be evaluated against real user questions and known answers rather than only synthetic examples.
11. Retrieval quality should be separated from transcription quality when diagnosing failures.
12. Fixed global score thresholds should not be introduced until score behavior is better understood across query types.
13. Filename knowledge and later human interpretation are currently outside the semantic corpus.
14. Deterministic lexical expansion is deferred until retrieval testing shows that it is worth the added complexity.
15. Future Search changes should be incremental and should preserve the current stable baseline while each experiment is evaluated.

# 39. Current Search Status

Search is now a working experimental retrieval system rather than a placeholder.

Implemented:

- Search top-level tab;
- Search source selection;
- fixed MiniLM embedding model;
- immediate source indexing;
- persistent IndexedDB semantic storage;
- sentence-level semantic indexing;
- 3–2 contextual representation;
- 5–3 contextual representation;
- 7–4 contextual representation;
- combined multi-representation retrieval;
- transcript-level result deduplication;
- maximum 30 unique transcript results;
- paragraph/context-aware result presentation;
- sentence highlighting/supporting matches;
- semantic relevance ordering using relative rank across representations;
- transcript-file selection;
- Select all;
- Search → Combine handoff;
- Search-derived Combine title through the existing title field;
- Search Worker for responsive bulk indexing;
- progress/status reporting;
- top and bottom Collapse all controls for Search results;
- preservation of the user's approximate top/bottom viewport position when expanding from the corresponding Collapse all control.

Not yet implemented:

- dynamic score-distribution thresholding;
- deterministic lexical expansion;
- semantic indexing of filenames or later user-assigned concepts;
- keyword search;
- reuse of paragraphing embeddings by Search;
- automatic paragraphing during every transcription;
- application-level controls for changing the Search retrieval architecture;
- a revised retrieval architecture beyond the current multi-representation baseline.

The current Search implementation should be treated as the experimental baseline for retrieval-quality testing. The next changes should be driven by observed behavior across real queries rather than by adding complexity speculatively.

# 40. Development Process Reminder

The working project rule is:

> Always ask for the current version of a file before making changes.

The current file supplied by the user is authoritative for subsequent modifications. Older versions, earlier generated ZIP contents, and prior conversation copies should not be assumed to be current.

Search changes should continue to be made incrementally and should avoid disturbing the stable Transcribe and Combine workflows.

# 41. Latest Development Milestone: Settings and Storage Management

Settings was introduced as a management area rather than as another operating tab.

The design principle is:

    Operating tabs
        ↓
    perform Memora's work

    Settings
        ↓
    manages Memora

The initial Settings implementation is deliberately small and read-only. It provides visibility into browser-side storage without introducing destructive controls before the accounting has been tested.

## 41.1 Settings access and navigation

Settings is accessed through a gear button in the upper-right of the application header.

It is not included as a fourth item in the main operating-tab navigation.

The primary navigation therefore remains:

    Transcribe | Combine | Search

This avoids treating configuration and storage management as another stage in the recording/transcription workflow.

The header layout is independently positioned so that:

- the active tab's icon remains at the left;
- the Memora title/tagline remain centered;
- the Settings gear remains at the right.

The refinement preserves the previously working behavior in which the header icon changes with the active tab.

## 41.2 Initial Settings scope

The first Settings milestone is intentionally limited to information that can be reported reliably from the browser.

The initial scope is:

- browser storage usage and quota;
- IndexedDB usage;
- semantic Search-index size and entry count;
- other IndexedDB storage;
- cached model storage;
- cached model groups and file counts;
- a refresh operation that rereads the current storage state.

No deletion or cache-clearing operation was introduced in this milestone.

This follows the project's incremental-development principle: first make the storage accounting visible and trustworthy, then consider management operations.

## 41.3 Storage architecture

A separate `storageManager.js` module was introduced rather than expanding the existing `storage.js`.

The distinction is intentional.

`storage.js` remains responsible for application file/folder operations and transcript persistence.

`storageManager.js` is responsible for reporting browser-side application storage.

The storage manager currently performs read-only inspection of:

- IndexedDB stores;
- the persistent semantic Search store;
- the browser Cache API;
- `navigator.storage.estimate()`.

It does not delete, modify, or clear stored data.

This preserves the existing storage abstraction while preventing management/reporting concerns from becoming entangled with ordinary file operations.

## 41.4 Storage accounting presentation

Settings presents storage quantities using a compact form:

    size · count entries

or, where the underlying item is a cached file:

    size · count files

This makes both the amount of storage and the number of stored objects visible at the same time.

The semantic index is therefore reported as a storage size plus its number of entries.

Cached model groups are reported as a storage size plus the number of cached files.

IndexedDB transcript records are described as cached transcripts rather than as the user's transcript files. This distinction is important because the user's durable `.txt` transcripts remain external files; browser-side transcript records are a separate cache/safety layer.

## 41.5 Browser storage versus transcript files

The Settings display deliberately avoids implying that the browser's IndexedDB transcript store is the user's transcript library.

The durable transcript files continue to be the primary external source material.

The browser-side IndexedDB transcript store is a cache/safety layer used by the application, particularly for the iPhone workflow.

Therefore a browser report such as:

    Cached transcripts
    0 B · 0 entries

does not mean that the user has no transcript files. It means that no transcript records are currently present in that particular browser-side store.

This distinction should remain explicit as Settings evolves.

## 41.6 Semantic Search storage

The persistent semantic Search index is derived data.

Settings reports:

- its storage size;
- its total number of entries;
- its representation breakdown.

The active Search architecture uses:

    3–2
    5–3
    7–4
    sentence

The current Search implementation does not read or regenerate older experimental representations that may still physically exist in IndexedDB.

Settings therefore reports what is stored rather than assuming that every historical IndexedDB representation is active Search data.

## 41.7 Cached model storage

The browser Cache API can contain substantial local model data.

The Settings implementation identifies recognized model groups including:

- Whisper large-v3;
- Whisper medium;
- Whisper small;
- Whisper base;
- Whisper tiny;
- all-MiniLM-L6-v2.

Unrecognized model-like cached files are grouped as:

    Other cached model files

This category is intentionally descriptive rather than speculative. The storage manager does not guess which model a file belongs to merely because it is large or has a model-like URL.

The current implementation counts and sizes the files but does not delete them.

A future refinement may expose the exact URLs/file names represented by the "Other cached model files" group if that information is useful to the user. No such identification or deletion behavior is part of the current milestone.

## 41.8 Refresh behavior

The Settings **Refresh Storage Information** control performs a new storage report rather than merely revealing the values from the previous page load.

The refresh operation:

1. obtains the storage-manager module;
2. rereads the IndexedDB stores;
3. rereads the Cache API model assets;
4. rereads browser storage estimates;
5. rerenders the Settings report;
6. updates the report timestamp.

This makes the control useful after a model has been loaded, a cache has changed, or another application operation has altered browser storage.

## 41.9 Current observed storage scale

During initial Settings testing, the browser reported approximately:

    Browser storage used: 9.02 GB
    Browser quota:        19.02 GB

The same report showed that model caching dominated the browser-side storage, while the persistent semantic Search index was comparatively small.

The observed model-cache breakdown included approximately:

    all-MiniLM-L6-v2       21.91 MB
    Other cached files    133.47 MB
    Whisper base          424.17 MB
    Whisper large-v3        1.93 GB
    Whisper medium          4.88 GB
    Whisper small           1.37 GB
    Whisper tiny          222.35 MB

The semantic index was approximately:

    7.64 MB
    5,218 entries

These values are observations from the development browser at the time of the Settings test, not fixed application constants.

The significance of the result is architectural: local Whisper model caching can consume orders of magnitude more storage than the semantic Search index.

## 41.10 Why deletion controls are deferred

Settings could eventually provide controls for clearing:

- selected Whisper model caches;
- unused model caches;
- the semantic Search index;
- browser-side transcript safety records.

Those operations are deliberately not part of this first Settings milestone.

Deletion is materially different from reporting. A storage-management control must be precise about what will be removed, what can be rebuilt, what cannot be recovered, and whether a browser cache entry is shared by another application operation.

The current milestone therefore establishes observability before introducing destructive management.

## 41.11 Application language remains a separate Settings concern

Application/UI language remains a planned Settings capability.

It should not be confused with transcription language.

Transcription language belongs to the Transcribe workflow because it determines how Whisper processes the selected recording.

Application language belongs to Settings because it determines how Memora's own interface is presented.

The first Settings milestone does not yet implement the application-language selector.

## 41.12 Architectural rationale

The Settings milestone reinforces several existing Memora principles:

1. **Operating tabs perform work; Settings manages the application.**
2. **Storage reporting is separated from ordinary file operations.**
3. **The first management step is observation before deletion.**
4. **Derived Search embeddings remain distinguishable from durable transcript files.**
5. **Browser-side transcript records are described as cached records, not as the user's external transcript library.**
6. **Model-cache storage is treated as a significant resource that deserves visibility.**
7. **The existing tab-specific header icon behavior is preserved.**
8. **The header title remains centered while the icon and Settings gear occupy independent left/right positions.**
9. **Settings is kept small so that it does not become another operational workflow.**
10. **Future destructive controls should be introduced only after the storage model has been tested and understood.**

## 41.13 Current Settings status

Implemented and tested:

- Settings entry through the header gear;
- Settings as a management area rather than a fourth operating tab;
- centered Memora title/tagline;
- left-justified tab-specific icon;
- right-justified Settings gear;
- read-only browser storage accounting;
- IndexedDB accounting;
- semantic Search-index accounting;
- representation breakdown;
- Cache API model accounting;
- recognized Whisper/MiniLM model grouping;
- "Other cached model files" grouping;
- size plus entry/file-count presentation;
- refreshable storage information;
- no destructive storage controls.

Not yet implemented:

- application/UI language selector;
- exact per-file identification of "Other cached model files" in the Settings interface;
- selective model-cache deletion;
- semantic-index clearing/rebuilding controls;
- transcript-cache management controls.

These remain future Settings work and should be introduced incrementally.

---

# 42. Incremental UI Module Extraction and Paragraphing Responsiveness

This milestone records the first staged reduction of `app.js`. The goal is to make future edits easier to reason about by keeping feature-specific UI and state near each feature, while preserving `app.js` as the application coordinator.

## 42.1 ES module entry point

`index.html` loads `app.js` with `type="module"`. This enables explicit imports between UI modules. The application continues to initialize after the document has been parsed.

## 42.2 Search UI extraction

Search-specific state, status rendering, index-building interaction, query handling, result rendering, selection controls, and Search event listeners live in `searchUI.js`.

`app.js` initializes Search UI with the existing lazy storage/Search loaders and an explicit callback for the Search-to-Combine handoff. Combine state remains in the coordinator at that boundary; Search UI does not reach into Combine's private variables.

The domain/search-index implementation in `search.js` was not changed as part of the UI extraction.

## 42.3 Transcription recording-list extraction

`transcriptionUI.js` owns the audio recording list, metadata display, sort and collapse controls, checkbox state, empty state, and selected-recording lookup.

`app.js` retains source-folder selection and transcription orchestration. It passes metadata-reading and formatting functions into the UI module so the module does not rely on names that are private to `app.js`.

Audio capture is a separate future feature. It should use a dedicated recording module rather than expanding `transcriptionUI.js`, which is responsible for displaying and selecting existing files.

## 42.4 Combine transcript-list extraction

`combineUI.js` owns the transcript list, sort order, selection controls, collapse controls, and selected transcript state. Its API provides the selected files, sort order, and list count to `app.js`.

The module receives the existing lazy Combine loader and an explicit callback for resetting iPhone export state when the list or selection changes. File generation for TXT, DOCX, and HTML remains in `app.js` for now. Search results populate the list through the same display API.

## 42.5 Combine progress visibility

Combine status messages now identify the current stage, including loading tools, reading transcripts, generating an output format, and writing to the selected destination. This was added to identify pending operations during a reported Combine stall.

Investigation showed that the long operation occurred when **Create paragraphs** was enabled, before Combine used the output folder. The destination folder was not the cause of the delay.

## 42.6 Paragraphing worker and existing paragraphs

Paragraphing now requests MiniLM embeddings through `semantic.js` and the existing `semantic-worker.js`, rather than loading a separate Transformers.js pipeline on the main thread. The paragraph-boundary algorithm remains unchanged. Worker progress is visible while the page stays responsive.

The paragraphing function now preserves transcripts that already contain blank-line paragraph breaks and skips model inference for them. This avoids re-embedding transcripts that were already paragraphized during transcription.

## 42.7 Refactoring method and current status

The UI extractions are performed one at a time. After each extraction, the code boundary and cross-feature calls are reviewed, then the application is checked in the browser before moving to another module. The Search, recording-list, and Combine transcript-list flows have been reported working by the user.

The current direction is to keep `app.js` focused on application startup, cross-feature coordination, and processing workflows. Additional large extractions should retain explicit APIs and avoid moving domain algorithms as part of UI-only changes.

