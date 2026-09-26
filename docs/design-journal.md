# Memora Design Journal

**Version:** 2  
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

The application is intended to have two principal tabs:

- **Transcription**
- **Combine Files**

The Transcription tab contains:

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
        └── html.js

Not all modules need to be created at once. The architecture will be introduced incrementally.

---

# 7. Module Responsibilities

## app.js

The UI coordinator/orchestrator.

It should:

- connect UI controls to application operations
- maintain UI state
- call the appropriate modules
- update status and results

It should not contain the detailed implementation of every subsystem.

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

The Combine Files milestone has been tested and committed.

The language/operation refinement and standalone HTML text-size progressive enhancement have now been implemented and tested.

The audio-link milestone has now been implemented and tested. The next planned development step is refinement of the **iPhone file structure/workflow**.

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

# 27. Journal Update Policy

This document is a living design journal.

When a significant architectural or workflow decision is made, it should be added here with:

- the decision
- the reason
- important alternatives considered
- whether the decision is final, provisional, or deferred

At major milestones, the version/status at the top of this document should be updated.

The final version should provide a coherent record of how Memora evolved, not merely a list of code changes.
