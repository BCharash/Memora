# iPhone save flow audit

The source audit began on **24 November 2026** at commit **f3fc698**, build **2026-11-24.3**. This reference describes the implemented behavior through build **2026-11-25.4**.

## iPhone overwrite rule

**Share one file at a time whenever the user needs Files to offer Replace.** Save the edited TXT first, then use **Update Search Index** to share `search-embeddings.json` separately. In the 25 November iPhone test, the combined TXT and JSON share kept numbered copies without offering Replace. The user confirmed that separating the saves corrected the problem. Sharing multiple files with the same `.txt` extension has not been tested for name collisions. The existing new-transcript batch export still shares multiple TXT files.

Choose **Replace** when offered. After sharing, check the original TXT filename and its edited text before sharing the index. Check the exact name `search-embeddings.json` afterward. Memora cannot verify that the Files app replaced either file from the share result alone.

**Verify in Files** is optional and opens a fresh folder selection. It compares the intended filename and contents for the TXT or JSON. It reports a same-content numbered copy separately and shows the observed modification time, including whether it falls near the save attempt. The timestamp is supporting evidence. Filename and content determine verification.

## Memora save flows

| Flow | Destination and confirmation |
|---|---|
| [Transcribe batch TXT](../js/app.js) | An audio folder is enough to begin transcription. At export, a selected transcript folder takes precedence, otherwise Memora suggests the `transcription` child of the audio folder. If the folder contains mixed or missing archive identities, Memora prepares a fresh archive and suggests a separate `transcription - new` folder, adding a number to avoid known siblings. The app names the proposed folder and the user chooses or creates it in Files. Cancellation or failure leaves the batch available. |
| [Edit/Combine transcript replacement](../js/combineUI.js#L386) | Save shares only the edited TXT. The folder path is on its own bold line. Verify the exact TXT filename and edited contents in Files before saving the index separately. |
| [Search transcript replacement](../js/searchUI.js) | Uses the same TXT-only share. Search reruns the current query, returns to the top because rankings may have changed, and leaves the index update pending as a separate action. |
| [Search index archive](../js/searchUI.js#L348) | Save `search-embeddings.json` beside the TXT files in the selected transcript folder and replace the older index there if present. Verify placement in Files. A pending update pulses. Canceling the first attempt keeps it pending. A successful share leaves the normal active button available for repeat saves. |
| [Combine TXT, DOCX and HTML](../js/combineShareExport.js) | Suggests the `combined` subfolder of the transcript source. The user can create the subfolder in Files or choose a different destination. The share status names the generated file to check. The same controls handle Search selections passed to Combine. |
| [Settings cached TXT recovery](../js/settings.js#L1232) | Shows a file count and known original audio-folder names before offering the share sheet. Choose a recovery folder. When restoring multiple original archives, select one archive at a time. Cache provenance is historical context and cannot establish the current transcript location. |
| [Whisper JSON reports](../js/whisperExecutionReports.js#L52) | The execution and self-test report component offers Save report on iPhone. Choose a folder you can find again and check for the named JSON afterward. Copy-only diagnostics and stored observations have no Files destination. |

Memora can show a path such as `2018 / transcription` when it discovered the transcript child under the selected audio parent. For a separately selected folder, it shows the known name and asks the user to check the parent in Files. Native directory saves write through the selected handle. A completed share confirms the handoff to the share sheet. Verify actual placement and replacement in Files. [Folder selection and parent tracking](../js/sharedFolderSelection.js) · [File workflows](Architecture_and_File_Workflows.md#delivery-and-honest-completion)

## Standalone pages

| Flow | Delivery guidance |
|---|---|
| [Folder selection sample save](../tests/shared-folder-test-ui.js#L64) | Names the intended folder before and after sharing. A download fallback tells the user where to move the sample. |
| [Folder selection report](../test.html#L126) | Offers sharing, downloading and copying. The share route explains Save to Files and the download route points to Files or browser downloads. |
| [Audio inventory report](../js/audioInventoryTest.js#L26) | Shares the named TXT report or points to Files or browser downloads after requesting a download. |
| [DOCX validation fixtures](../tests/docx-custom-properties-validation.html) | Names the fixture downloads and tells iPhone users where to look for them. |

## Editor behavior and history

Search **Show transcript** displays the full transcript with colored highlights. Edit opens the full text and selects and scrolls to the first match inside the text box. Previous and Next use original text offsets, including across line breaks and repeated spaces. The native text selection marks the current match while the editor is focused. A separate preview identifies the match when focus leaves the box. A narrow result puts Edit, Show transcript and Hide result below the filename. Hiding a result with unsaved edits prompts before discarding them. [Search methodology](Search_Methodology.md#result-composition-and-highlighting)

Both editors put actions below the text box. Save and any Files destination instructions appear after a text change and hide again if the original text is restored. Cancel stays visible with the same appearance. Both text boxes use vertical overflow and contain scrolling at their edges. Search and Combine show the audio-location hint only when playback needs a manual fallback. [Shared playback control](../js/searchUI.js#L877) · [Editor styles](../css/style.css#L1391)

Build **.5** introduced the folder guidance and was reverted after iPhone testing. **.6** restored it with Search result layout, match navigation and Search index retry styling. **.7** tried opening Edit with the keyboard closed and a separate match preview. **.8** restored focus and first-match selection during the Edit tap. That can open the iPhone keyboard immediately, and typing while the match is selected can replace the selected sentence. The preview remains available when focus leaves the box. **.9** made audio lookup guidance conditional in the shared control. **.10** made Save visibility and Cancel styling consistent in both editors on desktop and iPhone. [Design journal](design-journal.md#6243-iphone-save-destinations-and-transcript-editors)

## Findings from 25 November

- **2026-11-25.1** removed the mandatory iPhone destination choice, kept existing folder selection optional and put the destination on its own bold line 2 px larger than the instructions. It bundled the edited TXT and index on iPhone while keeping desktop saves separate. After a Search edit, Memora reruns the same query and returns to the top so rankings can be reviewed from the start. A Combine edit refreshes an active Search session for the same folder.
- **2026-11-25.2** allowed transcription to proceed when the destination has mixed or missing archive identities. Inspection confirmed a single physical `transcription` folder with two differently tagged TXT files and an index listing both. The preferred layout remains `audio source / transcription / combined`, with the index beside the TXT files. Suggesting a new sibling on identity conflict is still the fallback in this build. Keeping the existing folder as the suggested destination in that case remains open.
- **2026-11-25.3** restored separate shares with filenames and replacement instructions. The affected folder contained four different TXT bodies with the same recording and archive IDs and model. It also contained numbered JSON copies. Search picks the first same-model copy it encounters and reads only the exact filename `search-embeddings.json`. A newer timestamp or higher suffix cannot show which edit the user intended to keep.
- After deleting TXT copies, reselect the transcript folder. Search builds results from the remaining TXT files. In **2026-11-25.4**, a deleted or superseded entry alone makes the index update available. The reason beside the button explains what changed. The next successful JSON replacement omits stale entries. [Index construction and update detection](../js/search.js)
- **2026-11-25.4** adds optional save verification and records future Memora edits in the TXT header. A verified edited transcript takes precedence over a higher-model unedited copy. Search offers a comparison and Combine can use an alternative in the current output. Numbered copies whose names differ from the recorded edit target cannot take precedence on the strength of the edit marker. [Transcript selection](Search_Methodology.md#txt-selection-derived-embeddings-and-current-limits)

## Device verification

Use disposable copies on an iPhone. Check a known parent, a separately selected folder and two archives with the same transcript folder name. Exercise a new folder, a replacement, a canceled save, a retry and a deliberate wrong-folder save. Open Files to check the actual path, then reopen the source to verify that it reads the edited TXT or Search archive from disk.

With a long filename and transcript, check both ends of the text in Show transcript and Edit. Verify that the first selection is visible, Previous and Next work, and Save and Cancel are reachable below the editor with the keyboard open. Swipe inside each editor at the top and in the middle, then swipe outside to check that the app still scrolls. Headless Edge verifies the layout, editor state and simulated share paths. The user confirmed the single-file correction on iPhone. Initial touch scrolling, the full destination matrix and multiple-TXT collisions remain open device checks. [Regression coverage](../tests/README.md#application-acceptance-on-macbook-and-iphone)
