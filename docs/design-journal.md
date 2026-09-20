# Memora Design Journal

**Version:** 1  
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
2. Memora finds the M4A recordings in that folder.
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

The current important operation is:

- decode M4A audio
- resample it to 16 kHz

This is an audio-processing module, not a recording module.

There is intentionally no `recorder.js` requirement in Memora because Memora does not record audio.

## metadata.js

Responsible for extracting metadata from M4A files.

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
        model
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

The current intended filename pattern is:

    YYYY-MM-DD HH-MM - basename - model.txt

For example:

    2023-06-15 08-40 - Prarabda karma 2 - small.txt

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
- separator
- transcript

The saved text format is intentionally simple and durable.

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

# 12. Desktop File Handling

Desktop browsers can provide access to a directory through the File System Access API.

The current desktop workflow uses:

    showDirectoryPicker({ mode: "readwrite" })

The source directory is enumerated for top-level `.m4a` files.

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

Audio association is deliberately deferred until the basic transcription and Combine Files workflows are stable.

---

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

The next development stage is architectural refactoring rather than adding a large amount of new functionality at once.

Planned sequence:

1. Confirm the current Memora version is clean and committed.
2. Extract audio processing into `audioProcessor.js`.
3. Extract metadata processing into `metadata.js`.
4. Separate Whisper machinery.
5. Create `transcription.js`.
6. Create `storage.js`.
7. Simplify `app.js` into the UI coordinator.
8. Add the Transcription / Combine Files tabs.
9. Rename Source to Audio Source.
10. Implement Text Source and Combine Files.
11. Generate combined TXT and HTML.
12. Add audio links/player support.
13. Implement the iPhone workflow.
14. Perform final cross-platform testing.
15. Complete the final architecture and design documentation.

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

# 22. Current Status

Memora has progressed beyond the proof-of-concept stage.

The important functionality has been demonstrated, including desktop transcription and an iPhone file-selection/output workflow.

The immediate objective is to refactor the working implementation into a clearer modular architecture before adding the Combine Files functionality.

The iPhone implementation remains an explicit future development phase.

---

# 23. Journal Update Policy

This document is a living design journal.

When a significant architectural or workflow decision is made, it should be added here with:

- the decision
- the reason
- important alternatives considered
- whether the decision is final, provisional, or deferred

At major milestones, the version/status at the top of this document should be updated.

The final version should provide a coherent record of how Memora evolved, not merely a list of code changes.
