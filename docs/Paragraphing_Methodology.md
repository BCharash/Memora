# Paragraphing methodology — current behavior and preserved decisions

Reviewed **21 November 2026**, source **c4c3816**, application **2026-11-21.10**. This page documents existing implementation and the reasoning behind it. It makes no algorithm, model, parameter, archive or acceptance change.

**The full [R4/R5 decision and technical record](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) remains intact.** Its exact experimental code, alternatives, numerical comparisons, editorial judgments, artifact names and caveats are retained. This synopsis is a reading aid, not a replacement for that evidence.

## Purpose and current ownership

Paragraphing makes raw spoken transcription easier to read by selecting paragraph boundaries. It uses sentence embeddings and deterministic boundary selection, not a text-generation model that rewrites the transcript.

| Owner | Current responsibility |
|---|---|
| [app.js](../js/app.js), transcription post-processing | Runs paragraphize on generated spoken text when the Transcribe paragraph option is checked; the option defaults on. Readable transcript metadata is assembled afterward. |
| [paragraphing.js](../js/paragraphing.js) | Input preservation/normalization, heuristic sentence splitting, R4 scores, candidate selection and paragraph assembly. Also exposes paragraphizeTranscript for a complete metadata-bearing TXT. |
| [paragraphing-worker.js](../js/paragraphing-worker.js) | Queued sentence embedding requests and model instance reuse. |
| [Combine UI](../js/combineUI.js) and output workflow | Preserve loaded transcript paragraph structure; there is no Combine paragraphing selector. |

Search uses the same MiniLM model family for a different purpose. Its semantic worker/store and the paragraphing worker are separate owners; do not assume shared live model memory, worker lifetime or cache entries merely because the repository name matches.

## Input preservation matters before scoring

Current production behavior differs from the historical experiment's paragraph-by-paragraph reprocessing loop:

1. An empty/non-string input returns an empty string.
2. If spoken input contains any blank-line paragraph separator, paragraphize returns the **entire original input unchanged**, without embedding or rescoring. It does not selectively split only the long existing paragraphs.
3. Otherwise the function normalizes line breaks/whitespace and splits sentences with abbreviation/punctuation heuristics.
4. Text of **120 words or fewer**, or with fewer than **four sentences**, returns without model work after that normalization.
5. Longer eligible raw text is embedded, scored and assembled into paragraph-separated sentence groups.

The complete-TXT helper locates a dashed metadata/body separator. It also returns the original complete TXT if the spoken body already has blank lines. Otherwise it keeps metadata/separator content ahead of the processed body; that processing path normalizes line endings and is not a byte-for-byte file-preservation guarantee. Normal transcription uses the spoken-text path before headers are built.

The intent is to retain wording while changing paragraph structure, but sentence splitting and whitespace/abbreviation normalization are real operations. Do not describe processed output as guaranteed identical bytes or punctuation. Preserve source files and compare actual text if an algorithm change is proposed.

## Embeddings and sentence boundaries

The current worker imports Transformers.js **3.7.2**, using **Xenova/all-MiniLM-L6-v2**, **q8**, mean pooling and normalized sentence vectors. It embeds sentences sequentially within a queued request and reuses its model instance. Initial runtime/model retrieval can require networking; browser cache presence is not proof of a complete offline package.

The sentence splitter is heuristic. It handles a small abbreviation set and sentence-ending punctuation; it is not a linguistic parser. Unusual abbreviations, missing speech punctuation and language differences can shift the candidate positions. Reproducing an experiment requires the same text preprocessing, model/runtime and candidate definitions, not merely an R4 label.

## Current Revision 4 scoring

For a boundary between adjacent sentences, R4 computes:

- **shortShift:** one minus cosine similarity between mean embeddings of up to two sentences on each side.
- **longShift:** the equivalent comparison over up to four sentences on each side.
- **localGap:** one minus cosine similarity of the two adjacent sentence vectors.

**semanticShift = 0.55 × shortShift + 0.30 × longShift + 0.15 × localGap**

Short-range change has the largest weight; broader context and immediate discontinuity provide additional evidence. This measures a representation shift, not human editorial correctness.

| Current R4 setting | Value / effect |
|---|---|
| reprocessAboveWords | 120; below/equal this raw-text size no embedding is requested. The name also comes from the historical experiment. |
| minSegmentWords / minSegmentSentences | 42 words and 2 sentences on each side, measured against already chosen neighboring boundaries. |
| shortWindow / longWindow | 2 / 4 sentence vectors per side, clipped at text boundaries. |
| minimumScore / quantile | Candidate semantic score must meet max(0.058, 62nd-percentile score). |
| localRadius | 1 adjacent candidate on each side; peak comparison allows tolerance 0.012. |
| minBoundaryGapSentences | 2. |
| softReviewWords / pressureCap | Ranking pressure starts after word offset 165 and is capped at 0.035. |

Candidates first satisfy semantic threshold and local-peak criteria. Ranking adds **min(0.035, max(0, wordsBefore − 165) × 0.00012)** using the word offset before the candidate. The pressure changes candidate priority; it does not make an otherwise ineligible boundary valid.

Higher-priority candidates are considered first. A boundary is rejected if neighboring chosen boundaries would leave an undersized segment or violate separation. Accepted boundaries are returned in sentence order. Length alone never forces a split; a long paragraph can remain if no boundary qualifies.

The source functions, not a copied table, remain the implementation authority. The preserved research includes exact R4/R5 experimental functions for independent comparison.

## Why R4 was selected over R5

The preserved comparison covered **93 transcripts**. The figures below are historical observations from that record, not a benchmark rerun against today's code or devices.

| Observation | R4 | R5 |
|---|---:|---:|
| Output paragraphs | 485 | 420 |
| Median paragraph length, words | 83 | 96 |
| Paragraphs over 180 words | 42 | 58 |
| Longest paragraph, words | 531 | 531 |
| Proposed boundaries | 392 | 327 |
| Boundaries unique to that revision | 110 | 45 |
| Unique boundaries judged useful or defensible | 67/110 | 18/45 |

The algorithms shared **282 boundaries**. Editorial review focused on their disagreements. More paragraph breaks alone did not select R4; the review judged more of R4's unique breaks useful, while its output also better matched the user's readable paragraph-density preference.

R5 tested persistence of a semantic shift beyond a boundary. That is a plausible alternative, retained for future comparison. In these observations it removed some useful rhetorical divisions: a general idea followed by an example, personal application or related story can deserve a paragraph break without a sustained topic change. The persistence test did not establish a compensating editorial advantage.

These judgments are subjective and specific to the reviewed material. “Useful or defensible” is not the same as essential or objectively correct. **67/110 is not R4 accuracy across all boundaries**, and the shared 282 boundaries were not independently rescored by that disagreement review. Neither revision eliminated every very long paragraph.

See the complete record's [quantitative comparison](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md#4-quantitative-comparison-across-all-93-transcripts), [selection rationale](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md#9-why-r4-was-selected-over-r5), exact code and full-context examples.

## Revisit protocol

Revisit for a documented failure pattern, representative contrary evidence, a model/runtime/preprocessing change, or an explicit user request. Imperfection alone is not a reason to restart broad algorithm exploration.

1. Preserve the existing source, configuration, corpus/output artifacts and original research.
2. State the concrete defect and show multiple full-context examples.
3. Compare complete paragraphs on both sides, including good boundaries a change might remove.
4. Hold corpus, embedding runtime and sentence splitting fixed when testing a boundary-rule change; explicitly separate any other changed variable.
5. Record helpful, fragmenting and borderline changes, with transcript/boundary identity.
6. Compare against both R4 and R5; inspect the long-paragraph tail as well as average counts.
7. If evidence is inconclusive, retain R4. Keep rejected candidates and the reason for rejection.

Follow the original [limitations and revisit protocol](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md#10-what-this-comparison-does-and-does-not-prove). Some lab/JSON/editorial artifacts named there are external and not bundled in this checkout. Keep their provenance; do not claim to have rerun an unavailable experiment.

## Validation and preservation boundary

This page was checked against the current source and original record. No model, timing, browser paragraphing or private-archive experiment was run. It does not establish a new quality/performance result.

The complete historical record stays at its existing path and remains byte-for-byte unchanged in checkpoint 3. Uncertain future value is a reason to retain material. No historical algorithm, failed experiment or source snapshot is deleted or shortened.

[Documentation index](README.md) · [Current status](CURRENT_STATUS.md) · [Documentation audit](Documentation_Audit_2026-11-21.md) · [Full research record](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md)
