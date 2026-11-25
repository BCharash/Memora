# Search methodology — current behavior and preserved decisions

Result presentation, editing and index saving updated **24 November 2026** against source **06c4155**, application **2026-11-24.10**. Ranking and benchmark evidence retain their dated sources below.

**The complete [Search research record](archive/Search_Optimization_Research_Record.md) and [earlier governing strategy](search%20model%20optimization.md) remain intact at their existing paths.** Experiments, alternatives, numerical results, failed approaches, artifact names and uncertainty are not removed or shortened. This page separates current implementation from those dated observations and future proposals.

## Objective and ownership

Search helps a user rediscover transcripts from incomplete recollection. Semantic similarity supplies candidates when wording differs; lexical matches let remembered wording take priority. It is retrieval, not an answer-generation or transcript-rewriting feature.

| Owner | Current responsibility |
|---|---|
| [searchUI.js](../js/searchUI.js) | Source loading, semicolon terms, query orchestration, passage/transcript fusion, lexical-first order, context/highlighting, selection, editing and audio controls. |
| [search.js](../js/search.js) | TXT/index preparation, lexical matching, semantic candidate scoring, stored-representation retrieval and embeddings JSON serialization/compatibility. |
| [semantic.js](../js/semantic.js) / [semantic-worker.js](../js/semantic-worker.js) | Reusable semantic entries and worker-backed embeddings. |
| [combine.js](../js/combine.js) | Shared preferred-model transcript selection and TXT parsing. |
| [transcriptCatalogue.js](../js/transcriptCatalogue.js) | Current-folder TXT reads and rebuildable local metadata. |
| [app.js](../js/app.js) | Shared folder access and Search-to-Combine handoff/title formatting. |

Production selects **MiniLM**, currently Xenova/all-MiniLM-L6-v2 with q8 mean-pooled normalized embeddings through Transformers.js 3.7.2. E5 exists as a semantic-worker option/research subject; it is not the production Search selection. The historical comparisons did not authorize its adoption.

## Query terms and the lexical/semantic contract

A query can contain a natural-language description plus short remembered words or phrases. **Semicolons separate terms; commas stay inside a term.** Example:

    dreams; silence, stillness; pink elephant

Each nonempty trimmed term goes through **both lexical and semantic retrieval**, including sentence and contextual retrieval. Long terms are not semantic-only, and short terms are not lexical-only. The current splitter removes exactly repeated trimmed strings; it does not perform case-insensitive semantic deduplication.

A long description can have no qualifying consecutive lexical phrase while still returning useful semantic results. Additional short terms supply remembered lexical clues, without surrendering their own semantic contribution.

The current user-facing fuzzy range is **50–100%**. Normal JavaScript initialization uses **70%** unless a valid stored setting overrides it; the lower-level lexical API also defaults to 70%. The static HTML declares 80%, and the storage-exception catch can leave that value in place. This documents an existing initialization discrepancy, not a newly chosen fallback policy. No slider behavior is changed by the documentation correction.

At 100%, lexical search remains active. Current token normalization is case-insensitive and punctuation-insensitive, and a phrase must match a contiguous word window within a sentence. The implementation also gives limited common English inflection variants a score of 1. Therefore “100% exact” describes the normalized-token policy, not literal byte equality. This is an existing detail to preserve or explicitly review, not a new morphology/language feature.

## Lexical qualification and ranking

The matcher tokenizes letters/numbers, normalizes Unicode/case, and slides a query-length word window across each indexed sentence. Word similarity uses exact/limited-inflection equivalence or normalized edit distance. It chooses the best average-scoring window and requires **every word similarity** in that window to meet the threshold.

This per-word check prevents common exact words from compensating for an unrelated word in the phrase. Qualifying results retain match offsets for bolding. Threshold controls qualification; a surviving hit can score higher than the selected slider value.

The final transcript order has a strict first boundary: **every transcript with a qualifying lexical hit precedes every semantic-only transcript**. Within the lexical tier, current ordering is:

1. Strongest lexical match score.
2. Longer matched query phrase when scores tie.
3. Fused semantic transcript score.
4. Best raw semantic score.

Semantic-only transcripts use the last two measures. A semantically strong result cannot cross the lexical-first boundary. No hidden confidence rule discards a qualifying lexical hit merely to improve an aggregate ranking metric.

The independent lexical tier is an explicit product decision, not an inference that a particular benchmark proved lexical superiority in all settings.

## Semantic representations and retrieval scope

The index contains sentence embeddings plus contextual sentence windows:

| Representation | Chunk size | Overlap | Use |
|---|---:|---:|---|
| Sentence | 1 sentence | Not a chunk-overlap setting | Direct semantic passage evidence. |
| 3–1 | 3 sentences | 1 sentence | Narrow context. |
| 5–2 | 5 sentences | 2 sentences | Intermediate context. |
| 7–3 | 7 sentences | 3 sentences | Broader context. |

For each query term the UI requests up to **60 sentence candidates** and up to **40 contextual candidates per representation**. These are candidate caps, not counts of unique transcripts or promises of exhaustive recall.

Cosine-based passage scores support retrieval; ranks combine evidence across terms and representations. The candidate pool and the displayed group count are different limits. Search initially displays **20 transcript groups**, then reveals up to 20 more per Show next action from the already assembled set. Revealing more groups does not rerun retrieval.

## Two separate rank-fusion operations

These operations have different purposes/constants. Preserve the distinction when comparing old experiments or reorganizing code.

**Passage fusion across query terms:** sentence candidates and each contextual representation are fused independently using reciprocal rank contributions **1 / (60 + rank)**. Repeated evidence for a passage accumulates rank support. Sentence occurrences and chunk spans retain positional identity rather than collapsing every identical string globally.

**Transcript ordering:** each term/representation contributes the transcript's strongest-passage rank; the transcript fusion constant is **30**. Current weights are:

| Evidence list | Weight |
|---|---:|
| Sentence | 2 |
| 3–1 context | 1 |
| 5–2 context | 1 |
| 7–3 context | 1 |
| IDF-weighted transcript-token overlap | 1 |

Each positive-ranked item contributes **weight / (30 + rank)**. Equal peak scores receive tied/average ranks. IDF overlap supplies ranking evidence from query/transcript token overlap; zero-overlap files do not gain arbitrary rank evidence. IDF alone does not create a result card or bypass lexical qualification.

This is the **sentence-heavy** policy: direct sentence evidence is stronger than any one contextual list, while broader representations can corroborate it. Raw cosine scores from different queries/representations are not simply assumed interchangeable. RRF scores are rank evidence, not calibrated probabilities of relevance.

## Result composition and highlighting

Current presentation groups passages by transcript. Lexical matching words are bold; sentence matches and contextual matches keep their established distinct highlight treatment. Ranking and rendering are related but separate responsibilities.

Sentence-level matches suppress contextual chunks containing the same normalized sentence. A broader contextual chunk is also suppressed when it overlaps an accepted narrower chunk. Normalized sentence-text keys accommodate small whitespace/punctuation differences between indexing and display. The full renderer retains existing composition, excerpts, Show/Hide Result, Show/Hide Transcript, editing and selection controls.

On narrow screens, Edit, Show transcript and Hide result sit below the filename. Show transcript displays the full transcript with its colored matches. Edit loads the full original text, focuses the textarea and selects the first match. Previous and Next select matches by original character offsets, so internal line breaks and repeated spaces are preserved. When the textarea loses focus, a match preview gives the selected sentence without reopening the keyboard. Hiding a result asks before discarding unsaved edits. [Search editor](../js/searchUI.js#L1147) · [Match offsets](../js/searchExportHighlights.js#L19)

Save appears after a text change and hides when the text matches the original again. Cancel remains visible and restores the preceding view. The file-sharing path shows the folder and original filename while an edit is pending. Search and Combine share the Play control, which shows the location hint when manual audio selection is needed.

Do not simplify overlap, grouping or highlighting as an incidental consequence of a ranking refactor. Any change needs its own concrete examples and approval. The historical “preserve presentation” requirement constrains ranking work; it does not forbid separately approved UI changes such as the current list-origin box.

## TXT selection, derived embeddings and current limits

Search reads selected TXT before indexing. Archive UUID, Recording ID and operation participate in recording grouping. A confirmed Memora edit takes precedence over an unedited copy, including a higher model. Search offers a read-only comparison when a higher model or competing edit exists. Combine can use a different version in the current output. For unedited copies, the highest model wins and equal-model copies keep the first encountered order. Filename suffixes and timestamps do not decide that tie.

Both inventory sidecars are retired. Current TXT metadata/text feeds the local folder metadata cache, while **search-embeddings.json remains the external derived Search index**. The semantic store is separate from ranking strategy so representations can be reused across experiments.

Compatible unchanged vectors can be reused from the archive/store after the current format/model/text/identity/item checks. Modified text must not silently reuse stale vectors. Preserve the intentional **audioSourceId:null** slot in serialized hashes: it maintains earlier keys and does not restore dependence on an audio JSON file.

Index JSON contains derived sentence/context material and vectors, not merely a list of filenames. Its save/update state is independent of local transcript metadata. Clearing metadata observations must not force rebuilding every embedding.

Editing refreshes the live Search index. Search reruns the current query and returns to the top so changed rankings can be reviewed from the start. **Update Search Index** is a separate action on desktop and iPhone. On iPhone, verify the TXT replacement before sharing the index. Both prompts show the intended folder and known parent on their own bold line. A pending update pulses, cancellation leaves it pending, and successful sharing keeps a normal active button for repeat saves. [iPhone save flow audit](iPhone_Save_Flow_Audit.md#memora-save-flows)

Reselect the transcript folder after deleting files in Files. Search reuses entries from the exact file `search-embeddings.json` for current TXT files. Missing TXT files cannot appear in rebuilt results. A deleted or superseded index entry alone marks the archive for updating, even when all remaining embeddings can be reused. The reason beside **Update Search Index** explains deletions, changed or new transcripts, or superseded versions. A successful index replacement contains only current indexed records. Numbered index files are ignored. [Index build and serialization](../js/search.js)

There are still implementation limits:
- Source loading calls the shared TXT reader, but index preparation also parses the returned File objects. A single shared parse record throughout the entire pipeline is not established by the current source.
- Releasing the fuzzy slider reruns the current query through the existing pipeline. A lexical-only recalculation optimization is a historical requirement/proposal, not a verified current fast path or timing guarantee.
- Grouping and several UI/index maps still use filenames. The current one-source view is not the durable-reference multi-archive workspace.
- iPhone file snapshots do not grant writable destination access. Sharing an index does not prove where it was saved or whether it replaced an older copy.

These are documentation observations for future review, not authorization to change the pipeline, metadata or user files in checkpoint 3.

## Search-to-Combine scope

Selected result transcripts can be passed to Combine. Their origin box shows the folder and **Search: description**, using the suggested document title without its Memora prefix. Semicolons remain between terms; commas within terms remain intact. Returning across tabs retains that subset/origin; explicitly selecting a transcript folder loads All.

The description identifies list origin, not a persistent query-history entry, current checkbox count or multi-archive collection. A new query/selection should not be confused with implemented persistent Search history.

## Research lessons worth retaining

The full [research record](archive/Search_Optimization_Research_Record.md) preserves competing models/rankers, normalization experiments, cutoffs, full distributions, labels, artifacts and numerical results. Important limitations include:

- **Rediscovery is not target-conditioned demonstration.** Blind open-ended queries should be written without the desired transcript in view. Target-known queries remain useful diagnostics but answer a different question.
- Corpus-informed themes are not a corpus-independent sample. The recorded 40-query blind benchmark was target-free at query creation, not independent of corpus knowledge.
- Zero lexical candidates from long natural-language lab queries did not adequately test the user's short remembered-clue workflow. They did not refute lexical priority.
- Compare candidate pools, representation definitions, rank direction, missing ranks, cutoffs and label semantics before comparing headline metrics.
- A sentence-heavy candidate performing well in one evaluation is not universal proof or permission to adopt a different model.
- A syntax-checked lab, downloaded model or existing cache is not a completed browser/model benchmark or verified offline execution.
- Keep false negatives, disagreement cases and unsuccessful variants. They may explain why a later proposal repeats an earlier failure.

Read the [final production handoff](archive/Search_Optimization_Research_Record.md#final-production-handoff--current-user-approved-strategy) alongside the journal's [current ranking decision](04-design-journal-sections-49-51.md#59-search-ranking-sentence-heavy-rrf-and-lexical-tie-breaking). Older ordinary-RRF/score-normalization suggestions remain dated alternatives, not silent overrides of current policy.

## Revisit and validation protocol

For a proposed change, preserve the baseline code/configuration, original records and benchmark artifacts. State whether the change concerns lexical qualification, semantic candidate retrieval, transcript ranking, representation construction, display composition or performance. Change and measure those dimensions separately.

Use a representative blind relevance track plus target-known diagnostic cases, retain complete distributions/disagreements and judge results against the same candidate set/labels. Check semicolon/comma parsing, 100% normalization, every-word threshold, lexical-first order, longer-phrase ties, zero-lexical semantic results, both fusion constants, overlap/highlighting and unchanged embedding reuse. Inspect resulting transcripts, not only summary scores.

The existing [test guide](../tests/README.md) covers relevant app, identity and data regressions; it does not establish a fresh end-to-end relevance benchmark. Real model/device tests require their own scope. No such tests were run for this documentation page.

## Conservative preservation rule

Original research and strategy files stay byte-for-byte unchanged in checkpoint 3. New summaries link to them; uncertain historical value favors retention. There is no deletion, shortening, experiment purge, algorithm change or unannounced new authorization. Future consolidation must identify the retained home of every unique lesson first.

[Documentation index](README.md) · [Current status](CURRENT_STATUS.md) · [Documentation audit](Documentation_Audit_2026-11-21.md) · [Complete research](archive/Search_Optimization_Research_Record.md)
