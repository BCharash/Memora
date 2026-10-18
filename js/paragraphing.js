// --------------------------------------------------
// Memora paragraphing
// Revision 4 — semantic paragraphing
// --------------------------------------------------
//
// Standalone production module for the paragraphing algorithm
// from the selected Revision 4 implementation.
// It does not rewrite transcript words; it inserts paragraph breaks.
// --------------------------------------------------

let paragraphingWorker = null;
let nextEmbeddingRequestId = 1;
const pendingEmbeddingRequests = new Map();

function getParagraphingWorker() {
    if (paragraphingWorker) {
        return paragraphingWorker;
    }

    const worker = new Worker(
        new URL("./paragraphing-worker.js", import.meta.url),
        { type: "module" }
    );

    worker.addEventListener("message", event => {
        const message = event.data || {};
        const request =
            pendingEmbeddingRequests.get(message.requestId);

        if (!request) {
            return;
        }

        if (message.type === "status") {
            request.statusCallback?.(message.message);
            return;
        }

        pendingEmbeddingRequests.delete(message.requestId);

        if (message.type === "complete") {
            request.resolve(message.embeddings || []);
        } else if (message.type === "error") {
            const error = new Error(
                message.message || "Paragraphing worker failed."
            );
            if (message.stack) {
                error.stack = message.stack;
            }
            request.reject(error);
        }
    });

    const rejectPendingRequests = message => {
        const error = new Error(message);
        for (const request of pendingEmbeddingRequests.values()) {
            request.reject(error);
        }
        pendingEmbeddingRequests.clear();
        worker.terminate();
        paragraphingWorker = null;
    };

    worker.addEventListener("error", event => {
        rejectPendingRequests(
            event.message || "Paragraphing worker stopped unexpectedly."
        );
    });

    worker.addEventListener("messageerror", () => {
        rejectPendingRequests(
            "Could not read a message from the paragraphing worker."
        );
    });

    paragraphingWorker = worker;
    return worker;
}



async function embed(sentences, statusCallback) {
    const worker = getParagraphingWorker();
    const requestId = nextEmbeddingRequestId++;

    return new Promise((resolve, reject) => {
        pendingEmbeddingRequests.set(requestId, {
            resolve,
            reject,
            statusCallback
        });

        worker.postMessage({
            type: "embed-sentences",
            requestId,
            sentences
        });
    });
}

function sentenceSplit(text) {
    text = text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\bMr\./g, "Mr§")
        .replace(/\bMrs\./g, "Mrs§")
        .replace(/\bDr\./g, "Dr§")
        .replace(/\bMs\./g, "Ms§")
        .replace(/\be\.g\./gi, "eg§")
        .replace(/\bi\.e\./gi, "ie§");

    const result =
        text.match(/[^.!?]+(?:[.!?]+["'’”)]*)?(?=\s+|$)/g) || [text];

    return result
        .map(sentence => sentence.replace(/§/g, ".").trim())
        .filter(Boolean);
}

function words(text) {
    return (text.match(/[\p{L}\p{N}’'-]+/gu) || []).length;
}

function cosine(a, b) {
    let dot = 0;
    let aa = 0;
    let bb = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        aa += a[i] * a[i];
        bb += b[i] * b[i];
    }

    return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
}

function mean(embeddings, start, end) {
    if (end <= start || !embeddings.length) return null;

    const dimensions = embeddings[0].length;
    const result = new Array(dimensions).fill(0);

    for (let i = start; i < end; i++) {
        for (let j = 0; j < dimensions; j++) {
            result[j] += embeddings[i][j] / (end - start);
        }
    }

    return result;
}

function meanRange(embeddings, start, end) {
    return mean(
        embeddings,
        Math.max(0, start),
        Math.min(embeddings.length, end)
    );
}

function quantile(values, percentile) {
    if (!values.length) return 0;
    return values[Math.floor((values.length - 1) * percentile)];
}

function sentenceOffsets(sentences) {
    const offsets = [];
    let total = 0;

    for (const sentence of sentences) {
        offsets.push(total);
        total += words(sentence);
    }

    offsets.push(total);
    return offsets;
}

// Revision 4 configuration selected after the full-archive comparison.
// Length is a soft priority only; it never forces a paragraph break.
// No transition-word or discourse-marker lists are used.
const REV4_CONFIG = {
    reprocessAboveWords: 120,
    minSegmentWords: 42,
    minSegmentSentences: 2,
    shortWindow: 2,
    longWindow: 4,
    minimumScore: 0.058,
    quantile: 0.62,
    localRadius: 1,
    minBoundaryGapSentences: 2,
    softReviewWords: 165,
    pressureCap: 0.035
};

function revision4BoundaryScores(sentences, embeddings) {
    const offsets = sentenceOffsets(sentences);
    const scores = [];

    for (let i = 1; i < sentences.length; i++) {
        const leftShort = meanRange(
            embeddings, i - REV4_CONFIG.shortWindow, i
        );
        const rightShort = meanRange(
            embeddings, i, i + REV4_CONFIG.shortWindow
        );
        const leftLong = meanRange(
            embeddings, i - REV4_CONFIG.longWindow, i
        );
        const rightLong = meanRange(
            embeddings, i, i + REV4_CONFIG.longWindow
        );

        if (!leftShort || !rightShort || !leftLong || !rightLong) {
            continue;
        }

        const shortShift = 1 - cosine(leftShort, rightShort);
        const longShift = 1 - cosine(leftLong, rightLong);
        const localGap = 1 - cosine(embeddings[i - 1], embeddings[i]);
        const semanticShift =
            shortShift * 0.55 +
            longShift * 0.30 +
            localGap * 0.15;

        scores.push({
            i,
            semanticShift,
            shortShift,
            longShift,
            localGap,
            wordsBefore: offsets[i],
            wordsAfter: offsets[sentences.length] - offsets[i]
        });
    }

    return scores;
}

function chooseRevision4Breaks(sentences, scores) {
    if (!scores.length) return [];

    const shifts = scores
        .map(score => score.semanticShift)
        .sort((a, b) => a - b);

    const adaptiveThreshold = Math.max(
        REV4_CONFIG.minimumScore,
        quantile(shifts, REV4_CONFIG.quantile)
    );

    const candidates = scores
        .map((score, index) => {
            const pressure = Math.min(
                REV4_CONFIG.pressureCap,
                Math.max(
                    0,
                    score.wordsBefore - REV4_CONFIG.softReviewWords
                ) * 0.00012
            );

            return {
                ...score,
                pressure,
                rankScore: score.semanticShift + pressure,
                index
            };
        })
        .filter(candidate => {
            if (candidate.semanticShift < adaptiveThreshold) return false;

            const nearby = scores
                .slice(
                    Math.max(0, candidate.index - REV4_CONFIG.localRadius),
                    candidate.index
                )
                .concat(
                    scores.slice(
                        candidate.index + 1,
                        Math.min(
                            scores.length,
                            candidate.index + 1 + REV4_CONFIG.localRadius
                        )
                    )
                );

            return nearby.every(
                other => candidate.semanticShift >= other.semanticShift - 0.012
            );
        })
        .sort((a, b) => b.rankScore - a.rankScore);

    const chosen = [];

    for (const candidate of candidates) {
        const boundary = candidate.i;
        const prior = chosen
            .filter(index => index < boundary)
            .sort((a, b) => b - a)[0] || 0;
        const next = chosen
            .filter(index => index > boundary)
            .sort((a, b) => a - b)[0] || sentences.length;

        const offsets = sentenceOffsets(sentences);
        const beforeWords = offsets[boundary] - offsets[prior];
        const afterWords = offsets[next] - offsets[boundary];

        if (
            boundary - prior < REV4_CONFIG.minSegmentSentences ||
            next - boundary < REV4_CONFIG.minSegmentSentences
        ) {
            continue;
        }

        if (
            beforeWords < REV4_CONFIG.minSegmentWords ||
            afterWords < REV4_CONFIG.minSegmentWords
        ) {
            continue;
        }

        if (
            chosen.some(
                index => Math.abs(index - boundary) <
                    REV4_CONFIG.minBoundaryGapSentences
            )
        ) {
            continue;
        }

        chosen.push(boundary);
    }

    return chosen.sort((a, b) => a - b);
}

function applyBreaks(sentences, breaks) {
    const paragraphs = [];
    let start = 0;

    for (const boundary of [...breaks, sentences.length]) {
        if (boundary > start) {
            paragraphs.push(sentences.slice(start, boundary).join(" "));
        }
        start = boundary;
    }

    return paragraphs;
}

/**
 * Apply Revision 4 to raw transcript text.
 *
 * Existing blank-line paragraphing is treated as intentional: if the input
 * contains a blank line, return it unchanged and do not run the model.
 */
export async function paragraphize(text, statusCallback) {
    if (typeof text !== "string" || !text.length) return "";

    // Do not alter a file that already contains any blank-line paragraph break.
    if (/\n[ \t]*\n/.test(text.replace(/\r\n?/g, "\n"))) {
        return text;
    }

    const normalizedText = text
        .replace(/\r\n?/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();

    if (!normalizedText) return "";

    const sentences = sentenceSplit(normalizedText);

    // R4 only reprocesses existing paragraphs longer than 120 words.
    // Raw Whisper transcripts normally arrive as one paragraph.
    if (
        words(normalizedText) <= REV4_CONFIG.reprocessAboveWords ||
        sentences.length < REV4_CONFIG.minSegmentSentences * 2
    ) {
        return normalizedText;
    }

    const embeddings = await embed(sentences, statusCallback);
    const scores = revision4BoundaryScores(sentences, embeddings);
    const breaks = chooseRevision4Breaks(sentences, scores);

    return applyBreaks(sentences, breaks).join("\n\n");
}

/**
 * Paragraphize the spoken section of a complete Memora transcript.
 * Metadata and the original separator are retained verbatim. If the spoken
 * section already has blank lines, the complete input is returned unchanged.
 */
export async function paragraphizeTranscript(text, statusCallback) {
    if (typeof text !== "string" || !text.length) return "";

    const normalized = text.replace(/\r\n?/g, "\n");
    const marker = /^-{10,}[ \t]*$/m;
    const match = marker.exec(normalized);

    if (!match) {
        return await paragraphize(text, statusCallback);
    }

    const separatorStart = match.index;
    const separatorEnd = match.index + match[0].length;
    const afterSeparator = normalized.slice(separatorEnd);
    const leadingLineBreaks = afterSeparator.match(/^(?:[ \t]*\n)+/);
    const bodyPrefix = leadingLineBreaks ? leadingLineBreaks[0] : "";
    const spoken = afterSeparator.slice(bodyPrefix.length);

    if (/\n[ \t]*\n/.test(spoken)) {
        return text;
    }

    const paragraphized = await paragraphize(spoken, statusCallback);

    return (
        normalized.slice(0, separatorEnd) +
        bodyPrefix +
        paragraphized
    );
}
