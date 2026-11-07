# Memora Search Model Optimization

# CURRENT PRODUCTION STRATEGY — 2026-10-26 (GOVERNING)

> **This section records the latest user-approved direction and supersedes any conflicting earlier proposal in this document, especially the earlier statement that lexical priority was still an open question.** The historical research record is archived for provenance; do not treat superseded proposals as current requirements.

## Production objective

Memora is a transcript rediscovery tool. Its search should help users find recordings from incomplete recollection. The production change is a focused ranking/pipeline change, not a redesign of the search UI or result-composition system.

## Query structure and retrieval

- The main search term is expected to be a natural-language description, often several words long, and is especially useful for semantic retrieval.
- Additional search terms are separated by semicolons and are expected to be individual words or short phrases the user remembers.
- **Run every search term through both lexical and semantic retrieval.** Do not assign a term to only one retrieval mode because of its length or role.
- It is acceptable and expected for a short additional term to return no lexical matches at some slider settings while still returning useful semantic matches.
- The search slider controls the fuzziness/strictness of lexical matching. The current minimum is 50%; that minimum may be changed in the future without changing the overall design.
- At 100%, lexical matching remains enabled. It requires the exact phrase as a sequence of words (for example, `pink elephant` must occur as that phrase), while sensible normalization such as case-insensitivity and punctuation differences should not prevent a match. **100% does not mean semantic-only search.**
- At lower settings, the existing fuzzy lexical matcher can accept less exact matches according to its threshold. If lexical matches are noisy, the user can raise the slider; lexical matches are recalculated almost instantaneously.

## Ranking rule: lexical results first

- **Every qualifying lexical match is ranked ahead of every semantic-only match.** This is the user's explicit intended behavior, not an open experiment or a preference to be left to RRF.
- Within the lexical group, retain the existing match-quality ordering/score behavior where possible; the slider determines which matches qualify. Do not introduce a hidden confidence rule that silently discards qualifying lexical matches.
- Semantic retrieval remains important: it supplies results when wording differs from the transcript, and it remains available for every search term. Use the selected semantic ranking/fusion method to order the semantic portion; the latest research direction favors sentence-heavy RRF as the practical candidate, but the lexical-before-semantic boundary is a separate, explicit rule.
- A short term with zero lexical matches contributes no lexical result; its semantic matches can still appear in the semantic portion.
- Avoid treating incidental matches on extremely common words as meaningful merely because they are lexical. Use the existing lexical matcher and its threshold semantics; any proposed exception or new filtering rule that would change which matches qualify must be discussed with the user first.

## Preserve existing result presentation exactly

The user explicitly requires that the current presentation behavior remain unchanged:

- Preserve the current handling of overlap, deduplication, grouping, and composite/nested context.
- Preserve how all matching results are represented and how matching text is highlighted: lexical matches remain bold, and the existing distinct highlight schemes for other match types remain as they are.
- Do not change how transcripts or result cards are presented, how overlap is handled, or how context is composed as part of this ranking work.
- Do not reduce or suppress matches merely to make the new ranking look cleaner.
- If implementing lexical-first ranking appears to conflict with existing overlap/composition, highlight rendering, result ordering inside a composite, or any other established presentation behavior, **stop and explain the concrete conflict and proposed options to the user before making that modification.** Do not silently resolve the conflict.

## Implementation and validation boundaries

1. Inspect the current production implementation before editing; identify where lexical and semantic candidates are assembled and where final ordering is applied.
2. Make the smallest change that puts all qualifying lexical results before semantic-only results while preserving current match objects, scores, highlight metadata, overlap handling, and presentation.
3. Keep the semantic ranking implementation internally configurable if that is straightforward, but do not add user-facing ranking-method controls as part of this task.
4. Reuse the existing fast lexical recalculation path when the slider changes. Avoid re-embedding or rerunning semantic inference if the current architecture can recalculate lexical matches independently.
5. Test the slider boundary, exact phrase behavior at 100%, fuzzy matches at the current minimum, terms with no lexical matches, terms searched both ways, mixed lexical/semantic queries, stable highlighting, and unchanged overlap/composite presentation.
6. Compare the current production behavior with the new ordering on representative queries and inspect rank changes. Tests must distinguish code inspection, syntax checks, unit tests, and actual browser/model tests; never claim a test ran unless it did.
7. Do not alter the transcript corpus, embedding cache format, query syntax, UI layout, overlap rules, highlighting, or result presentation without approval.

## Interpretation of earlier evidence

The benchmark's zero lexical candidates for long natural-language queries does not refute this design: the lab's strict consecutive-window matcher was not suitable for those queries and did not adequately evaluate lexical retrieval. The user's semicolon-separated short terms are intended to provide lexical clues while the main, longer term provides broader semantic context. All terms are still run through both paths.

The earlier comparison favoring sentence-heavy RRF is evidence for choosing a semantic ranking candidate, not a reason to place semantic-only results above qualifying lexical matches. The final production rule is lexical group first, semantic-only group second, with existing display/composition preserved.


## Status and research provenance

Reviewed 7 November 2026. This document preserves the governing production requirements; it is not authorization for another Search refactor. Current priorities are in [CURRENT_STATUS.md](CURRENT_STATUS.md). The design journal records subsequent implemented ranking/UI decisions, including sentence-heavy RRF, lexical priority and incremental display; inspect current code before modifying them.

The primary research benchmark must be blind and target-free when queries are created; target-known queries are a separate diagnostic track. Corpus-informed query themes are not a corpus-independent sample. Do not treat a syntax-checked lab as a completed browser/model benchmark.

The complete experiments, quantitative comparisons, caveats, later handoffs and artifact names remain in the [archived research record](archive/Search_Optimization_Research_Record.md). MiniLM remains the production/default embedding model; E5 evaluation did not authorize adoption. No research evidence or production requirements were deleted.
