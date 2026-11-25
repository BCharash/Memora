# iPhone save flow audit

The source audit began on **24 November 2026** at commit **f3fc698**, build **2026-11-24.3**. This reference describes the implemented behavior through build **2026-11-25.2**.

## Memora save flows

| Flow | Destination and confirmation |
|---|---|
| [Transcribe batch TXT](../js/app.js) | An audio folder is enough to begin transcription. At export, a selected transcript folder takes precedence, otherwise Memora suggests the `transcription` child of the audio folder. If the folder contains mixed or missing archive identities, Memora prepares a fresh archive and suggests a separate `transcription - new` folder, adding a number to avoid known siblings. Files shows where to create the new child. Cancellation or failure leaves the batch available. |
| [Edit/Combine transcript replacement](../js/combineUI.js#L386) | Save prepares the edited TXT and rebuilt folder-wide Search index, then sends both to one share sheet. The folder path is on its own bold line. Verify both files in Files. |
| [Search transcript replacement](../js/searchUI.js) | Uses the same two-file share. After sharing, Search reruns the current query and returns to the top because the rankings may have changed. |
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

## Device verification

Use disposable copies on an iPhone. Check a known parent, a separately selected folder and two archives with the same transcript folder name. Exercise a new folder, a replacement, a canceled save, a retry and a deliberate wrong-folder save. Open Files to check the actual path, then reopen the source to verify that it reads the edited TXT or Search archive from disk.

With a long filename and transcript, check both ends of the text in Show transcript and Edit. Verify that the first selection is visible, Previous and Next work, and Save and Cancel are reachable below the editor with the keyboard open. Swipe inside each editor at the top and in the middle, then swipe outside to check that the app still scrolls. Headless Edge verifies the layout, editor state and simulated share paths. Safari keyboard, initial touch scrolling and Files placement need device checks. [Regression coverage](../tests/README.md#application-acceptance-on-macbook-and-iphone)
