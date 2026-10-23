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


---

# Dated Addendum — Analysis of Search Laboratory Run 2026-10-23 10:35 UTC

**Purpose:** Update the status of the research using the uploaded report `memora-search-lab-report(20261023-110231).json`. This addendum supplements the preceding plan; it does not silently replace or erase earlier conclusions.

## A1. Run identity and integrity observations

- Report creation time: `2026-10-23T10:35:45.706Z`.
- Lab: `Memora Search Laboratory`, version `0.2.0`.
- Build identifier: `single-file-production-parity-category-audit`.
- Model: `Xenova/all-MiniLM-L6-v2`, Transformers.js `transformers.js-3.7.2`, 384-dimensional embeddings.
- Archive: `Archive.zip`, 114 transcripts, 3832 passage representations.
- Calibration status recorded in JSON: **completed**.
- Calibration elapsed time: 16.40 seconds.
- Calibration errors array: [].
- Human judgments in the report: **0**.
- The report describes browser-local inference; CDN access is for JavaScript/model assets, not hosted transcript inference.

The report records a completed run with an empty calibration error list. This is evidence about the run's recorded status, not independent proof that the calculations, browser behavior, or production parity are correct. The current HTML must still be inspected and tested.

## A2. Target-transcript rank results

The report's `methodResults` records give the following target-transcript ranks across the 20 built-in queries:

| Retrieval method | Target in top 5 | Target in top 10 | Target in top 20 | Worst observed target rank |
|---|---:|---:|---:|---:|
| Lexical | 20/20 | 20/20 | 20/20 | 1 |
| Sentence-semantic | 17/20 | 18/20 | 19/20 | 48 |
| 3–1 chunks | 17/20 | 18/20 | 20/20 | 13 |
| 5–2 chunks | 16/20 | 18/20 | 20/20 | 15 |
| 7–3 chunks | 17/20 | 18/20 | 20/20 | 20 |

These are **target-transcript retrieval measurements**, not passage-level human relevance judgments. They do not establish that all other candidates are irrelevant, nor that the target passage itself is always the best passage shown to the user.

### Interpretation

- The three chunk families each retrieved all 20 target transcripts within their top 20 in this run. Sentence-semantic retrieval placed 19/20 targets in the top 20.
- No chunk size dominates every target rank; the representation families should be treated as potentially complementary until judged results show otherwise.
- Lexical retrieval ranked the designated target first for all 20 queries, but averaged exactly one candidate per query in the method results. The lexical threshold sweep also recorded one matched candidate at every tested threshold.
- The lexical result is therefore a useful sanity check for these compact, phrase-like queries. It is not evidence that lexical search solves indirect or imperfect memory-recovery queries, and should not by itself justify increasing lexical weight in production.

## A3. Cutoff and fusion results: what they do and do not prove

The calibration design records five retrieval methods, lexical thresholds `[50, 60, 70, 80, 90, 100]`, semantic cutoff quantiles `[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.975, 0.99]`, lexical score cutoffs `[0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1]`, and 70 fusion weight vectors per query.

The fusion sweep contains 1400 query/configuration outcomes. The intended target transcript ranked in the top 5 in 1164/1400, top 10 in 1252/1400, and top 20 in 1361/1400 outcomes (top 20: 97.2%).

This is encouraging as a target-retrieval diagnostic, but it does not identify the best production configuration. The report's target metric is the best-ranked passage in the expected target transcript, described by the report itself as a transcript-level proxy rather than passage-level human relevance. The report has no human judgments for non-target candidates, so precision/specificity and the practical clutter-versus-recall trade-off cannot be established.

**Do not select a winning fusion configuration from these counts alone.** First ensure that sweep outputs and candidate-level evidence are complete and auditable; then judge pooled results.

## A4. Remaining evidence gaps

The current report is not a complete candidate-level dataset for every method/configuration. The `methodResults` objects retain ranked lists under `rankedTop`; the cutoff and fusion sweeps retain compact `top` arrays alongside summary fields. The exported report therefore does not give a complete, auditable score-and-rank record for every candidate across every tested configuration.

Before using it to set production cutoffs or the sensitivity slider, the lab should export, at minimum:

1. Every scored candidate for each query and retrieval family, including candidates beyond the visible top list.
2. Stable query ID, configuration ID, retrieval family, candidate/passage ID, transcript filename/ID, representation type, original rank, score, and passage text.
3. Intended and actual retrieval depth, number of candidates scored, number retained, and target rank/retention.
4. Per-run completion state, errors, elapsed time, model/archive identifiers, and configuration values.
5. Separate raw retrieval, post-cutoff retrieval, fusion, and final composite-display records.
6. Export validation showing that all expected query/configuration/method combinations are present and that failed or incomplete runs are not represented as complete.

The JSON report's `judgments` array is empty. Build a pooled candidate set across methods and depths and label candidates Target, Useful, Irrelevant, or Uncertain. Until this exists, do not call non-target results false positives or claim validated precision/recall.

## A5. Recommended next steps, in order

1. **Inspect the actual HTML used for this run.** Confirm its build and code paths; do not infer implementation details from the report label alone.
2. **Audit experiment integrity and export completeness.** Verify actual depth, candidate counts, sweep error propagation, and expected combinations. Fix any silent partial-run or truncation behavior first.
3. **Produce complete candidate-level exports.** Preserve the full scored distributions, not just top 20/100 summaries. Keep the summary report as a separate artifact.
4. **Audit benchmark quality.** Keep compact phrase-like lexical sanity checks, but create a separately labelled, transcript-grounded benchmark of realistic imperfect recollections. Record target evidence and query provenance without copying the target wording.
5. **Human-judge pooled results.** Include candidates from every retrieval family and depth; distinguish Target, Useful, Irrelevant, and Uncertain.
6. **Run controlled depth comparisons** at 30, 50, 100, and 200 with other variables fixed; then compare baseline, RRF, and hybrid at a fixed depth.
7. **Evaluate composition and overlap separately.** Suppress direct redundant presentations only; preserve useful nested context. Keep raw candidates available for analysis.
8. **Only then tune cutoffs, fusion, and slider behavior**, reporting target losses individually and validating the selected configuration on held-out queries.

## A6. Current decision

**Decision: continue the search-lab investigation; do not change production ranking or slider defaults on the basis of this report alone.**

The report is a useful completed diagnostic run: target-transcript recovery is encouraging, especially for chunk representations, and the fusion sweep supplies many additional target-rank observations. But the evidence is not yet sufficient to choose a winner because the benchmark is small, the lexical tests are unusually phrase-like, the full candidate-level export is incomplete, and there are no human relevance judgments.

The immediate next input should be the exact Search Laboratory HTML file used to produce this report. Inspect that source against the export and sweep requirements above before changing it. Record actual tests performed; a source inspection or syntax check must not be described as a browser/model test.

## A7. Validity of the handoff

The preceding sections remain the governing design and continuity plan. This addendum updates the status with the 2026-10-23 report. It does not make the handoff a substitute for inspecting current source files, and any corpus counts or implementation details must be re-verified if the archive or lab changes.


# Addendum B — Sensitivity/specificity slider calibration and fixed result paging (2026-10-23)

## B1. Governing objective

The objective is **not** to replace Memora's current search method, maximize target transcripts in the top 20, or choose a universal cosine cutoff. The immediate objective is to make the sensitivity–specificity slider meaningfully change the ordering and relative strength of results while preserving access to the full result set.

- Left end: greater sensitivity; retain the current broad search standard as the baseline.
- Right end: greater specificity; stronger matches should generally rise and weaker matches may fall, accepting that some useful matches may be ranked lower.
- The slider may adjust the relative influence of the existing sentence and contextual representations (3–1, 5–2, 7–3) and, if supported by evidence, how their query-specific score distributions contribute.
- Do not assume a single cosine threshold is comparable across representations or queries.
- Preserve the current composite ranking methodology as the baseline. Do not change production ranking or the default slider position until the diagnostic supports a specific change.

## B2. Result availability is independent of slider position

This is a binding UI requirement, not an experiment variable:

1. Initially show the top 20 transcript results, or all results if fewer than 20 exist.
2. If more results exist, show a **Show 20 more** control that appends the next 20; repeat until all results can be inspected.
3. The slider must **not** change the number of transcripts available, impose a hard result cap, or remove lower-ranked candidates through an arbitrary retained-percentage rule.
4. Changing the slider may change score interpretation, ordering, or relevance grouping, but every candidate in the evaluated result set must remain reachable by paging.
5. Rank 21 is not inherently a failure. Inspect quality and candidate retention at depths such as 20, 30, 40 and beyond; the user may scan 30–40 results when useful.

## B3. Source inspection findings (not a browser validation)

The supplied `search.js` and `searchUI.js` were inspected on 2026-10-23. This is source inspection only; it does not establish runtime or browser behavior.

- The current UI slider (`semanticFractionSlider`, persisted as `memoraSemanticResultsFraction`) maps to a retained fraction between 100% and 50%.
- `retainSemanticFraction(...)` filters by rank within each representation. It therefore removes candidates as the slider moves rather than merely changing relevance/specificity or order.
- Contextual retrieval is requested with `maxResults: 30` per representation in the inspected UI path.
- The composite UI ordering uses family/category priorities and rank-derived values, and overlap suppression can hide nested/contextual candidates from display.
- Consequently, the current rank-based retention mechanism conflicts with the binding result-availability requirement above. This is a finding to address in the diagnostic/design, not permission to rewrite production behavior without evidence.

## B4. Immediate next experiment: baseline slider behavior, not another broad fusion sweep

Use the Search Laboratory and the same loaded archive/embeddings to collect per-query scores and ranks for the four existing semantic representations: sentence, chunk 3–1, chunk 5–2, and chunk 7–3. Preserve the existing composite as a named baseline.

For each query and representation, record:

- number of candidates scored and score distribution (minimum/maximum, quantiles, gaps/clusters where informative);
- original rank and score for every candidate in the evaluated pool, not just top 20 or top 100;
- per-transcript aggregation/overlap, including whether several passages or representations refer to the same underlying transcript/passage;
- cross-representation agreement and disagreement;
- composite order and candidate retention at slider positions across the full range, with result availability held constant;
- the set and ordering visible after the first 20, then after Show 20 more (40, 60, etc.), with explicit checks at ranks 20, 30 and 40.

The first run is a diagnostic baseline: compare slider positions against the unchanged current composite and measure what moves, what stays stable, what is demoted, and whether useful candidates remain accessible. Do not select new weights or thresholds from target rank alone. Human relevance judgments are needed to establish specificity; without them, report only observable ranking/distribution behavior and known target recovery.

## B5. Decision criteria and evidence discipline

A proposed slider mechanism should be adopted only if the report makes clear:

1. exactly what the slider changes (weights, distribution-based scoring, or both);
2. how the method handles score-scale differences between representations and query-specific distributions;
3. that the number of available candidates does not shrink as a side effect;
4. how ordering and result paging behave through the full candidate list;
5. which useful candidates move up or down, based on human judgments where available;
6. what was implemented, syntax-checked, actually executed, and independently validated—each as a separate status.

Do not tune against the same small hand-authored query/target set and call the result validated. Keep the current composite unchanged until the evidence justifies a narrowly scoped change.

## B6. Separate later workstream: lexical queries longer than one or two words

Do not mix lexical redesign into this slider calibration. Investigate it as a separate experiment using the same query/corpus set: consecutive phrase matching, partial matching, minimum matching-term count, explicit term exclusions/stop words, and IDF-weighted token overlap. Record candidate counts and judged useful/irrelevant results. An any-token matcher can be noisy; IDF alone is not presumed to solve the problem. Keep lexical findings separate from semantic slider conclusions.

## B7. Current next step

Build and inspect the Search Laboratory baseline diagnostic around the actual existing representations and composite. Keep the production code/defaults untouched for this first step. The report must export complete candidate-level data sufficient to reproduce slider-position comparisons and inspect ranks beyond 20/40. Only after that diagnostic should we propose a specific slider mechanism.


## B8. 2026-10-23 implementation checkpoint — Search Laboratory baseline diagnostics

Updated `Memora_Search_Laboratory_multi_target_benchmark.html` as an experimental diagnostic only. In the full calibration output, each independent method now records score-distribution summaries (min/max, p10/p25/median/p75/p90/p95/p99, mean, standard deviation, and adjacent score gaps among the top 20), rank-and-score metadata for every scored candidate, and passage text for the top 200 candidates. Target-recovery summaries now include depths 30, 40, and 200 as well as earlier depths. The report metadata explicitly states that slider position must not reduce candidate availability and that the UI should show 20 initially, then append 20 per click.

**Scope and limits:** this change does not implement a new slider, does not change Memora production code or defaults, and does not yet simulate alternative slider positions against the production composite. It equips the next analysis with full candidate rank/score metadata and query-specific score distributions. The HTML's inline JavaScript passed `node --check`; the ZIP was checked to contain the HTML under its exact original filename and byte-for-byte match. No browser execution or end-to-end archive run was performed in this environment.

**Decision:** retain as a diagnostic-only iteration. Next, run this HTML in the user's browser against the same archive/embedding JSON, export the new report, and inspect candidate ordering and score distributions across all four semantic representations. Then use the evidence to design a slider simulation that changes ranking/strength while keeping the candidate pool available; do not alter production ranking before that analysis.

---

# Addendum — Query-specific score-distribution simulation (2026-10-23)

## User confirmation
The sensitivity–specificity slider should be grounded in the distribution of scores for the individual query, separately for each representation. A candidate's score is interpreted relative to the score pool for the same query and representation—not against one global cosine threshold and not against a pooled distribution of unrelated queries.

## Simulation performed
Input: `memora-search-lab-report(20261023-125705).json` (28 queries, 114 transcripts; full passage scores and ranks for sentence, chunk 3–1, chunk 5–2, and chunk 7–3).

For each query and representation, the simulation:
1. Used all passage scores to form that query/representation's empirical distribution.
2. Converted each passage score to an empirical percentile within that distribution (midrank for ties).
3. For each transcript and representation, used the highest passage percentile for that transcript.
4. Compared transcript rankings under raw-score mean, percentile mean, z-score mean, robust-z mean, max percentile, and mean of the two strongest representation percentiles.
5. Tested an illustrative slider interpolation from max-percentile (one strong representation can elevate a transcript) to top-two-percentile mean (two representations contribute strongly). This was a diagnostic hypothesis only, not a selected production formula.

All 114 transcripts remained rankable at every simulated position. No candidate was removed by the slider simulation. This preserves the agreed policy that result display is separate: show 20 initially, then append 20 per “Show 20 more” until exhausted.

## Key findings
- Percentile normalization is feasible from the existing export and respects query-specific, representation-specific score distributions.
- The raw-score mean and z-score mean each had a mean top-20 overlap of about 92.1% with the percentile-mean ranking across the 28 queries. The robust-z mean had about 92.3% overlap. This suggests those three average-based approaches produced broadly similar top-20 sets on this archive, although it does not establish relevance.
- The max-percentile diagnostic had about 72.1% mean top-20 overlap with percentile mean; top-two-percentile mean had about 84.8%. These formulas change rankings more substantially.
- Mean top-40 overlap with percentile mean was about 94.7% for raw-score mean, 95.0% for z-score mean, 95.0% for robust-z mean, 79.6% for max percentile, and 88.9% for top-two-percentile mean.
- These are ranking-stability metrics only. No non-target human relevance labels exist in the report, so none of these results proves that an approach is more relevant or more specific.

## Decision
Do not adopt a production formula yet. The simple interpolation is useful as an experiment design but remains unvalidated. The next step is a focused human review of passages/transcripts whose ranks move substantially between the max-percentile and agreement-oriented variants, including movements within ranks 20–40 and deeper. Record judgments as relevant / partly relevant / irrelevant before making a decision about the specificity end.

## Artifacts
- `Memora_Slider_Simulation_Analysis_2026-10-23.md`: detailed method and limitations.
- `Memora_Slider_Simulation_Analysis_2026-10-23.json`: machine-readable aggregate results.
- `Memora_Slider_Simulation_Query_Summary_2026-10-23.csv`: per-query comparison.
- `Memora_Slider_Simulation_Rank_Changes_2026-10-23.csv`: transcript rank movements across approaches and slider positions.
- `Memora_Slider_Simulation_Distributions_2026-10-23.csv`: per-query/per-representation distribution summary.
- `Memora_Slider_Simulation_Top5_Examples_2026-10-23.csv`: top-five examples for inspection.

Status distinctions: simulation executed offline against the exported report; no production code changed; no browser runtime test performed.

---

# Addendum — Full-Passage Export and Query-Specific Distribution Study (2026-10-23)

## 1. Updated source report and scope

A new browser-generated Search Laboratory report was supplied for offline analysis:

- Report: `memora-search-lab-report(20261023-131744).json`
- Laboratory build: `target-validation-full-passage-rank-export-v2`
- Queries: 28
- Transcript files: 114
- Passage representations: 3,832
- Semantic methods analyzed: sentence, chunk 3–1, chunk 5–2, chunk 7–3
- Human relevance judgments: none for the non-target candidate pool

The report contains full ranked passage IDs, ranks and cosine scores for the four semantic methods, together with a separate passage inventory containing the passage text and source metadata. This enables analysis beyond the former top-100 text export without repeating passage text in every ranked record.

The distribution analysis was performed offline against the uploaded JSON. It was not a new browser run, and it does not independently verify production parity or runtime behavior.

## 2. Export improvement

The updated Search Laboratory HTML adds:

- `rankedPassages`: complete rank/score records for every scored passage for each of the four semantic methods;
- `passageInventory`: one copy of each passage's text and metadata, including filename, transcript hash, representation/type, ordinal, sentence indices and paragraph index;
- a build identifier, `target-validation-full-passage-rank-export-v2`.

The prior `rankedTop` export remains available. Ranking logic, query definitions and production Memora behavior were not changed.

Artifact names from the preceding handoff:

- `Memora_Search_Laboratory_multi_target_benchmark_full_passage_export.html`
- `Memora_Search_Laboratory_full_passage_export.zip`

Validation performed at that checkpoint: the inline JavaScript passed `node --check`, and the ZIP was checked to contain the HTML under its original filename. No browser execution or end-to-end archive/calibration run was performed by the assistant. The new JSON report was subsequently supplied by the user and analyzed offline.

## 3. Score-distribution study

### 3.1 Method

For each of 28 queries and each of the four semantic representations:

1. All ranked passage cosine scores were used to calculate query-specific distribution statistics.
2. Passage scores were converted to empirical percentiles within that same query and representation.
3. For each transcript and representation, the highest passage percentile was retained as that transcript's representation-level score.
4. Distribution summaries and cutoff diagnostics were calculated. Cutoffs at the 50th, 75th, 90th, 95th, 97.5th and 99th percentiles were examined as diagnostics, not as production filters.
5. An illustrative ordering-only slider was recomputed at positions 0, 0.25, 0.5, 0.75 and 1. It interpolates between the strongest percentile across the four methods and the mean of the two strongest method percentiles.

Empirical percentile indicates relative standing in one score distribution. It is not a probability of relevance. The illustrative slider ranks all 114 transcripts at every position and removes none.

### 3.2 Median score distribution summaries

Medians below are across the 28 query-level distributions. They must not be treated as universal thresholds.

| Representation | Median query maximum | Median P50 | Median P95 | Median P99 | Median maximum minus P95 | Median distinct transcripts with a passage at/above P95 | Median distinct transcripts at/above P99 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sentence | 0.575 | 0.143 | 0.309 | 0.403 | 0.266 | 45.5 | 12.5 |
| Chunk 3–1 | 0.583 | 0.148 | 0.337 | 0.423 | 0.243 | 24.0 | 6.0 |
| Chunk 5–2 | 0.535 | 0.162 | 0.338 | 0.412 | 0.196 | 18.0 | 4.0 |
| Chunk 7–3 | 0.545 | 0.166 | 0.331 | 0.414 | 0.216 | 14.0 | 3.5 |

The same query-relative percentile yields different numbers of distinct transcripts across representation families. Passage counts and repeated passages per transcript differ, so a percentile cutoff is not a consistent transcript-level selection rule. A high percentile also does not establish relevance.

### 3.3 Implications

- Query-specific, representation-specific normalization is computationally feasible with the complete exported score distributions.
- A universal raw cosine cutoff is not justified by these distributions.
- Query-relative percentiles can be a feature for ranking, but should not be used alone as a relevance probability or hard gate.
- Candidate counts at quantile cutoffs are diagnostic only. The production slider must not remove candidates or make lower-ranked transcripts inaccessible.
- Cross-representation agreement is potentially informative, but overlapping sentence/chunk representations are not independent evidence. A wider chunk may add useful context or may introduce unrelated material.
- Score gaps and tail separation may be useful candidate features, but a score gap does not prove that the leading passage matches the remembered event.

## 4. Illustrative slider results

The prototype interpolates between (a) the maximum of a transcript's four representation percentiles and (b) the mean of its two strongest representation percentiles. It changes order only and retains all 114 transcripts.

| Slider position | Mean best target rank | Target labels in top 20 | Target labels in top 40 | Target labels in total |
|---:|---:|---:|---:|---:|
| 0.00 | 3.71 | 45 | 50 | 54 |
| 0.25 | 3.64 | 46 | 50 | 54 |
| 0.50 | 3.75 | 45 | 49 | 54 |
| 0.75 | 4.00 | 45 | 49 | 54 |
| 1.00 | 4.36 | 44 | 49 | 54 |

These figures are diagnostic target-label measurements only. The labels are not exhaustive human relevance judgments, and non-target candidates have not been fully judged. The prototype does not demonstrate that the right-hand end is more specific. The small changes in target recovery cannot establish which ordering is more useful to the user.

**Decision: do not adopt this prototype as the production formula.** Keep it as a comparison baseline only.

## 5. Binding slider and display requirements — reaffirmed

The user’s settled requirements remain:

- Left end: higher sensitivity and broad retrieval, preserving the current search standard.
- Right end: greater specificity, with stronger matches generally moving up and weaker matches moving down; some misses may be accepted only if the trade-off is supported by evidence.
- The slider may change the relative contribution of sentence and chunk representations and, if justified, use query-specific score-distribution features.
- The slider must not control the number of transcripts available or apply arbitrary retained-percentage filtering.
- Initially display the top 20 results, or all if fewer than 20 exist.
- If more remain, **Show 20 more** appends the next 20; repeat until all candidates can be inspected.
- Examine ranking and quality at ranks 20, 30, 40 and beyond. Rank 21 is not itself a failure.
- Preserve the current composite as the baseline. Do not change production ranking or slider defaults until evidence supports a specific change.

## 6. Decision and next experiment

### Decision log

| Date | Decision | Evidence | Status |
|---|---|---|---|
| 2026-10-23 | Add complete ranked passage score export and a non-repeated passage inventory to the lab | Updated HTML source; user supplied report from the new build | Implemented in lab source; inline JavaScript syntax-checked; user subsequently produced a report. No independent browser run by the assistant. |
| 2026-10-23 | Use query-specific, representation-specific distributions as diagnostic features, not as standalone hard cutoffs | 112 query-method distributions and 672 quantile-cutoff diagnostics | Offline analysis completed |
| 2026-10-23 | Reject the max-percentile-to-top-two-percentile prototype as a production recommendation for now | Target-label counts change little and worsen slightly at the specificity endpoint; no human judgments for non-targets | Rejected as production formula; retain as diagnostic baseline |
| 2026-10-23 | Keep production code and defaults unchanged | Evidence does not yet establish that a proposed ordering improves relevance or specificity | Current decision |

### Next step: passage-level human review

Build a focused review set from examples where the candidate ordering changes substantially between the maximum-percentile and agreement-oriented variants, including ranks 20–40 and deeper. For each candidate, inspect the underlying passage and context and label it:

- **Target** — the intended memory/recording;
- **Useful** — another result that could genuinely help rediscover the memory;
- **Irrelevant** — does not help;
- **Uncertain** — insufficient basis to decide.

Record duplicate/overlap relationships separately so repeated nested chunks are not mistaken for independent support. Review both candidates promoted and candidates demoted by the prototype. Only then test whether distribution-relative standing, tail separation, top-score gaps and cross-representation support improve the order of useful results without hiding them.

Do not resume a broad fusion-weight sweep as the next step. The main uncertainty is whether candidate features improve memory rediscovery, not which formula best fits the existing target labels. Do not mix the separate lexical-query workstream into this experiment.

## 7. Research artifacts generated from this study

The offline study produced:

- `Memora_Slider_Distribution_Study_2026-10-23.md` — study report;
- `Memora_Query_Method_Distributions_2026-10-23.csv` — 112 query-method distributions;
- `Memora_Distribution_Cutoff_Diagnostics_2026-10-23.csv` — 672 query/method/quantile cutoff diagnostics;
- `Memora_Query_Distribution_Summary_2026-10-23.csv` — compact per-query summary;
- `Memora_Distribution_Method_Summary_2026-10-23.csv` — cross-query method medians;
- `Memora_Slider_Prototype_Rankings_2026-10-23.csv` — rankings of all 114 transcripts at five slider positions, including ranks 21–40.

The study ZIP is `Memora_Slider_Distribution_Study_2026-10-23.zip`.

## 8. Status and evidence discipline

- **Source inspection:** performed for the supplied lab HTML and production search snapshots previously described.
- **Code modification:** full-passage rank/score export and passage inventory were added to the diagnostic lab HTML; production Memora code was not changed.
- **Syntax check:** inline JavaScript passed `node --check` on the updated HTML.
- **Browser execution by assistant:** not performed.
- **New report:** supplied by the user from the updated lab build.
- **Distribution analysis:** executed offline against that report.
- **Human relevance review:** not yet performed.
- **Production slider formula:** not selected or validated.
- **Held-out validation:** not performed.

The next deliverable should be a compact, passage-level human review set with stable query/candidate IDs and enough context to judge the memory match. Preserve the full raw export and this updated handoff as separate, read-only research artifacts.


---

# Addendum — Distribution-to-evidence framework: first executable test (2026-10-23)

## User's clarified question
The user correctly identified a missing design layer: the project had computed query-specific score distributions and tested simple percentile combinations, but had not agreed on a complete framework that translates each transcript's result into a distribution-aware evidence score. The user also proposed that 7–3 may be more useful for sensitivity than specificity because broader context can retrieve indirect matches. Treat that as a hypothesis to test, not as established truth.

## First executable framework
Offline analysis of `memora-search-lab-report(20261023-131744).json` (28 queries, 114 transcripts, 3,832 passages; four operations) compared three transcript-level normalizations per query and operation:

1. Passage percentile: transcript's maximum passage score relative to all passage scores.
2. Transcript-max percentile: transcript's maximum score relative to the maximum scores of all transcripts.
3. Length-matched percentile: transcript's maximum score relative to up to 25 transcripts with the closest passage counts, under the same query and operation.

The third method is a first conditional adjustment for opportunity bias: transcripts with more passages have more chances to produce a high maximum. Passage count is only a proxy; overlapping passages are not independent, so this is not a final correction or a calibrated probability of relevance.

## Diagnostic finding
Across queries, passage count had a positive mean query-level Spearman correlation of approximately:
- sentence: 0.402 before length matching, 0.056 after;
- 3–1: 0.398 before, 0.059 after;
- 5–2: 0.392 before, 0.067 after;
- 7–3: 0.374 before, 0.045 after.

The passage percentile and transcript-max percentile preserve the same ordering of transcript maxima, so neither alone removes the length association. Length-matched percentile substantially reduces that association in this dataset. This is encouraging but not proof of relevance improvement or perfect bias correction.

## Candidate slider endpoints tested offline
- Sensitivity-oriented prototype: maximum of all four length-matched percentiles, allowing one strong operation—including 7–3—to elevate a candidate.
- Specificity-oriented prototype: mean of the two highest length-matched percentiles among sentence, 3–1 and 5–2, testing whether corroboration from tighter representations is more selective. 7–3 is excluded from this prototype endpoint as an explicit hypothesis, not a settled decision.
- All 114 transcripts remain rankable at all times. No score cutoff removes candidates.

These are experimental ranking formulas, not production decisions. The existing seed-target benchmark shows high target recovery under both prototypes, but those seed labels are not exhaustive relevance judgements and cannot measure specificity. The 112 human-review rows are selected to study rank changes, so they also cannot provide an unbiased overall precision estimate.

## Decision and next test
No production changes. Inspect query-by-query changes between the candidate endpoints, especially Target/Useful versus Irrelevant cases and passages crossing ranks 20 and 40. Determine whether 7–3 rescues genuinely useful context-dependent results or mainly raises incidental matches. Revisit the length-matching method if individual queries reveal unstable peer comparisons. Only then choose an interpolation and slider semantics.

## Artifacts
- `Memora_Distribution_to_Evidence_Framework_First_Test_2026-10-23.zip`: report, workbook, query distributions, transcript-operation features, prototype rankings, seed-target rank checks, and length-bias diagnostics.
- This was offline computation against an exported report. No production source code was changed and no browser/runtime test was performed.

---

# Current Continuity Update — Complete Score-Curve, Tail, and Ranking-Statistics Investigation (2026-10-23)

**This is the current operational priority.** It supplements the previous addenda and preserves their decisions. It does not replace the source document or authorize production changes.

## 1. Current question

The current task is to determine what useful evidence is already present in MiniLM's complete score distributions and whether that evidence can improve the **ordering and presentation of transcripts** in Memora.

The user explicitly wants us to inspect **the shape of the entire sorted-score curve**, including abrupt changes, tails, elbows/knees, local slope changes, score gaps, and distribution spread—not just raw scores, percentiles, or a handful of top-ranked passages.

This is not an attempt to improve MiniLM's language understanding. Its known limitations are accepted. A semantically odd result is not automatically proof of a ranking bug, and a high score is not proof that a result helps recover the intended memory. The goal is to use available score-distribution evidence intelligently without claiming more than it can establish.

## 2. Source data available for the statistical investigation

The supplied full-passage export was packaged as:

`Memora_Semantic_Evaluation_Data_2026-10-23_14-16-03-937.zip`

It contains the following reported material:

- 28 queries;
- 114 transcripts;
- 3,832 passage representations;
- four semantic representation families: sentence, chunk 3–1, chunk 5–2, and chunk 7–3;
- 107,296 query–passage score records;
- complete per-query ranked passage score CSVs;
- passage and transcript inventories;
- query definitions and seed-target information;
- query/method distribution summaries and transcript-match features;
- diagnostic judgments and lexical-test information where present.

The scores are cosine similarities from `Xenova/all-MiniLM-L6-v2` (384 dimensions; Transformers.js 3.7.2 in the reported lab). They are raw scores; no length normalization was applied in the source export.

The source export and prior reports are evidence about the supplied runs, not independent proof that the lab is identical to current production. This investigation is offline data analysis unless a browser/model run is explicitly recorded.

## 3. Existing statistical work and its limits

Earlier work has already examined raw-score distributions, ranks, percentiles, score gaps, top-k summaries, repeated transcript hits, seed-target ranks, and several transcript-level ranking prototypes. It also explored passage-percentile and transcript-max-percentile normalization, a provisional length-matched percentile, and candidate slider endpoints.

Important observations from that work:

- Query-relative, representation-specific percentiles can be calculated from the complete score export.
- A percentile describes relative standing in one distribution; it is **not a probability of relevance**.
- Passage percentiles and transcript-max percentiles do not by themselves remove the association between transcript length/opportunity and maximum score.
- A first length-matched percentile diagnostic reduced the mean query-level association between passage count and transcript score, but passage count is only a proxy and overlapping passages are not independent. This is not a validated correction.
- Prototype ranking formulas changed ordering, but the existing seed-target labels and absence of comprehensive human relevance judgments do not establish that any formula improves usefulness.
- A percentile or score-gap rule can be useful as a feature for ordering, but it should not be treated as a standalone relevance decision.
- No production formula has been selected. Production ranking, slider defaults, and candidate accessibility remain unchanged.

The prior distribution-to-evidence framework proposed a sensitivity-oriented endpoint that lets any representation—including 7–3—elevate a transcript, and a specificity-oriented diagnostic endpoint that tests corroboration among tighter representations. These remain hypotheses to test, not decisions. In particular, do not assume in advance that 7–3 is only useful for sensitivity or that tighter representations necessarily provide better evidence.

## 4. Required next analysis: the full sorted-score curve

For every query × representation pair, retain and analyze every score in descending order. Do not pool raw scores across different queries and representations as though they share one universal scale.

### 4.1 Passage-level curve shape

For each complete ordered score curve, calculate and preserve:

- raw score at every rank and adjacent score drop;
- score gaps at important ranks (including 1–2, 1–5, 1–10, 1–20, 1–50, and 1–100 where available);
- the largest local drops in several portions of the ranking, rather than only the single largest gap;
- local slope and changes in slope on the descending curve;
- candidate elbow/knee locations using clearly documented heuristic(s);
- distance from the curve to a reference line or other shape diagnostic, where useful;
- score quantiles and tail spread;
- skewness and excess kurtosis as descriptive diagnostics, with caution for bounded, dependent scores;
- upper-tail separation, including maximum minus P95/P99 and gaps between the top scores and the bulk of the distribution;
- candidate counts above several empirical quantiles and fixed score bands;
- how many distinct transcripts appear in each upper tail;
- tail concentration: repeated passages from the same transcript, share contributed by the most represented transcript, and suitable concentration summaries.

A detected knee or abrupt drop is a **candidate structural feature**, not an automatic relevance boundary. Report its rank, score, size/prominence, method, and sensitivity to the detection settings. Do not present one heuristic as objective truth.

### 4.2 Tail and exceedance analysis

Compare the full upper-tail behavior at useful diagnostic levels such as P90, P95, P97.5, P99, and P99.5, where sample size supports them. For each level, report both passage counts and distinct transcript counts. The same passage percentile can yield very different numbers of distinct transcripts across representations because the number of passages and their clustering by transcript differ.

Examine whether a tail is:

- a gradual continuation of the main curve;
- separated by one conspicuous gap;
- composed of several local score tiers;
- dominated by one transcript with many overlapping passages;
- spread across multiple transcripts;
- stable or fragile when representation or query changes.

Do not infer relevance from tail shape alone.

### 4.3 Transcript-level distributions

Memora presents recordings, not independent passages. Repeat the curve/tail analysis after collapsing each query × representation to one score per transcript. At minimum, analyze transcript maximum score and preserve the underlying passages that produced it. Where feasible, compare maximum with secondary summaries such as the best two distinct passage scores or a top-k aggregate, but do not replace raw evidence.

The transcript-level curve must include the full set of 114 transcripts, including those with weak scores. Compare its elbow, gaps, and tail concentration with the passage-level curve. This is essential because a passage-level knee can be created by repeated or overlapping passages from a single recording and may not represent a transition between recordings.

### 4.4 Stability and cross-representation comparisons

For each query, compare the curve structure across sentence, 3–1, 5–2, and 7–3:

- Does a strong tail or knee recur across representations?
- Does a candidate transcript appear in multiple families, or only one?
- Are changes in apparent support attributable to wider context, passage count, overlap, or a different candidate set?
- Are knee positions and top-tail candidates stable under modest changes to the inspected range or smoothing/detection settings?
- Do transcripts promoted or demoted by distribution-aware prototypes cross meaningful UI boundaries (especially 20, 30, and 40)?

Do not treat sentence and chunk scores as independent corroboration: their contents overlap, and they use the same embedding model. Cross-representation agreement is a potentially useful signal, not independent proof.

If a stability resampling is performed, preserve transcript clustering rather than naively resampling individual overlapping passages as independent observations. If a reliable stability test is not feasible, state that limitation instead of implying robustness.

## 5. Statistical features and ranking: rules of interpretation

Keep these quantities distinguishable in the data:

1. **Raw cosine score** — the original model evidence.
2. **Passage rank** — position within one query/representation ranking.
3. **Empirical percentile** — relative position within that query/representation's score distribution.
4. **Distance above the median** — absolute separation from the distribution's center.
5. **Tail separation** — e.g. score minus P95/P99, or maximum minus a high quantile.
6. **Local score gaps and curve-shape features** — possible structural transitions.
7. **Transcript-level aggregation** — how passage evidence is summarized for a recording.
8. **Cross-representation support** — whether multiple representation families surface the same recording.

Do not simply add correlated metrics as if each were independent evidence. Percentile, distance above median, z-score, and tail position may encode overlapping information. Preserve each feature separately first, examine relationships and rank changes, and only test a combined score when the data and judgments justify it.

No feature should cause a transcript to disappear from the candidate list in this investigation. Ranking/presentation is separate from retrieval availability: display the initial top 20, then append the next 20 on “Show 20 more” until all 114 can be inspected.

## 6. Evidence standard and constraints

- Keep every raw score and original rank available in machine-readable outputs.
- Do not pool query-specific raw scores into a universal threshold without a justified calibration.
- Do not treat a high percentile, large gap, or detected knee as a relevance probability.
- A non-target seed transcript is not automatically irrelevant; the query may have multiple useful results.
- Existing target labels are incomplete evidence, not a fully judged relevance pool.
- Report structural findings and rank-stability findings separately from relevance findings.
- Do not make production changes before evidence shows a meaningful improvement to transcript rediscovery.
- Do not spend this phase trying to repair MiniLM's semantic understanding or repeatedly hand-tune query wording.
- Do not ask the user to run repetitive parameter sweeps manually; automate the analysis where feasible.
- Preserve original input and historical reports unchanged.
- Distinguish offline computation, static source inspection, syntax checks, and actual browser/model execution.

## 7. Required deliverables from the next analysis pass

Produce a reproducible report and machine-readable tables containing:

1. **Per-query/method curve summary** — distribution, tail, score-gap, and candidate knee diagnostics.
2. **Full ordered passage curves** — all passage scores, ranks, adjacent gaps, and empirical percentiles.
3. **Tail composition** — passage count, distinct transcript count, and transcript concentration at each tested tail level.
4. **Full transcript-level curves** — one record per query × method × transcript, with raw maximum score, rank, percentile, and associated top passage identifier.
5. **Transcript-level shape diagnostics** — knees, gaps, tail metrics, and comparison with passage-level structure.
6. **Cross-representation comparison** — stability of candidate ordering and curve features across the four representation families.
7. **Rank-change comparison** — where statistical features or diagnostic ranking prototypes change ordering, especially near ranks 20, 30, and 40.
8. **Interpretation report** — what appears stable, what is query-specific, which features may be useful for ranking, and what remains unproven.
9. **Workbook and ZIP bundle** — include the report, all CSVs, and a manifest. Preserve original filenames for any code files; do not overwrite the source data ZIP.

The report must clearly label any hypothetical or heuristic knee detection and document its parameters. If an analysis cannot be completed or a statistic is unreliable for the available sample size, state that rather than silently omitting it.

## 8. Current decision and immediate next action

**Current decision: no production ranking or slider change.**

The next executable step is to perform the complete passage-curve, tail, and transcript-curve analysis on the available full score export. Then use the observed curve structure and rank changes to decide which features merit a focused human review. The human review should inspect both promoted and demoted recordings with their passages and context, using Target / Useful / Irrelevant / Uncertain and preserving uncertainty.

The immediate question is not “Which formula wins?” It is:

> What reproducible information do the full score curves and tails contain, at both passage and transcript level, and does that information help organize the candidate recordings for memory rediscovery?

Only after this question is answered should we design a small, controlled test of a distribution-aware ranking formula. Keep the current production behavior as the baseline.

## 9. Status at this handoff update

- Handoff updated by appending this addendum; previous material retained.
- No production code changed.
- This update records the current research direction and analysis requirements; it does not claim the curve/tail analysis described above has already been executed.
- Next work should begin with the available full score export and produce reproducible analysis artifacts.

---

# Current Decision Addendum — Peak-Dominant Search Ranking (2026-10-23)

## 1. User's current request and scope

The user has explained that reviewing detailed result tables on a laptop is too difficult. They would prefer that I make the best-supported recommendation, carry out further analysis where useful, and prepare the implementation plan. They cannot perform or review implementation tonight.

This addendum records the latest offline ranking experiment, the resulting recommendation, what is decided, what is not decided, and the concrete next steps. It supplements the earlier distribution and curve analyses; it does not erase their cautions or authorize an untested production change.

## 2. The intended product behavior

The goal remains transcript rediscovery from imperfect recollection, not question answering. The proposed user-facing organization is:

1. Show lexical matches first, retaining the existing lexical ordering and behavior.
2. Show the remaining transcripts in one unified semantic ranking rather than fixed sentence → 3–1 → 5–2 → 7–3 category blocks.
3. If a transcript is already in the lexical results, do not show it a second time in the semantic list. Semantic evidence may still contribute to its transcript highlighting.
4. Keep the existing matched excerpts and the ability to expand “Show transcript” to display the full transcript with highlighting.
5. Keep the existing highlighting behavior unchanged:
   - lexical matches: bold;
   - sentence-semantic matches: yellow;
   - 3–1 chunks: blue;
   - 5–2 chunks: orange;
   - 7–3 chunks: green.
6. Keep the existing progressive display behavior: show 20 results at a time and append another 20 on “Show 20 more” until all results are available.
7. Preserve all candidates for access. A ranking experiment must not silently filter away transcripts merely because their scores are low.

The ranking proposal concerns the order of semantic transcript results, not the lexical matcher, highlighting colors, excerpt composition, full-transcript display, or result pagination. Those should be treated as separate concerns and left unchanged during the initial implementation.

## 3. Latest experiment and what it establishes

The offline experiment package is `Memora_Peak_Dominant_Ranking_Experiment_2026-10-23.zip`. Its source was the previously generated `Transcript_Level_Features.csv` from the distribution-to-evidence analysis. It compares four transcript-level formulas over 28 queries × 114 transcripts = 3,192 query/transcript rows, using sentence, 3–1, 5–2, and 7–3 representation-specific transcript-max percentiles.

The tested variants were:

- **A — Peak only:** maximum of the four representation-specific transcript-max percentiles.
- **B — Peak plus family support:** 85% peak + 15% mean of the two strongest family percentiles.
- **C — Peak plus capped curve support:** 90% peak + 10% of a best-family top-three-mean percentile, with support floored at peak minus 10 percentile points.
- **D — Capped combination:** 80% peak + 12% mean of the two strongest family percentiles + 8% capped best-family support.

Percentiles are relative positions within a query and representation family, not probabilities that a transcript is relevant.

### 3.1 Quantitative summary

| Variant | Mean absolute rank movement vs A | Maximum rank movement | Top-20 boundary crossings vs A | Seed targets in top 20 |
|---|---:|---:|---:|---:|
| A — Peak only | 0 | 0 | 0 | 46 |
| B — Peak + family support | 0.70 | 9 | 24 | 46 |
| C — Peak + capped curve support | 0.77 | 6 | 22 | 46 |
| D — Capped combination | 0.94 | 8 | 28 | 46 |

The “46 seed targets in top 20” value is the total across the benchmark's query-level seed-target records, not 46 unique transcripts. It is not precision and does not prove that the formulas are equivalent in relevance. The benchmark has incomplete relevance judgments, and these measures cannot establish a production winner.

Variants B–D change ranking positions, but none improved the recorded seed-target top-20 count relative to A. C was the most restrained of the non-baseline formulas by maximum rank movement and top-20 crossings, but that alone does not make it more useful. D moved the most candidates across the top-20 boundary among the three support formulas without showing a seed-target top-20 gain.

### 3.2 The direct single-passage failure case

For query `q23`, “an animal frightened me or I was trying to manage an animal,” the transcript `2017-12-26 - Dream Tuesday Morning - large.txt` is the key example. Its strongest sentence passage directly describes a wounded dog and the owner using electrocautery. A different representation's strongest passage pointed to unrelated pool-house material.

Recorded ranks:

| Ranking | Rank of dog transcript |
|---|---:|
| Peak-only A | 8 |
| Peak + family support B | 13 |
| Peak + capped curve support C | 10 |
| Capped combination D | 12 |
| Earlier combined prototype | 22 |

This case illustrates the principal risk of support-heavy formulas: correlated representations may focus on different parts of a long transcript, and evidence from an unrelated passage can demote the recording that contains the clearest match. A strong direct passage should not need repeated confirmation from other passages to earn a high rank.

A peak-only score does not guarantee that the top-ranked transcript is relevant; it merely avoids allowing weak or unrelated evidence to dilute a strong match. Other known failure cases must still be inspected in a controlled test.

## 4. Recommended next implementation: peak-dominant semantic ranking

**Recommendation: use Variant A as the first implementation candidate. Do not implement B, C, or D as the initial production formula.**

For each query, compute the transcript's maximum score percentile separately within each semantic representation family, then assign the transcript its highest of those four percentiles:

`semanticRankScore = max(sentenceMaxPercentile, chunk3_1MaxPercentile, chunk5_2MaxPercentile, chunk7_3MaxPercentile)`

The percentile calculation must be consistent with the experiment's definition and ties must be handled deterministically. Keep raw cosine scores, raw passage ranks, per-family percentiles, and the winning representation/passage as diagnostic evidence. The combined score is an ordering signal only; it must not be described as a probability of relevance.

Why this is the best first candidate:

- It preserves the strongest available representation-specific signal, including a potentially valuable 7–3 contextual match.
- It does not assume that sentence or smaller chunks are inherently more relevant than broader context.
- It does not penalize a transcript because its other passages or representations are weaker or unrelated.
- It is simple enough to audit and compare with the existing order.
- In the current offline benchmark, support bonuses did not increase the recorded seed-target top-20 count.
- The dog example shows why preserving a strong single-passage match matters.

This is a **provisional design recommendation**, not a claim of proven relevance improvement. The experiment is based on exported features rather than a verified browser/model execution of the proposed production path. Before rollout, verify that the per-family transcript-max percentiles are generated from the full candidate distributions, consistently handle missing families and ties, and match the intended production candidate universe.

## 5. Why not add score-curve or cross-representation bonuses yet?

The preceding curve/tail work remains valuable for diagnosis, but no curve feature has yet demonstrated a reliable improvement to memory rediscovery. Elbows, local score gaps, percentiles, and repeated-passage summaries can be useful descriptors; they are not relevance labels.

The four representation families share the same embedding model and overlapping source text. Their agreement is correlated evidence, not four independent votes. Passage count is also an imperfect proxy for opportunity bias because chunks overlap and passages are not independent. A length-matched percentile reduced the observed association between passage count and maximum score in the prior diagnostic, but it is not yet a validated correction.

Therefore:

- Do not add an elbow, curve-shape, length-matching, or multi-passage bonus to the initial production candidate.
- Preserve these measurements in the laboratory for future analysis.
- Reconsider them only if judged examples show a repeatable benefit that peak-only ranking misses.
- Do not remove candidates based on curve shape or a score threshold in this change.

## 6. Implementation contract and boundaries

When implementation resumes, make a small, isolated change to semantic transcript ordering.

### Preserve exactly

- lexical matcher, normalization, fuzzy threshold, and lexical ordering;
- current lexical result styling and behavior;
- the existing highlighting colors and their current precedence;
- matched excerpts and the full-transcript expansion behavior;
- the 20-at-a-time display and “Show 20 more” interaction;
- the existing transcript data and embedding index;
- browser-local transcript inference and current privacy boundary;
- current result context and overlap composition unless a separate, demonstrated defect requires a separate change.

### Change only

- replace the fixed representation/category hierarchy for semantic result ordering with a unified transcript-level order based on the peak-only score;
- deduplicate the semantic list against transcripts already displayed in lexical results, without discarding semantic evidence used for highlights;
- ensure a transcript is represented once in the semantic ranking even if multiple representation families match it;
- retain the evidence needed to show the strongest matching excerpt and all existing highlight types.

### Ranking details to resolve in code review

1. Identify where the current code computes candidate scores and how transcript-level candidates are assembled.
2. Confirm whether the existing exported percentiles can be reproduced in production from the available candidate set without changing retrieval depth or truncation. If production only retains top-K passages, do not silently call a percentile computed from that truncated set a full-distribution percentile.
3. Define behavior if a transcript lacks a representation family or has no candidates for one family. Missing evidence must not be treated as a zero score that distorts the maximum or the percentile denominator.
4. Use a stable tie-breaker, preferably preserving the strongest underlying raw score and then the existing deterministic ordering. Document it and test ties.
5. Keep lexical results first and exclude their transcript IDs from the semantic display list, but keep their semantic match records for highlighting.
6. Do not let pagination or “Show 20 more” cause a transcript to appear twice or reset the established order.
7. Do not change the slider's behavior or remove it in the same patch unless a separate explicit decision is made. The earlier slider simulation showed little meaningful difference and does not establish the correct long-term slider design. For this isolated ranking change, keep the current slider behavior unchanged and document any interaction with the new ordering. If the current slider filters semantic results before ranking, inspect this carefully: the initial recommendation is a ranking-only change, not a hidden selectivity change.

If exact query-relative percentiles cannot be calculated faithfully in production with the existing retained candidates, stop and report the mismatch before substituting a different formula. Do not quietly replace percentiles with raw cosine scores, because scores from different representation families may not be directly comparable.

## 7. Verification plan for the implementation session

The implementation should be delivered in a ZIP archive containing the changed files under their exact original filenames. Do not add numeric suffixes, underscores, or descriptive renames to the code filenames inside the ZIP. Preserve the existing source files and do not overwrite the user's originals.

Before claiming success:

1. Compare the source against the current authoritative production files and identify the precise insertion/change points.
2. Implement the smallest patch in the semantic ranking path.
3. Run syntax/static checks where available and report exactly what they establish.
4. Test deterministic ranking on fixtures covering:
   - one strong sentence match with weak unrelated matches elsewhere;
   - a transcript with strong 7–3 contextual evidence but weaker narrow matches;
   - multiple representation matches for the same transcript;
   - a transcript present in both lexical and semantic results;
   - missing representation data;
   - tied scores and tied percentiles;
   - more than 20 semantic candidates and repeated “Show 20 more” actions;
   - transcript excerpt and full-transcript highlighting.
5. Compare the before/after order for all 28 benchmark queries and report every target crossing the top 5, 10, 20, 30, or 40 boundary.
6. Reinspect the dog example and the physical-confrontation example, including their actual best passages and context.
7. Confirm that the full transcript remains accessible and highlighting is unchanged.
8. If a real browser/model run is not available, label the result as static/unit/fixture testing and do not claim full runtime validation.
9. Keep the original experimental exports unchanged and add a new report for the implementation test.

The benchmark's seed-target ranks can serve as a regression check, but they are not a substitute for relevance judgments. The change should be reversible and should not alter indexing or stored embeddings.

## 8. Decision log

### Decided now

- Search remains a transcript rediscovery tool.
- Lexical results appear first.
- Semantic results use one unified ranking, not fixed representation priority blocks.
- A transcript appearing in lexical results is not repeated in semantic results.
- Existing highlighting colors, excerpt behavior, full-transcript display, and 20-at-a-time pagination remain unchanged.
- The first implementation candidate is peak-only ranking across the four representation-specific transcript-max percentiles.
- No curve-shape, length-matching, multi-passage, or cross-representation support bonus is included in the initial formula.
- No candidate is filtered out by this ranking change.
- Implementation is deferred until the user is ready; no production source has been changed as part of this analysis.

### Not decided

- Whether the slider should eventually be removed, redesigned, or given a new meaning.
- Whether a later, bounded support bonus improves ranking quality.
- Whether any cutoff should remove semantic candidates.
- Whether the peak-only formula improves actual user success; this needs a production-parity test and better relevance judgments.
- Whether the current lab and production implementations are fully equivalent for all ranking and presentation behavior.

### Conditions for revisiting peak-only

Reconsider the formula if a controlled comparison with reviewed passages shows that peak-only repeatedly promotes clearly misleading single-passage matches, or if a modest support feature demonstrably improves rediscovery without demoting strong direct matches. Any such change must be tested on held-out queries or transcripts, not just the same examples used to design it.

## 9. Current status and next action

- Offline ranking simulation: completed for variants A–D using the existing transcript-level feature export.
- Formula selection: provisional recommendation made; peak-only is the preferred first implementation candidate.
- Production code: unchanged.
- Browser/model execution of the proposed production ranking: not performed.
- Full human relevance judgments: incomplete.
- Held-out validation: not completed.
- User implementation/review tonight: not expected.

**Next action when work resumes:** inspect the latest authoritative `search.js` and `searchUI.js`, verify the score/percentile data available to production and the current slider interaction, then implement the isolated peak-only unified semantic ordering and lexical/semantic deduplication. Preserve all existing presentation behavior, test the stated fixtures, compare before/after rankings across all 28 queries, and deliver the changed files in a ZIP with their original filenames intact.

