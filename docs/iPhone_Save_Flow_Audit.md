# iPhone save flow audit

Source review completed on **24 November 2026** against commit **f3fc698**, build **2026-11-24.3**. The tables describe that baseline. Build **2026-11-24.5** adds the folder guidance and verification reminders described below. iPhone behavior still needs device verification.

## Memora save flows

| Flow | Current behavior | Gap and proposed guidance |
|---|---|---|
| [Transcribe batch TXT](../js/app.js#L2053) | Shows the intended destination beside **Save to Files**, includes the audio parent for a known child, and asks the user to verify placement after sharing. | When the destination is newly named, explain how to create it in Files under the displayed parent if needed. For a separately picked destination, show the folder name and ask the user to check its parent. |
| [Edit/Combine transcript replacement](../js/app.js#L1520) | Shares the original filename and updates the displayed transcript after sharing returns. | Show the exact filename and original transcript folder, including its known parent. Explain that the user should replace the original there and verify the replacement afterward. |
| [Search transcript replacement](../js/searchUI.js#L1408) | Shares the original filename, swaps the replacement into the session and reindexes. Then it prompts the user to update the Search index archive. | Give the same replacement guidance as Edit/Combine. Keep the TXT verification reminder visible alongside the separate index-save reminder, since Search can show the edit before the user has verified the file in Files. |
| [Search index archive](../js/searchUI.js#L337) | Shares `search-embeddings.json`, clears the update flag, hides the update button and reports **Search Index updated**. | Show the selected transcript folder and known parent. Tell the user to save the archive beside the TXT files and replace the older index there if present. Ask the user to verify placement and keep the export available for retry. |
| [Combine TXT, DOCX and HTML](../js/app.js#L1550) | All three formats use the same share controls with generic ready and shared status. Search selections handed off to Combine use the same exporter. | Offer the transcript source's `combined` subfolder as a suggested destination, matching the [native option](../js/app.js#L289). Show the known path, explain that the folder can be created in Files if needed and allow other locations. |
| [Settings cached TXT recovery](../js/settings.js#L1231) | Shares a batch that can span archives and include legacy cache records. It disambiguates duplicate export filenames within the batch. | Show the file count and any known archive names, and ask the user to choose a recovery folder. If restoring to original archives, work one archive at a time. A [cached original audio-folder name](../js/transcriptCacheIdentity.js#L1) is historical context and does not establish a current transcript path. |
| [Whisper JSON reports](../js/whisperExecutionReports.js#L81) | The shared report component covers execution and self-test reports, including history and review entries. It prompts for **Save to Files** when the user taps Save report. | Show the filename and ask the user to choose a folder they can find again. These reports have no required archive destination. |

Settings' copy-only diagnostics, stored observations and other browser-local state have no Files destination. The writable-directory branches for transcript writes and retries, edits, Combine, Search index and cache recovery write through the selected handle. The gaps above concern sharing or downloading, where the user's Files selection controls placement.

## Standalone pages

| Flow | Current behavior and gap |
|---|---|
| [Folder selection sample save](../tests/shared-folder-test-ui.js#L64) | Names the intended location before and after sharing. Its download fallback tells the user to move the sample there. This is a useful reference for destination guidance. |
| [Folder selection report](../test.html#L126) | Offers share, download and copy. Download feedback points to Files or browser downloads. The share flow could explicitly tell users to choose **Save to Files** if they need an attachment, then pick a folder they can find again. |
| [Audio inventory report](../js/audioInventoryTest.js#L26) | Shares the TXT report or requests a download. Give placement guidance and tell the user where to look when the browser download is used. |
| [DOCX validation fixtures](../tests/docx-custom-properties-validation.html#L234) | Names each downloadable fixture. A short note about where to find downloaded fixtures would cover this developer-only flow. |

## Priorities and device verification

Start with the two transcript editors and Search index export. Each has a definite destination and a misplaced file can leave the current session looking current while a later session still reads the old archive. Put the filename and destination beside the save control and repeat the destination after the share sheet returns.

Folder selection can establish a breadcrumb such as `2018 / transcription` when the transcript folder was discovered under the selected audio parent. A folder picked separately supplies its own name. Ask the user to check the parent in Files in that case. [Folder selection and parent tracking](../js/sharedFolderSelection.js#L1) · [Browser folder access](../js/storage.js#L9)

On an iPhone, exercise the inventory with a known parent, a separately selected transcript folder, and two archives with the same transcript folder name. Check a new folder, an existing file replacement, cancellation and retry, and a save deliberately sent to the wrong folder. Open Files to check the actual path and reopen the source to verify the edited TXT or Search archive is read from disk. A completed share alone cannot verify placement, overwrite or durability. [File workflow reference](Architecture_and_File_Workflows.md#delivery-and-honest-completion)
