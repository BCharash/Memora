# Memora Dream Search Lab
## Data Analysis and Sensitivity/Selectivity Slider Optimization Plan

**Purpose:** Define a careful, evidence-based plan for evaluating Memora's dream retrieval and optimizing its sensitivity/selectivity slider.

**Core objective:** Make it as unlikely as possible that a dream the user wants to recover is missed, while still allowing results to be narrowed when too many passages are returned.

This is a memory-recovery task, not conventional question-answering. A person may remember an image but not its wording, an emotional atmosphere but not the event, or a concept that appears in several dreams.

---

## 1. Research Questions

The work should answer five questions.

### A. Can search find the intended dream?
Measure whether the target appears among the first 5, 10, or 20 results when the query is a natural recollection rather than a quotation.

### B. Can the slider reduce clutter safely?
Measure how many irrelevant passages disappear as selectivity increases, and how often the intended dream disappears too.

### C. Which kinds of memories are difficult to retrieve?
Distinguish concrete events, images, people, places, feelings, approximate phrases, and abstract or conceptual recollections.

### D. Which parts of the search system help?
Test the contributions of sentence embeddings, contextual chunks, lexical matching, and fusion. Identify whether relevant candidates are discarded too early.

### E. Do improvements generalize?
Test the selected behavior on dreams and queries that were not used to tune it.

**Priority:** Establish reliable retrieval, safe slider behavior, and generalization before trying to improve the underlying ranking algorithm.

---

## 2. Prepare the Data Without Disturbing the Archive

Three years of transcribed dreams are available as the initial working corpus. Three additional years will be added when ready.

Before evaluating search quality:

- Count transcripts per year and calculate total text size.
- Check for duplicate filenames, duplicate content, missing dates, empty transcripts, and parsing errors.
- Verify that transcript text is read correctly and filename and year remain attached to every search result.
- Check how Memora handles metadata and paragraph boundaries.
- Preserve the original year archives unchanged. The lab should work from copies or read-only imports.

Create a corpus manifest with one record per transcript, including a stable identifier, year, filename, and content hash. A content hash helps detect duplicates or changed files without relying on names alone.

Do not start by changing the embedding model or ranking weights. First understand and measure the existing system.

---

## 3. Establish What the Current Search Actually Does

The lab must not merely resemble Memora; its results should reproduce the live application's behavior.

Inspect the current implementation of:

- `semantic-worker.js` and other indexing or search workers.
- The embedding model and how it is loaded.
- Sentence-level representations and contextual chunk representations.
- Lexical matching, semantic candidate selection, and result fusion.
- Deduplication and treatment of overlapping chunks.
- The sensitivity/selectivity slider and its effect on candidate retention.
- Score thresholds, result limits, and persistent index behavior.

Reproduce the current baseline using the same model, representations, ranking rules, weights, and deduplication logic.

Preserve the distinction between a retrieval score and a probability. An RRF score, for example, does not mean that a passage has a particular percentage chance of being relevant.

### Baseline configuration

Earlier experiments suggested that Memora combines sentence-level embeddings and several contextual chunk sizes, using reciprocal-rank fusion (RRF). Verify the exact current configuration in the code before recording it as the official baseline.

---

## 4. Build a Benchmark of Genuine Memory-Recovery Queries

A large corpus alone does not tell us whether search is good. We need queries whose intended targets are known.

Aim initially for approximately 60–100 queries, if the collection supports that many genuinely different examples. Start smaller and expand as needed.

Each benchmark entry should record:

| Field | Purpose |
|---|---|
| Query | What the user would type when trying to remember the dream |
| Target transcript | The dream intended to be retrieved |
| Target passage | The specific passage or event, where identifiable |
| Query type | Event, image, person, feeling, phrase, concept, etc. |
| Calibration/validation split | Which set the query belongs to |
| Relevance judgments | Which returned passages were useful |
| Notes | Ambiguities, alternative recollections, or special circumstances |

### Blind query-creation procedure

1. Choose a dream from the archive.
2. Read it and identify a distinctive memory that could plausibly be recalled later.
3. Hide the transcript before writing the query.
4. Write the query in natural language using only what is remembered of the dream.
5. Record the intended target and the type of recollection involved.

Do not copy the transcript or reconstruct the query by looking at its original wording. Otherwise, the benchmark tests text similarity rather than memory recovery.

### Query categories

Include:

- **Concrete event:** a remembered action or sequence.
- **Visual detail:** an unusual image or object.
- **Person or relationship:** a conversation or interaction.
- **Place or atmosphere:** a familiar place that felt different.
- **Emotion:** a remembered emotional quality.
- **Approximate phrase:** a few words or a phrase vaguely remembered.
- **Conceptual recollection:** an idea or meaning that cannot be expressed in the original language.
- **Vague recollection:** only one or two uncertain clues.
- **Negative control:** a query for which no particular dream is expected to be identifiable.

These are example categories, not claims about the contents of the dream archive. Actual benchmark queries should be grounded in real recollections.

### Avoiding an overly optimistic benchmark

Do not create many nearly identical queries for one unusually distinctive dream and count them as independent successes. Keep related queries grouped by target dream, report performance both per query and per distinct dream, and ensure the validation set includes different target dreams from those used during tuning.

---

## 5. Use Three Years for Calibration and Three for Validation

The proposed division is sound. Keep the split at the source-material level, not by randomly dividing queries after creating them.

Let the six complete years be \(Y_1,\ldots,Y_6\). Designate three years for calibration and the other three for held-out validation. Fix the assignment before tuning.

The assignment can consider archive completeness, transcript counts, and changes in recording or transcription style, but it must not be chosen because it produces better search results.

### Workflow

1. **Calibration — 3 years:** develop queries, judge results, compare ranking methods, and tune the slider.
2. **Freeze the configuration:** record model, ranking rules, candidate limits, weights, deduplication, and slider behavior.
3. **Validation — 3 untouched years:** evaluate the selected configuration without further tuning.

If validation exposes a serious weakness and the configuration is changed, that validation set has effectively become part of development. A fresh holdout would then be needed for another independent claim of generalization. Avoid repeated tuning against validation results.

---

## 6. Measure the Right Things

Do not use one aggregate score as the sole measure of success.

### Primary retrieval metrics

| Metric | What it tells us |
|---|---|
| Target Recall@5 | How often the intended dream appears in the first five results |
| Target Recall@10 | How often it appears in the first ten |
| Target Recall@20 | How often it appears in the first twenty |
| Mean reciprocal rank (MRR) | How high the intended dream usually appears |
| nDCG@10 | Whether relevant and irrelevant passages are ordered usefully |
| False-match rate | How often negative-control queries produce misleadingly convincing results |

Also count the number of irrelevant passages encountered before the target. This approximates the effort required to find a memory.

For example, moving the target from rank 15 to rank 4 is a meaningful improvement. Removing eight irrelevant results but pushing the target from rank 4 to rank 12 may be a poor trade, even if an average score looks better.

### Judge more than the intended target

The intended target is the strongest reference point, but it is not necessarily the only useful result. A different dream about a recurring person or image may help recover the memory.

Use graded judgments:

- **Target:** the intended dream or passage.
- **Useful:** a different passage that genuinely helps with the recollection.
- **Irrelevant:** no meaningful help.
- **Uncertain:** insufficient information to judge confidently.

Avoid optimizing a system that finds one exact target while discarding other useful memories.

---

## 7. The Sensitivity/Selectivity Slider

The proposed user experience:

- **Far left: Maximum sensitivity.** Preserve the current broad-retrieval behavior and minimize the risk of discarding a relevant dream.
- **Moving right: Increasing selectivity.** Remove more weak or redundant candidates, reducing clutter while accepting some risk of missing relevant material.

The leftmost setting should reproduce the existing baseline as closely as possible. It should not silently introduce a new threshold.

### Determine what the slider actually controls

Several different implementations are possible.

#### A. Candidate retention
Keep a certain number or fraction of the best candidates from each representation before combining them.

**Risk:** a useful passage may be discarded before fusion can consider it.

#### B. Score threshold
Reject passages whose similarity or final ranking score falls below a threshold.

**Risk:** scores may not be comparable across representations or query types.

#### C. Diversity and deduplication
Reduce repeated passages from the same dream or overlapping chunks while preserving distinct relevant memories.

**Risk:** aggressive deduplication can collapse separate but meaningful events.

These are not interchangeable. A slider that changes candidate retention behaves differently from one that changes a score threshold. Neither should be confused with a control that merely limits the number of results displayed.

First inspect the current implementation and establish which behavior is already present.

### Experimental comparison

Run the same queries against these candidate-selection strategies:

1. **Current behavior:** reproduce existing settings without modification.
2. **Broader candidate pool:** retain more candidates from each representation before fusion.
3. **Final-score threshold:** apply a threshold after fusion, if the score distribution supports this.
4. **Per-representation threshold:** retain candidates according to each source's own scores.
5. **Deduplication variations:** compare how aggressively overlapping chunks and repeated passages are collapsed.
6. **Hybrid strategies:** combine a broad candidate pool with cautious final filtering.

Do not assume a threshold is better merely because it is mathematically convenient. Human relevance judgments must decide.

For each strategy, record the target's rank, whether it survives into the final results, the number of useful passages returned, and the number of irrelevant passages that remain.

### Test early candidate loss

If candidates are capped independently for each representation, a relevant passage can disappear from every candidate list before fusion has an opportunity to rank it.

Compare current candidate limits against a larger union of candidates before deduplication and fusion. If the larger pool recovers important dreams at an acceptable computational cost, this informs the slider's design.

Also test whether a setting behaves differently for short concrete queries and long conceptual queries. A universal threshold may not be equally appropriate for both.

---

## 8. Choose Actual Slider Values Using Evidence

Do not choose arbitrary labels such as 50%, 70%, and 100% and assume they have meaningful statistical interpretations.

Run the calibration benchmark at a sequence of settings from maximum sensitivity to maximum selectivity. For each setting, measure the trade-off between useful retrieval and clutter.

### Selection procedure

1. Identify the broadest setting that reliably retrieves target dreams.
2. Increase selectivity gradually and measure which targets disappear.
3. Examine lost targets individually for systematic weaknesses.
4. Determine whether a small increase in clutter buys a substantial improvement in recall.
5. Use the held-out validation set to check that the chosen operating range generalizes.

For this use case, losing an important dream is more costly than returning several extra passages. This does not mean recall must be perfect at any cost; it means that a setting with slightly more clutter may be preferable if it substantially reduces the chance of a missed memory.

The finished interface could offer three suggested operating points — **Broad**, **Balanced**, and **Selective** — while retaining a continuous slider. These labels should be based on measured performance rather than chosen in advance.

---

## 9. What the Lab Should Show

Extend the existing Search Lab with a dedicated calibration view.

### Core metrics

For each setting, display:

- Target recall at 5, 10, and 20.
- Useful results retained.
- Targets lost compared with the broad baseline.
- Irrelevant results removed.
- Indexing time and search latency.
- Results broken down by query type and year.

### Essential diagnostic features

- Compare two configurations side by side.
- Inspect exact passages and their ranks.
- See which representation retrieved each passage.
- Identify the threshold or candidate limit responsible for a lost result.
- Export settings, rankings, judgments, and metrics to JSON.
- Re-run experiments without losing previous results.

### Lost-target inspection

For every setting, identify queries whose targets were found at maximum sensitivity but disappeared at higher selectivity. This is one of the most important diagnostic views in the lab.

---

## 10. Implementation Sequence

1. **Inspect the existing lab and live search code.** Document current behavior and save a reproducible baseline.
2. **Load the three available years.** Validate transcript parsing, metadata, duplicates, and corpus statistics.
3. **Complete the remaining three years.** Preserve the year-by-year archives and finalize the six-year corpus manifest.
4. **Fix the calibration/validation split.** Choose three years for development and three for independent evaluation before tuning.
5. **Create the benchmark.** Build realistic queries and record targets, including difficult conceptual and vague recollections.
6. **Establish the baseline.** Verify that the lab reproduces live Memora's retrieval behavior.
7. **Run controlled experiments.** Test candidate retention, thresholds, fusion, and deduplication one change at a time where practical.
8. **Calibrate the slider.** Choose settings using retrieval metrics, human judgments, and inspection of lost targets.
9. **Validate once.** Freeze the chosen configuration and evaluate it on the held-out years.
10. **Decide what to change in Memora.** Make changes supported by results, then test the actual application.

---

## Final Recommendation

Resist the temptation to start by changing the embedding model or inventing a more elaborate ranking algorithm. First establish whether the existing search system retrieves the memories that matter and whether the slider discards them unnecessarily.

The most valuable result may not be a new algorithm. It may be discovering that the current ranking works reasonably well but the candidate cutoff is too aggressive — or that one type of query needs different treatment from another.

The three available years provide the material to start. The other three will let us test whether conclusions hold across a broader collection.

### First step when work resumes

Start with the actual `semantic-worker.js`, the current Search Lab HTML, and the current design journal. This will turn the plan into a technically grounded experiment rather than another tool whose behavior only approximates Memora.
