# Memora Search Model Optimization

**Consolidated design, research plan, evidence, and implementation
handoff**\
**Prepared:** 2026-10-23

## 1. Purpose and governing principle

Memora search is a **memory-recovery tool**. The user is trying to find
a transcript they want to rediscover despite having only limited,
incomplete, or imperfect recollection of what it contains.

This is not a question-answering system. The goal is not to answer
questions using the transcript archive, synthesize knowledge from it, or
retrieve passages merely because they discuss a topic. The goal is to
help the user locate the recording they have in mind.

This distinction governs query design, evaluation metrics, cutoff
selection, and presentation.

The optimization objective is to make it unlikely that the intended
recording is missed, while keeping the result list manageable. Since
missing a wanted memory is usually more costly than returning some extra
candidates, broad retrieval should be protected until evidence shows how
much selectivity can safely be applied.

**Core principle:** Optimize the user's ability to rediscover a
transcript from a realistic recollection---not a model's ability to
answer a question about the corpus.

## 2. What the system must support

A person may remember:

-   a distinctive image or object, but not the words used to describe
    it;
-   an event or sequence of actions;
-   a person, relationship, or interaction;
-   a place or atmosphere;
-   a feeling or emotional impression;
-   the general subject of a recording;
-   a few approximate words;
-   only one or two uncertain clues;
-   a gist that is broadly correct but imperfect in some details.

The user may describe the memory in different language from the
transcript. They may omit details, conflate nearby events, or remember
one part clearly and another part incorrectly. A query should resemble
something a person would genuinely type while trying to find an old
recording.

Search should return the recording and useful matching context. It
should not be judged as though every query has one uniquely correct
textual answer. Another transcript may also be useful if it genuinely
helps the user rediscover the memory; ambiguous queries can have
multiple relevant recordings.

## 3. Existing corpus and technical baseline

The latest Search Laboratory reports describe:

-   114 transcript files;
-   3,832 candidate passage representations;
-   1,892 sentence representations;
-   915 3--1 chunks;
-   590 5--2 chunks;
-   435 7--3 chunks;
-   embedding model `Xenova/all-MiniLM-L6-v2`, Transformers.js 3.7.2,
    384-dimensional embeddings;
-   browser-local inference, with CDN use for library and model assets
    rather than hosted transcript inference;
-   `search-embeddings.json` containing exact representations for all
    114 transcripts in the reported archive, with no missing, partial,
    or invalid transcript representations.

These facts describe the reported archive and runs; verify them again if
the corpus or lab changes.

The lab must reproduce production Memora's actual search behavior.
Before changing ranking or model settings, inspect the current
production code, including:

-   `semantic-worker.js` and other indexing/search workers;
-   embedding model and loading;
-   sentence and contextual chunk generation;
-   lexical matching and normalization;
-   independent candidate selection and ranking;
-   fusion strategy;
-   the sensitivity/selectivity slider;
-   result limits and thresholds;
-   deduplication, overlap, and contextual composition;
-   persistent index behavior.

Do not treat a lab that merely resembles production as proof of
production behavior. Keep the transcript archive read-only and
unchanged.

### Production and laboratory details to verify

Prior project notes describe lexical matching as a contiguous
token-window matcher in which query words must meet a fuzzy threshold,
with inflectional normalization. They also describe separate lexical,
sentence-semantic, and contextual retrieval paths for 3--1, 5--2, and
7--3 representations. Verify these against the current source before
treating them as definitive.

Prior production-like ordering has been described as lexical → semantic
sentence → 3--1 → 5--2 → 7--3. This is a display/category hierarchy, not
proof that an earlier category is more semantically relevant.

## 4. Query design: clever, realistic, and MiniLM-aware

The query benchmark is one of the most important parts of this work.
Replacing a few words with synonyms is not enough. Nor should we write
elaborate riddles that MiniLM is predictably unable to resolve.

We need **carefully engineered memory-recovery queries** that probe
semantic matching under realistic conditions and respect the limitations
of `all-MiniLM-L6-v2`.

### 4.1 The right source for queries

Each benchmark query must be grounded in an actual transcript and have a
verified intended target recording. The target passage or event should
be recorded as evidence, but the user-facing query must be written as a
plausible recollection rather than copied from the transcript.

Use a blind query-creation procedure:

1.  Select a transcript and identify a memorable event, image, person,
    place, feeling, or situation.
2.  Record the target passage and transcript identifier.
3.  Hide the source wording while composing the query, or otherwise
    avoid copying its language.
4.  Write what a person might actually type from partial recollection.
5.  Reopen the transcript and verify that the target is genuinely
    supported.
6.  Record the query's intended challenge, expected difficulty, and any
    ambiguity.

A query should not be admitted simply because it sounds clever. It
should represent a plausible human recollection and a fair test of the
model.

### 4.2 Query families

Build a balanced set covering different kinds of recollection:

-   **Distinctive visual detail:** an unusual object, image, setting, or
    combination of details.
-   **Remembered event:** what happened, perhaps without remembering the
    original verbs.
-   **Situation or interaction:** who was involved and the general
    situation.
-   **Place or atmosphere:** a familiar location that felt unusual, or a
    remembered setting.
-   **Emotion or impression:** how the event felt, where the transcript
    gives a concrete basis for that impression.
-   **Conceptual recollection:** the broad idea or meaning remembered in
    different language.
-   **Partial recollection:** only one useful clue is remembered.
-   **Imprecise recollection:** the gist is right but one nonessential
    detail is uncertain or slightly wrong.
-   **Approximate phrase:** a fragment remembered imperfectly.
-   **Person or relationship:** a remembered interaction, with due
    attention to names and lexical cues.
-   **Context-dependent memory:** a sentence is insufficient alone, but
    its surrounding chunk makes the event recognizable.
-   **Ambiguous recollection:** several transcripts could reasonably
    match.
-   **Negative/control query:** no particular target is expected; useful
    for detecting convincing-looking false matches.

These categories are evaluation strata, not claims about what every
transcript contains.

### 4.3 What makes a query clever

A strong query probes a meaningful semantic distance while retaining a
plausible connection to the target. For example, if a verified passage
describes someone remaining in a difficult situation because of
obligation and concern, a query might describe "feeling unable to walk
away because leaving would hurt someone." That is more useful than
mechanically swapping synonyms, but it remains grounded in the passage's
actual meaning.

This is an illustrative pattern, not a claim that the archive contains
that passage. Actual queries must be written from inspected transcript
content.

A good query should: - express a realistic recollection rather than a
formal information request; - vary the conceptual framing, not just
individual words; - preserve enough semantic signal for MiniLM to
plausibly retrieve the target; - avoid adding unsupported causal claims
or invented details; - avoid requiring multi-step reasoning, subtle
logic, or inference that the embedding model cannot perform; - be
concise enough to retain a coherent semantic signal; - be sufficiently
discriminative to be useful for locating a recording.

### 4.4 MiniLM limitations to account for

MiniLM embeddings represent semantic similarity; they do not reliably
perform symbolic reasoning or verify every detail in a query. Known risk
areas to test carefully include:

-   long multi-part queries whose semantic signal is diluted;
-   negation and contrasts;
-   fine-grained causal implications;
-   obscure names and rare details;
-   queries whose key clue is a small part of a much broader passage;
-   situations that require combining several independent clues;
-   vague queries that could reasonably refer to many recordings.

Do not make the main benchmark consist of queries that are known in
advance to be poor fits for the model. Put deliberate limitation probes
in a separate, labelled challenge set. Their purpose is to characterize
boundaries, not to penalize the system unfairly.

### 4.5 Avoid circular or overly optimistic testing

Do not write a query by repeatedly looking at the source sentence until
it contains the most embedding-friendly wording. That overfits the
benchmark to the target.

Do not create many near-duplicate queries for one unusually distinctive
transcript and count them as independent successes. Group queries by
target recording and report results both per query and per distinct
transcript.

A useful initial target is approximately 60--100 genuine queries if the
corpus supports that many distinct examples. Begin with a smaller
well-grounded set and expand; quality and diversity matter more than
hitting a quota.

### 4.6 Benchmark records

Each query should include:

  -----------------------------------------------------------------------
  Field                               Purpose
  ----------------------------------- -----------------------------------
  Stable query ID                     Reproducible comparison

  Natural recollection query          What the user would type

  Target transcript ID/name           Intended recording

  Target passage/event                Evidence that the target is correct

  Query family                        Event, image, person, feeling,
                                      concept, etc.

  Expected challenge                  What capability is being tested

  Model-fit rationale                 Why MiniLM has a plausible chance
                                      of matching it

  Calibration/validation split        Prevents tuning on the evaluation
                                      set

  Ambiguity notes                     Alternative targets or uncertain
                                      details

  Relevance judgments                 Target, useful, irrelevant,
                                      uncertain

  Query provenance                    How the query was constructed and
                                      verified
  -----------------------------------------------------------------------

## 5. Evaluate rediscovery, not question answering

The primary evaluation unit is the **recording the user wants to
rediscover**. A relevant passage is evidence that the recording is the
intended one, and context may help the user recognize it. But a search
system is not being asked to synthesize an answer.

Measure:

-   whether the intended transcript appears;
-   its rank and the number of results the user must examine before
    reaching it;
-   whether the result provides enough context to recognize the
    recording;
-   whether other returned transcripts are genuinely useful;
-   whether selectivity removes the intended transcript;
-   whether ambiguous queries reasonably surface multiple useful
    candidates.

Recommended metrics include:

-   target transcript Recall@5, Recall@10, and Recall@20;
-   mean reciprocal rank (MRR) of the intended transcript;
-   rank distribution, including median and tail cases;
-   number of irrelevant results encountered before the target;
-   graded nDCG@10 where relevance judgments support it;
-   false-match behavior for negative/control queries;
-   performance by query family and by distinct target transcript;
-   result usefulness and contextual recognizability;
-   latency and computational cost as operational measures, not quality
    measures.

Use graded judgments: - **Target:** intended transcript or passage. -
**Useful:** another result that genuinely helps with the recollection. -
**Irrelevant:** does not help locate the intended memory. -
**Uncertain:** not enough evidence to judge confidently.

A non-target transcript is not automatically a false positive. Some
queries are ambiguous and multiple recordings may help. Do not claim
precision or recall without defined and reviewed relevance labels and a
sufficiently complete judged pool.

## 6. Examine the full result distributions, not only the top 20

Twenty results is a reasonable user-interface display limit, but it is
not an adequate experimental analysis limit.

The lab should preserve **all scored candidates for each query and each
retrieval method**, where feasible. For each query, retain the complete
ranking and score distribution for:

-   lexical retrieval;
-   sentence-semantic retrieval;
-   3--1 contextual chunks;
-   5--2 contextual chunks;
-   7--3 contextual chunks;
-   any fusion or production-style combined ranking.

The existing lab's calibration design has already tested score cutoffs
and candidate counts, but earlier exports capped detailed ranked lists.
Expand the export so analysis does not lose the tail of the
distribution. If file size becomes excessive, keep a complete
machine-readable candidate export separate from a compact summary
report; do not silently truncate results.

For each method/query pair, record: - candidate count and total
representation count; - every candidate's score, rank, transcript
identifier, representation type, passage text, and source metadata; -
target rank and target score, if applicable; - score percentiles and
distribution summaries; - gaps between adjacent top scores and any
substantial rank transitions; - candidate counts at tested cutoffs; -
whether the target and judged useful results survive each cutoff; -
transcript diversity and repeated hits from the same transcript; -
retrieval time and other relevant runtime data; - candidates omitted by
production caps and the reason for omission; - overlap/composition
metadata without discarding the underlying candidates.

Do not confuse the full analytical result set with the user-facing
result list. The user may see 20 results while the lab studies all
candidates to understand cutoff behavior.

## 7. Determine cutoffs from distributions and user outcomes

The user's intuition is correct: each sentence/chunk retrieval path has
a score distribution that should be examined when selecting cutoffs. But
distributions alone cannot establish relevance. A score threshold or
percentile describes similarity within a run; it is not a probability
that a passage is useful.

Compare cutoff strategies separately for sentences, 3--1, 5--2, and 7--3
representations.

### 7.1 Strategies to evaluate

1.  **Absolute score thresholds:** retain candidates above fixed score
    levels.
2.  **Query-relative percentiles:** test thresholds based on each
    query's score distribution.
3.  **Score-gap rules:** examine whether a clear drop separates stronger
    candidates from the tail.
4.  **Candidate-count/depth limits:** compare how many candidates are
    available before fusion.
5.  **Per-representation thresholds:** avoid assuming sentence and chunk
    scores are directly comparable.
6.  **Post-fusion thresholds:** where the fused score has a defensible
    interpretation.
7.  **Diversity and redundancy handling:** control repeated or
    overlapping presentations without suppressing useful context.

For each setting, calculate how many candidates remain and whether the
intended target and judged useful transcripts survive. Examine
individual lost targets, not just averages.

### 7.2 Cutoff statistics

For each full score distribution, report: - minimum, maximum, mean,
median, standard deviation where useful; - quantiles and score
histograms or distribution bins; - adjacent score gaps, especially near
proposed cutoffs; - candidate count at each cutoff; - target retention
and rank change; - number of judged useful, irrelevant, and uncertain
results retained; - variation across query types and representation
families.

The distribution may suggest candidate cutoffs to test, but human
judgments determine whether those cutoffs help. A high score can still
be irrelevant, and a lower score can still be the memory the user wants.

### 7.3 Tune for safe rediscovery

The priority is not to minimize result counts. It is to find the most
selective behavior that keeps the risk of losing the desired recording
acceptably low.

For each candidate slider setting: 1. Compare it with the broadest
baseline. 2. Count intended transcripts that disappear. 3. Inspect each
lost target and the representation/cutoff that removed it. 4. Count
judged useful results retained and irrelevant results removed. 5.
Examine whether the trade-off differs by query family. 6. Prefer a
slightly larger result list if it materially reduces missed memories. 7.
Validate the selected operating range on untouched queries/transcripts.

Do not choose arbitrary slider values such as 50%, 70%, and 100% and
imply that these have statistical meaning. Map the slider to measured
candidate-retention or filtering behavior and document the semantics.

## 8. Sentence versus chunk retrieval and result composition

Compare sentence, 3--1, 5--2, and 7--3 representations on the same
queries. Evaluate not only target rank but also whether a broader
context window makes the result recognizable.

A sentence may match the query but lack the information the user
remembers. A chunk may provide the surrounding people, action, or
setting needed to recognize the dream. Conversely, larger chunks can
introduce unrelated content and create misleading semantic matches.

The user's explicit overlap requirement is:

**Suppress only direct duplicate/overlap representations in the final
presentation; preserve useful nested context as part of a composite
result.**

A matching sentence may be the anchor, with its directly containing 3--1
and/or 7--3 context attached or expandable. Avoid presenting multiple
redundant standalone cards for the same event, but do not discard a
wider context merely because it contains the matching sentence or
overlaps a narrower chunk.

Keep all underlying candidates in the lab for analysis even when
production-style presentation composes or suppresses them. Do not use
post-suppression count as a proxy for relevance or search quality.

## 9. Compare retrieval depth and ranking strategy under controlled conditions

Change one major factor at a time where practical.

### 9.1 Depth sweep

Run the same queries using baseline ranking at depths 30, 50, 100, and
200. Hold all other settings constant.

For each query and depth, record: - target and useful transcripts
found; - target rank; - relevant results among top 5, 10, and 20; -
newly recovered relevant candidates at greater depth; - candidates added
that are judged irrelevant; - candidates that affect the final top 20; -
latency and total runtime.

The question is not whether deeper retrieval returns more candidates. It
is whether deeper retrieval finds useful memories that were previously
missed and improves final presentation.

### 9.2 Ranking strategy sweep

At a fixed depth, compare baseline, RRF, and hybrid strategies on the
same queries and corpus. Keep other settings constant.

Verify that RRF actually combines independent retrieval-family ranks,
not merely fields sorted from one shared candidate list. Document hybrid
normalization and score semantics; within-category normalization can
make a weak candidate appear strong, and lexical zero scores for
non-sentence chunks may affect comparisons.

Compare target rank, useful-result retention, clutter, and failure
cases. Do not declare a winner from cosine scores or candidate counts
alone.

### 9.3 Sweep integrity

The lab must: - return structured success/failure outcomes from each
run; - stop a sweep on failure or clearly mark partial completion; -
preserve errors across all sub-runs; - record intended configurations
and actual per-configuration counts; - record completed, cancelled, or
failed status durably; - never announce success if an internal run
failed; - use the actual configured depth in audit explanations; -
validate before export that all required query/configuration
combinations exist.

A syntax check is not a browser test. Do not claim archive loading,
model execution, sweep behavior, cancellation, or export was verified
unless it was actually tested.

## 10. Relevance judgments and cutoff calibration

Human judgments are necessary because embedding scores alone cannot
distinguish a useful memory from a semantically related but unhelpful
passage.

Use a pooled set of candidates from all methods and depths so deeper
results are not automatically excluded from judging. Judge the same
underlying passage consistently across configurations.

For a manageable initial study: 1. Select a balanced group of verified
target transcripts and query types. 2. Pool candidates from lexical,
sentence, chunk, and fusion methods. 3. Include candidates beyond the
current top 20, especially those exposed by deeper retrieval. 4. Mark
results Target, Useful, Irrelevant, or Uncertain. 5. Record why a result
was useful or misleading when the judgment is not obvious. 6. Use the
judgments to evaluate cutoffs and ranking methods. 7. Preserve judgments
in a separate export and keep them linked to stable query and candidate
identifiers.

Precision is the fraction of judged displayed results that are relevant.
Recall requires a defined pool of relevant items, including relevant
items not retrieved by a configuration. If the pool is incomplete, call
recall estimated or avoid reporting it as definitive.

## 11. Calibration and held-out validation

The optimization should generalize beyond the queries used to tune it.

Where the complete six-year corpus is available, split by source
material rather than randomly splitting near-duplicate queries. A
proposed plan is three years for calibration and three years for
held-out validation, with the assignment fixed before tuning. Choose the
split based on completeness and representativeness, not because it
yields favorable results.

Workflow: 1. Fix the calibration/validation split. 2. Build and judge
queries for calibration material. 3. Tune candidate limits, cutoffs,
fusion, and slider behavior. 4. Freeze and record the selected
configuration. 5. Evaluate once on untouched validation material. 6. If
validation results are used to tune the system, treat that set as
development data and obtain a fresh holdout before claiming independent
generalization.

If the full six-year corpus is not yet available, begin with a
documented provisional split and do not imply that the final validation
protocol is complete.

## 12. Laboratory interface and exports

Add a dedicated benchmark/calibration view to the existing Search
Laboratory.

It should support: - side-by-side configuration comparisons; - full
ranked-candidate inspection; - sentence and chunk comparisons for the
same query; - filters for query family, representation, score band,
rank, and target transcript; - full score-distribution plots or
tables; - cutoff curves showing candidate counts and
target/useful-result retention; - explicit target-loss inspection for
each slider setting; - per-candidate relevance judgments; - clear
display of retrieval source, score, original rank, transcript, passage
text, and context; - export of all candidates and scores, not only the
top 20 or top 100; - a compact summary report plus a complete detailed
candidate file when needed; - export of query definitions, judgments,
settings, timings, errors, archive hashes, and run provenance; -
repeatable runs without silently replacing earlier experiments.

The report should distinguish raw retrieved candidates, post-cutoff
candidates, fused ranking, and final composite display. Those are
different stages and should not be conflated.

## 13. Current evidence and cautions

The project handoff notes document earlier reports with 16 queries at
baseline depth 30. Those reports had repeatable counts and first
displayed results but no controlled depth/ranking sweeps and no
relevance judgments. They established baseline repeatability, not search
quality.

The subsequent 20-query full-calibration reports describe: - 114
transcripts and 3,832 representations; - lexical, sentence-semantic,
3--1, 5--2, and 7--3 methods; - lexical fuzzy-threshold sweeps; -
semantic score-cutoff quantiles; - lexical score cutoffs; - 70
fusion-weight combinations; - a caveat that non-target candidates cannot
be labelled false positives without relevance judgments.

An earlier run with long natural-language paraphrases yielded zero
lexical candidates for all 20 queries. This was not sufficient evidence
of a production lexical regression because the lexical matcher searches
for contiguous query-word windows. A later diagnostic run used compact
phrase-like queries and showed that the laboratory lexical method could
retrieve candidates and rank the designated target transcript first for
all 20. This established a lexical sanity check, not that production is
free of regressions and not a fair test of semantic paraphrases.

Keep these distinctions explicit: - query design can make a method
appear broken when the query does not suit its retrieval behavior; - a
successful target transcript rank does not prove every returned passage
is relevant; - high similarity is not a probability of usefulness; - a
larger candidate set is not automatically better; - a smaller
post-suppression list is not automatically better; - a successful lab
syntax check is not a browser test; - a target transcript may be one of
several useful results for an ambiguous recollection.

## 14. Implementation sequence

1.  Read this document and inspect the current production search code
    and current Search Laboratory HTML.
2.  Confirm the current corpus manifest, embedding coverage, and stable
    transcript identifiers.
3.  Repair sweep error handling, provenance, depth-aware audit text, and
    export consistency checks.
4.  Ensure the lab retains full candidate distributions and complete
    ranked results for every method.
5.  Implement and verify the direct-overlap-only composite presentation
    rule without discarding nested context.
6.  Build a carefully grounded benchmark of natural memory-recovery
    queries, with target evidence and model-fit rationale.
7.  Separate calibration and validation material.
8.  Run a full baseline and save all candidates, scores, ranks, and
    metadata.
9.  Run controlled depth and ranking sweeps.
10. Judge a pooled set of results from all methods and depths.
11. Analyze full distributions and tune cutoffs for safe rediscovery.
12. Evaluate slider settings, including which targets are lost at each
    setting.
13. Freeze the selected configuration and test it on held-out material.
14. Make production changes only when supported by the measured results.

## 15. Continuity and artifact rules

-   Preserve transcript archives unchanged; keep transcript inference
    local. CDN downloads for JavaScript libraries and model assets are
    acceptable under the current design.
-   Do not claim to have executed browser/model experiments unless they
    were actually executed.
-   Distinguish measured results from hypotheses and recommendations.
-   Preserve the original filenames inside ZIPs when delivering updated
    code artifacts.
-   Do not ask the user to repeat decisions already documented here.
-   Do not revert to optimizing overlap suppression as the primary
    objective.
-   Do not turn the benchmark into a question-answering evaluation.
-   The intended user outcome is rediscovering the right transcript from
    incomplete recollection.

## Final objective

Deliver a search experience that helps users find the recordings they
remember imperfectly. Use realistic, carefully designed semantic probes;
analyze every candidate's score and rank; determine cutoffs from full
distributions and human judgments; preserve useful contextual windows;
and validate that any selectivity improves usability without silently
losing wanted memories.

The goal is not to make MiniLM answer questions about the archive. It is
to understand when and how MiniLM helps a person find the transcript
they were looking for.

------------------------------------------------------------------------

# Agent Continuity Dossier --- Start Here If the Work Must Resume From Zero

**This section is an operational recovery guide.** It supplements the
research/design record above. It is intended for a new AI agent that may
have no access to this conversation, no memory of previous decisions,
and no guarantee that prior temporary files will still exist.

## A. Mission, scope, and definition of success

### A.1 The user outcome

Memora is helping a person find a recording they remember imperfectly.
The user may remember an image, event, person, feeling, setting, or
approximate idea, without remembering the wording used in the
transcript. The search system should surface the recording so the user
can recognize it.

This is **memory retrieval / transcript rediscovery**, not: - answering
a factual question from the archive; - summarizing the archive; -
finding every passage that shares a topic; - optimizing a similarity
score for its own sake; - reducing the number of results as an end in
itself; - suppressing overlap as the primary goal.

The user values avoiding missed memories. A somewhat longer result list
is preferable when it materially lowers the risk of hiding the wanted
recording. Selectivity is still important, but must be justified by
evidence.

### A.2 Definition of success

A successful change should demonstrate, using reproducible evidence,
that it helps users find the intended recording more reliably or with
less effort, without introducing unacceptable losses. At minimum,
assess: 1. **Coverage:** whether the intended transcript is retrieved at
all. 2. **Ranking:** how early it appears. 3. **Recognition:** whether
the returned text/context lets the user identify the recording. 4.
**Useful alternatives:** whether other results help with an ambiguous
recollection. 5. **Clutter:** how many irrelevant results the user must
inspect. 6. **Robustness:** whether results remain useful across query
families and target recordings. 7. **Cost:** indexing/search time and
resource use, treated separately from relevance.

No single aggregate metric is sufficient. Inspect individual failures
and tail cases.

### A.3 Scope boundary

The current task is a search-quality investigation using the existing
corpus, search lab, and production implementation as evidence. Do not
silently expand it into a wholesale search rewrite, a new model
deployment, cloud inference, or unrelated Memora features. Recommend
architectural changes only when the evidence identifies a concrete
limitation that the change is likely to address.

## B. User decisions and constraints that must survive a restart

Treat these as settled unless the user explicitly changes them:

-   Search is for **rediscovering a transcript from incomplete
    recollection**, not question-answering.
-   Test queries must be clever and meaningful, but plausible for a
    human to type and fair to the chosen model. Do not make a benchmark
    full of deliberately impossible riddles or long prompts whose signal
    is diluted.
-   Queries must be grounded in actual transcript content. Record the
    target and evidence, but compose the query without copying the
    target wording or iteratively tuning it to the model.
-   MiniLM limitations must be accounted for. Separate realistic
    benchmark queries from explicit challenge probes for negation,
    causal inference, multi-clue reasoning, rare names, and other known
    weak points.
-   Analyze the **full candidate distributions and ranked candidates**,
    not only the UI's top 20 or top 100. The UI limit is not a research
    limit.
-   A similarity score is not a probability of relevance. Distribution
    analysis can suggest cutoffs; human judgments must establish whether
    a cutoff is useful.
-   Evaluate each retrieval family separately before drawing conclusions
    about fusion: lexical, semantic sentences, 3--1 chunks, 5--2 chunks,
    7--3 chunks, and combined ranking.
-   **Suppress direct duplicate/overlap representations in the final
    presentation only; preserve useful nested context in a composite
    result.** Do not throw away a broader chunk just because it contains
    the matching sentence or overlaps a narrower chunk.
-   Keep raw candidates and metadata for analysis even if the UI
    composes/deduplicates the displayed results.
-   Keep transcript files unchanged and transcript inference local. CDN
    downloads for code/model assets are compatible with the documented
    design; do not introduce hosted transcript inference without
    explicit approval.
-   Preserve original filenames inside ZIP archives when delivering
    changed code.
-   Make small, testable changes. Establish the problem and design
    before changing code. Do not bundle unrelated changes.
-   Clearly distinguish a source-code review, syntax check, unit test,
    and actual browser/model test. Never claim the browser ran when it
    did not.
-   Do not ask the user to repeat decisions already documented. If
    something essential is missing, inspect the artifacts first and ask
    one focused question only after exhausting available evidence.

## C. State of evidence at the last documented checkpoint

The following is the last documented state, **not a claim that it is
still the live state**. Reinspect current files and reports before
continuing.

### C.1 Corpus and model baseline recorded in reports

-   Archive label: `Archive.zip`.
-   114 transcript files.
-   3,832 candidate passage representations in the described lab corpus.
-   Reported representation counts: 1,892 sentences; 915 3--1 chunks;
    590 5--2 chunks; 435 7--3 chunks. These sum to 3,832.
-   Embedding JSON: `search-embeddings.json`, reported to contain exact
    transcript representations for all 114 transcripts, with zero
    missing, partial, or invalid representations.
-   Model: `Xenova/all-MiniLM-L6-v2`.
-   Transformers.js: 3.7.2.
-   Embedding dimension: 384.
-   Inference: browser-local; transcript text is not sent to a hosted
    inference API in the described design.
-   Reported runtime environment for one baseline: Chrome 156 on macOS,
    four logical CPUs, 8 GB reported device memory, online.

Revalidate the archive, representation counts, model revision, and
embedding coverage before relying on them.

### C.2 Earlier baseline reports

The Search Laboratory handoff records reports (4), (5), and (6) as
16-query baseline runs at retrieval depth 30. Reports (5) and (6) had
the same per-query retrieved counts, post-suppression counts, and first
displayed result. These runs did **not** establish that search quality
was good. They contained no human relevance judgments and did not
evidence a successful controlled depth or ranking sweep.

One reported configuration was: - `strategy=baseline` - `topK=20` -
`retrievalDepth=30` - `lexicalWeight=35` - `semanticWeight=65` -
`fuzzyThreshold=70` - `overlapMode=dedupe` - `rrfK=60`

The lexical and semantic weights do not affect baseline ranking; they
matter to the hybrid strategy. The documented depth was applied
separately to semantic sentences and each contextual representation
family, while lexical matches were added independently. Confirm these
semantics in the actual lab source before relying on them.

### C.3 Earlier lexical diagnostics

An earlier run used long natural-language paraphrases and returned zero
lexical candidates for all 20 queries. That was not sufficient evidence
of a production lexical regression because the documented lexical
matcher expects contiguous query-word windows and fuzzy token matching.

A later compact phrase-like diagnostic reportedly ranked the designated
target transcript first for all 20 queries. This was a lexical sanity
check only. It did not prove production is free of regressions, did not
establish passage-level relevance, and was not a fair
semantic-paraphrase test.

### C.4 Full-calibration work

Earlier calibration exports reportedly covered 20 queries and five
retrieval families: - lexical; - sentence-semantic; - 3--1; - 5--2; -
7--3.

The design included lexical fuzzy-threshold sweeps, semantic
score-cutoff quantiles, lexical score cutoffs, and 70 fusion-weight
combinations. One known limitation was that non-target candidates cannot
be called false positives without relevance judgments. Some exported
reports are very large; ensure full candidate-level data remains
available, but produce a compact summary for human review.

### C.5 Do not overclaim

Do not conclude from the recorded evidence that: - depth 30 is
optimal; - depths 50, 100, or 200 improve quality; - RRF or hybrid is
better than baseline; - more results are automatically better; - fewer
results after overlap suppression are automatically better; - the
current composite presentation is correct; - a target appearing first
means all results are useful; - a lexical diagnostic proves production
parity; - a syntax check proves browser/model execution; - the benchmark
represents every future search.

## D. Recovery procedure: first actions for a new agent

Follow this sequence. Do not jump directly to redesigning ranking.

### Step 1 --- Establish what files actually exist

Inspect the current working directory and any provided attachments. Do
not assume temporary paths from a previous session exist. If the user
has supplied a bundle, inspect its contents and filenames before
modifying anything.

Create a manifest recording: - filename and relative path; - file
size; - SHA-256 hash; - role (production source, lab source, input
archive, embedding cache, report, benchmark, handoff); - whether it is
the current/authoritative version or only a historical copy; - evidence
for that status.

Do not select a file solely because its filename contains "fixed",
"latest", or a larger number. Compare content, timestamps where
trustworthy, version/build strings, and behavior.

### Step 2 --- Read the handoff and inspect the actual source

Read this entire document. Then inspect: - current production search
source and relevant workers; - the current Search Laboratory HTML and
any code it embeds; - the current archive/manifest and embedding JSON; -
query/benchmark definitions; - all available reports needed to
understand the latest experiments; - any fixed ZIPs or source snapshots
identified in the manifest.

If a report is huge, first parse its metadata, schema, configuration
list, errors, and counts programmatically; then inspect candidate-level
results for the critical queries and comparisons. Do not print a
multi-hundred-megabyte JSON file wholesale.

### Step 3 --- Establish a trustworthy baseline

Before editing: 1. Identify the actual production implementation and its
version/hash. 2. Identify which lab build most closely matches
production and document differences. 3. Verify the archive manifest and
embedding coverage. 4. Load and validate the benchmark queries and
target identifiers. 5. Run or inspect a baseline export. 6. Confirm the
export contains all expected queries and all expected retrieval
families. 7. Record candidate counts before cutoff, after cutoff, after
fusion, after composition, and at display. 8. Preserve the original
baseline report; do not overwrite it.

If the environment cannot run the browser/model flow, say so and limit
conclusions to static inspection or data analysis. Ask the user to run a
specifically described experiment only after preparing a reliable build
and exact test instructions.

### Step 4 --- Fix experiment integrity before ranking optimization

Audit and, if still present, repair these known risk areas: - sweep
success status can be reported even if a sub-run failed; - errors may
not propagate through all sub-runs; - a sweep may stop or partially
complete without a durable partial/failure status; - audit explanations
may show the wrong configured depth; - export may omit expected
query/configuration combinations; - top-level success may not reflect
the status of every batch; - the overlap/composite behavior may discard
useful nested context; - exported detail may be capped at top 20/100,
preventing full distribution analysis.

For every required run, the report should identify the intended
configuration, actual configuration, run status, errors, result counts,
and timing. A missing batch must be reported as missing, not interpreted
as zero results.

### Step 5 --- Verify direct-overlap/composite behavior

Test the result-composition rule with explicit fixtures or real corpus
examples: - a matching sentence alone; - the same sentence contained in
a 3--1 chunk; - the same sentence contained in a broader 5--2 or 7--3
chunk; - overlapping but non-identical passages; - a broader chunk whose
extra context is necessary to recognize the memory; - two nearby but
distinct events in the same transcript.

The final UI should not show redundant standalone results for the same
event when they can be composed, but the wider context must remain
accessible. Preserve raw candidate rows and their original ranks/scores
in the experiment export. Do not let UI deduplication erase evidence
needed for evaluating the retrieval method.

### Step 6 --- Build/verify the query benchmark

Use actual transcript content. For every query: - assign a stable ID; -
identify one intended target transcript and the supporting
passage/event; - record plausible alternative useful transcripts if the
query is ambiguous; - write the query as a natural recollection, not a
copied transcript sentence; - label query family and intended
challenge; - state why MiniLM has a plausible chance of retrieving the
target; - note any known ambiguity, transcription error, or missing
conceptual context; - designate calibration or held-out validation; -
preserve the original query once frozen.

Avoid tuning the query after seeing the target's score. If a query is
revised after results are examined, record the revision and do not treat
the revised query as an untouched test.

### Step 7 --- Run controlled comparisons

Only after the preceding integrity checks:

**A. Baseline:** save complete candidate-level results for every
benchmark query and retrieval family.

**B. Depth sweep:** compare 30, 50, 100, and 200, with other settings
held constant. Verify four complete depth batches per query, or
explicitly document why a configuration is unsupported.

**C. Ranking sweep:** at a fixed depth, compare baseline, RRF, and
hybrid. Verify three complete strategy batches per query. Keep all other
settings fixed.

**D. Cutoff calibration:** inspect complete score distributions
separately for lexical, sentences, 3--1, 5--2, and 7--3. Test absolute
thresholds, quantiles, score gaps, candidate limits, and per-family
thresholds. Retain target-loss evidence for every setting.

**E. Composition:** compare raw candidates, post-cutoff candidates,
fused ranking, composed results, and final display as separate stages.

**F. Slider:** map each slider setting to its actual filtering behavior.
For every setting, identify which target/useful transcripts are lost,
which irrelevant candidates are removed, and the change in user-visible
effort. Do not assign statistical meaning to arbitrary slider
percentages.

Do not combine all changes in one run and then attribute the outcome to
one factor.

### Step 8 --- Judge relevance

Pool candidates from all methods and depths so the deeper methods are
not disadvantaged by a shallow judging pool. Stable candidate
identifiers should allow the same underlying passage to be judged once
and reused across configurations.

Use the labels: - **Target** --- intended recording/passage; -
**Useful** --- another result that could genuinely help locate the
memory; - **Irrelevant** --- does not help; - **Uncertain** ---
insufficient basis to decide.

Judge enough of the candidate pool to support the claims being made.
Record why a result is useful or misleading where necessary. Do not
equate "not the designated target" with "irrelevant."

If the candidate pool is incomplete, describe recall as estimated. Do
not present definitive precision/recall numbers based on unjudged
results.

### Step 9 --- Analyze full distributions and individual failures

For each query and method, inspect: - full score/rank distribution; -
candidate counts at each cutoff; - target score/rank and retention; -
useful/irrelevant judgments retained; - changes in top 5, 10, and 20; -
newly recovered candidates at deeper depths; - false-looking matches; -
duplicate/overlap relationships; - score gaps and score-family
differences; - runtime and resource costs.

Report both aggregate patterns and concrete failure cases. Break down by
query family and distinct target transcript so repeated queries for one
transcript do not dominate the result.

### Step 10 --- Freeze and validate

Use calibration queries to choose settings. Freeze the chosen settings
and document them before evaluating held-out queries/transcripts. A
three-year/three-year split was proposed if the full six-year corpus is
available, but it is a proposal, not a confirmed completed split.
Establish corpus completeness first and assign the split before tuning.

If validation data influences further tuning, it is no longer an
untouched holdout. Obtain a new holdout before claiming independent
generalization.

### Step 11 --- Decide whether to modify production

Make production changes only after: - the lab's behavior is sufficiently
production-parity for the feature under test; - run completeness and
provenance are trustworthy; - candidate-level results are preserved; -
relevance judgments support the change; - target-loss trade-offs are
understood; - held-out validation supports the conclusion; - regression
tests cover known failure modes.

If evidence is inconclusive, state that plainly and recommend the
smallest next experiment rather than guessing.

## E. Minimum export contract

Each experiment export should include enough information to reproduce
and audit the run.

### E.1 Run-level metadata

-   schema version;
-   lab build/version and source hash;
-   date/time and timezone or ISO timestamp;
-   browser/runtime and relevant hardware details, if available;
-   corpus/archive identifier and hash;
-   embedding/index identifier and hash;
-   model name, revision, runtime version, dimension,
    pooling/normalization details where known;
-   benchmark version/hash;
-   query IDs and calibration/validation split;
-   intended and actual configuration;
-   status: complete, partial, cancelled, or failed;
-   errors/warnings, including sub-run errors;
-   timing by stage;
-   explicit statement of which candidate records were exported and
    whether any truncation occurred.

### E.2 Candidate-level records

For each query, method, and candidate: - stable query ID; - stable
candidate ID; - transcript ID and filename; - representation family
(`lexical`, `sentence`, `3-1`, `5-2`, `7-3`, or fused); - passage text
and source offsets/indices where available; - raw score and score
type; - rank within the method; - rank after fusion, if applicable; -
original rank before cutoff; - cutoff retained/rejected flag and
reason; - target/useful/irrelevant/uncertain judgment, if assigned; -
context/overlap/composition group ID and parent/child relationships, if
applicable; - whether displayed and, if not, the stage/reason it was
omitted.

Keep raw scores and ranks. Do not replace them with only normalized
values or a final combined score.

### E.3 Completeness checks

Before calling an export complete: - compare actual query IDs with the
expected benchmark IDs; - compare actual configuration IDs with the
required configuration matrix; - check duplicate/missing
query-configuration pairs; - check that each completed run has candidate
records or an explicit valid zero-result record; - verify that candidate
counts match exported row counts; - verify that no rank gaps or
accidental truncation occurred; - verify that cancelled/failed runs are
not labelled complete; - preserve the original file and write a new
report for each run.

## F. Recommended benchmark and judging workflow

### F.1 Initial benchmark size

The design document proposes approximately 60--100 genuine queries if
the corpus supports that many distinct examples. Begin with a smaller,
high-quality set if necessary; do not invent queries to reach a quota.
Cover multiple query families and many distinct target recordings.

### F.2 Keep target selection separate from query wording

For each target, record the target passage and evidence first. Compose a
natural query without looking back at the exact wording if practical.
Reopen the source only to verify that the intended memory is genuinely
supported. This helps reduce lexical leakage and benchmark overfitting.

### F.3 Avoid target leakage across splits

Do not place many near-duplicate queries for the same transcript in
calibration and validation. Prefer splitting by source transcript or
time period where the corpus allows it. A three-year/three-year split
remains a proposal pending corpus verification.

### F.4 Negative/control queries

A negative/control query should have no known intended target, or should
be deliberately too underspecified to justify a confident match. Use it
to inspect false confidence and misleading results, not to calculate
ordinary target recall. Record why it is a control and how
success/failure is interpreted.

### F.5 Judging consistency

Write brief labeling guidance with examples before large-scale judging.
If possible, re-judge a small subset after a delay to check consistency.
When a candidate is uncertain, preserve the uncertainty rather than
forcing an irrelevant label. Judgments should concern whether the result
helps rediscover the memory, not merely whether it shares words or a
topic.

## G. Production parity and code-review checklist

Before relying on lab conclusions, compare lab behavior with production
for each feature being studied.

-   [ ] Query normalization is equivalent.
-   [ ] Lexical matching/fuzzy threshold is equivalent.
-   [ ] Sentence splitting is equivalent.
-   [ ] Chunk creation and window definitions are equivalent.
-   [ ] Embedding model, revision, preprocessing, pooling, and
    normalization are equivalent.
-   [ ] Cosine/distance calculation is equivalent.
-   [ ] Per-family candidate limits and thresholds are equivalent.
-   [ ] Fusion and tie-breaking are equivalent.
-   [ ] Slider mapping is equivalent.
-   [ ] Duplicate handling and contextual composition are equivalent.
-   [ ] Final result caps and grouping are equivalent.
-   [ ] Persistent index/cache behavior does not change the evaluated
    candidate set.
-   [ ] Errors and partial results are surfaced consistently.

Document every known difference. A lab may intentionally expose
additional candidates for analysis, but then label the difference and do
not claim exact production parity for that stage.

## H. Known architectural caveats to keep separate from this experiment

Earlier Memora Search notes raised a historical "Samadhi" retrieval
problem: a recording later titled
`2023-06-20 - Ganga first samadhi - medium.txt` was missed for indirect
descriptions such as "center of everything," "losing the ordinary sense
of self," and "being one with everything." The recording's title was
changed later to reflect a subsequent interpretation, so that later
meaning was not present in the original transcript text. Notes also
recorded a possible transcription error where "delusion" was intended to
be "deluge."

These are important diagnostic examples, but they are not proof that any
particular model or index change will fix the problem. Separate: -
transcription error; - lexical mismatch; - semantic retrieval failure; -
later title/filename interpretation not present in transcript content; -
missing metadata or conceptual annotation; - query ambiguity.

Do not quietly add the later interpretation to source text or treat it
as transcript evidence. If title-derived or user-authored semantic
metadata is proposed, treat it as a distinct design choice and evaluate
its privacy, provenance, and retrieval impact separately.

## I. Artifact inventory and restart packaging

The prior working directory contained multiple versions of the Search
Laboratory, source snapshots, ZIPs, benchmark design files, and large
JSON reports. These filenames are a **historical inventory**, not a
guarantee that every item is included in this handoff or remains
authoritative.

Previously observed names included: - `Memora_Search_Laboratory.html` -
`Memora_Search_Laboratory_controlled_sweeps_fixed.zip` -
`Memora_Search_Laboratory_20_queries_experiment_design.md` -
`Memora_Search_Laboratory_Handoff.md` -
`Memora_Dream_Search_Lab_Analysis_and_Slider_Optimization.md` -
`memora-search-lab-report(4).json` through later numbered reports, plus
timestamped reports - production source snapshots such as
`search(...).js`, `searchUI(...).js`, `semantic(...).js`,
`semantic-worker(...).js`, `app(...).js`, and `index(...).html` - corpus
archives such as `Archive.zip` - the derived embedding file
`search-embeddings.json` (possibly inside an archive rather than a
standalone file).

There were also several similarly named lab builds, including variants
described as updated, revised, fixed, production parity, semantic gap,
calibration, category audit, and controlled sweeps. Their names alone do
not establish which is correct.

### I.1 Before creating a restart bundle

1.  Compare all available lab variants and identify the actual latest
    reliable source.
2.  Extract and inspect ZIP contents before deciding what they contain.
3.  Match the selected lab against the latest production source.
4.  Inspect the newest reports' metadata and configuration matrices; a
    higher report number is not proof of a successful or more complete
    experiment.
5.  Choose a small set of authoritative artifacts and list their hashes
    in a manifest.
6.  Include the complete source required to rerun the experiment, but
    avoid needlessly duplicating the full transcript archive and
    enormous candidate exports if they can be supplied separately.
7.  If a required input is too large to bundle, state explicitly that it
    must be reattached. A handoff document cannot reconstruct missing
    transcript content or embeddings.
8.  Include one compact baseline summary and the full machine-readable
    report as separate artifacts where feasible.
9.  Preserve historical reports read-only; never overwrite them while
    testing a new build.

### I.2 What a genuinely portable restart package should contain

Minimum: - this complete handoff document; - authoritative Search
Laboratory source HTML; - the same source inside a ZIP with its original
filename preserved; - production search code snapshots for the
components used by the lab; - benchmark/query definitions and target
evidence; - the latest baseline report and latest experiment report; - a
manifest with SHA-256 hashes, sizes, roles, and authoritative/historical
status; - a short `START_HERE` note listing the exact first actions.

If the lab requires the archive and `search-embeddings.json` to run,
include them or make it explicit that the user must reattach them. Do
not imply the handoff alone contains those inputs.

### I.3 Handling missing artifacts

If a referenced artifact is absent: - do not fabricate it; - do not
substitute a similarly named file without comparing it; - report the
missing dependency and whether work can continue without it; - use the
user's supplied files or ask for the specific missing file only after
checking all available sources.

A restart from the document alone can recover intent, decisions, and
workflow, but it cannot recreate unbundled source code, reports,
transcript data, embeddings, or exact runtime behavior.

## J. Experiment report template

For each experiment, report:

1.  **Question:** What specific uncertainty is this experiment meant to
    resolve?
2.  **Hypothesis:** What result is expected and why?
3.  **Controlled variables:** What stays unchanged?
4.  **Changed variable:** The single primary factor being tested.
5.  **Inputs:** Corpus hash, index hash, query benchmark hash, lab build
    hash.
6.  **Completeness:** Expected versus completed configurations and query
    counts.
7.  **Findings:** Candidate-level evidence and summary metrics.
8.  **Target losses:** Every intended target removed or demoted, with
    cause.
9.  **Useful gains:** Newly recovered target/useful candidates and rank
    improvements.
10. **Clutter trade-off:** Irrelevant candidates retained or removed,
    based on judgments.
11. **Failure analysis:** Representative successes and failures,
    including tail cases.
12. **Limits:** Missing labels, incomplete pool, environment
    limitations, or deviations from production.
13. **Decision:** Keep, reject, or defer the tested change.
14. **Next experiment:** The smallest follow-up that resolves the
    largest remaining uncertainty.
15. **Artifact references:** Exact filenames and hashes for code,
    inputs, and outputs.

## K. Decision log template

Maintain a concise decision log alongside the detailed report: - date; -
decision/question; - evidence reviewed; - decision and rationale; -
alternatives rejected and why; - confidence/limitations; - code or data
artifacts affected; - conditions that would justify revisiting it.

Do not reopen settled choices merely because a new agent lacks
conversational context. Reopen a decision only when new evidence, a
changed requirement, or a discovered defect justifies it.

## L. Final handoff checklist

Before ending any future session, update this document or a companion
status file so the next agent can resume without asking the user to
reconstruct history.

-   [ ] Current mission and constraints unchanged or explicitly updated.
-   [ ] Current authoritative files identified.
-   [ ] Artifact manifest and hashes refreshed.
-   [ ] Current code changes and rationale documented.
-   [ ] Tests run and their exact scope documented.
-   [ ] Browser/model tests distinguished from static checks.
-   [ ] Latest report IDs, completeness, errors, and judgments recorded.
-   [ ] Full candidate exports retained.
-   [ ] Known defects and unresolved questions listed.
-   [ ] Next action is a specific executable step, not a broad
    aspiration.
-   [ ] User-facing deliverables packaged with original filenames
    preserved.
-   [ ] No source archive or historical report overwritten.

## M. The first task after a restart

Unless the user gives a different priority, the first task is **not** to
select a winning model, threshold, or ranking strategy.

The first task is to establish the current truth: 1. inventory the files
actually available; 2. identify the authoritative lab and production
source; 3. inspect the latest report's run matrix and errors; 4. verify
whether a complete controlled sweep truly exists; 5. repair any
experiment-integrity and context-composition defects still present; 6.
then generate a trustworthy baseline and proceed through the controlled
plan.

This order prevents a new agent from mistaking a failed or incomplete
experiment for evidence, repeating old work, or optimizing the wrong
objective.
