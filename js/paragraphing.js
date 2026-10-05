// --------------------------------------------------
// Memora paragraphing
// Hybrid Paragraph Test 2
// --------------------------------------------------
//
// Standalone production module for the paragraphing algorithm
// from "Memora — Hybrid Paragraph Test 2".
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

function sentences(text) {
    text = text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    text = text
        .replace(/\bMr\./g, "Mr§")
        .replace(/\bMrs\./g, "Mrs§")
        .replace(/\bDr\./g, "Dr§")
        .replace(/\bMs\./g, "Ms§")
        .replace(/\be\.g\./gi, "eg§")
        .replace(/\bi\.e\./gi, "ie§");

    const result =
        text.match(/[^.!?]+(?:[.!?]+["'’”)]*)?(?=\s+|$)/g) || [text];

    return result
        .map(x => x.replace(/§/g, ".").trim())
        .filter(Boolean);
}

async function embed(S, statusCallback) {
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
            sentences: S
        });
    });
}

function cosine(a, b) {
    let d = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) {
        d += a[i] * b[i];
        aa += a[i] * a[i];
        bb += b[i] * b[i];
    }
    return d / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
}

function mean(E, a, b) {
    if (b <= a) return null;
    const n = E[0].length;
    const r = new Array(n).fill(0);
    for (let i = a; i < b; i++) {
        for (let j = 0; j < n; j++) {
            r[j] += E[i][j] / (b - a);
        }
    }
    return r;
}

function cueScore(s) {
    const x = s.toLowerCase()
        .replace(/^[\s"'“”‘’(\[]+/, "")
        .trim();

    const strong = [
        ["on the other hand", 1.00], ["another approach", .95],
        ["but then", .90], ["number two", .88], ["number three", .88],
        ["one is", .82], ["another thing", .78], ["another point", .78],
        ["the other", .70], ["in fact", .68], ["the reality is", .68],
        ["the reality", .62], ["anyway", .60], ["now", .48], ["so my", .48]
    ];

    for (const [p, w] of strong) {
        if (x === p || x.startsWith(p + " ")) return w;
    }

    // Continuation / elaboration openings resist a paragraph break unless
    // other evidence strongly indicates a new rhetorical move.
    const elaboration = [
        "i remember", "i had", "i was", "there was", "there were", "like i",
        "and", "so", "because", "which", "that", "also", "then", "therefore", "thus"
    ];

    for (const p of elaboration) {
        if (x === p || x.startsWith(p + " ")) return -.22;
    }

    return 0;
}

function boundarySignals(S, E) {
    const out = [];
    let start = 0;

    // The center is the center of the actual developing paragraph.
    for (let i = 1; i < S.length; i++) {
        const paragraphCenter = mean(E, start, i);
        const previous = E[i - 1];
        const current = E[i];
        const immediateGap = 1 - cosine(previous, current);
        const currentFit = cosine(current, paragraphCenter);
        const forwardEnd = Math.min(S.length, i + 3);
        const forward = forwardEnd > i + 1
            ? mean(E, i + 1, forwardEnd)
            : current;
        const forwardFit = cosine(current, forward);
        const direction = Math.max(0, forwardFit - currentFit);
        const cue = cueScore(S[i]);
        const len = i - start;
        const lengthPressure = len <= 8
            ? 0
            : Math.min(.32, (len - 8) * .045);

        const raw =
            immediateGap * .32 +
            direction * .62 +
            Math.max(0, cue) * .30 -
            Math.max(0, -cue) * .72 +
            lengthPressure;

        out.push({
            i, start, len, immediateGap, currentFit,
            forwardFit, direction, cue, raw
        });
    }

    const values = out.map(x => x.raw).sort((a, b) => a - b);
    const q = pct => {
        if (!values.length) return 0;
        return values[Math.floor((values.length - 1) * pct)];
    };
    const median = q(.50);
    const iqr = Math.max(.0001, q(.75) - q(.25));

    for (const b of out) b.z = (b.raw - median) / iqr;
    return out;
}

function chooseBreaks(S, B) {
    const breaks = [];
    let start = 0;

    for (let k = 0; k < B.length; k++) {
        const b = B[k], i = b.i;

        if (i - start < 4) continue;

        const local = B.slice(
            Math.max(0, k - 2),
            Math.min(B.length, k + 3)
        );
        if (b.raw < Math.max(...local.map(x => x.raw)) - .025) continue;

        const next = B[k + 1];
        const persistent = next &&
            next.forwardFit > next.currentFit &&
            next.direction > .012;

        const strongCue = b.cue >= .78;
        const moderateCue = b.cue >= .45;

        let evidence = b.z;
        if (persistent) evidence += .38;
        if (strongCue) evidence += .34;
        else if (moderateCue) evidence += .12;
        if (b.direction > .075) evidence += .18;

        const minLen =
            (strongCue && b.direction > .035) ? 4 : 5;

        if (i - start < minLen) continue;
        if (breaks.length && i - breaks[breaks.length - 1] < 4) continue;

        if (evidence >= .92) {
            breaks.push(i);
            start = i;
        }
    }

    return breaks;
}

function formatParagraphs(S, breaks) {
    const paragraphs = [];
    let start = 0;

    for (const boundary of [...breaks, S.length]) {
        if (boundary > start) {
            paragraphs.push(S.slice(start, boundary).join(" "));
        }
        start = boundary;
    }

    return paragraphs.join("\n\n");
}

/**
 * Paragraphize raw Whisper transcript text.
 *
 * Returns the same spoken words with blank lines inserted between
 * semantic paragraphs. The model is loaded once and reused for the
 * lifetime of the page/module.
 */
export async function paragraphize(text, statusCallback) {
    if (!text || !text.trim()) return "";

    const normalizedText = text.replace(/\r\n?/g, "\n").trim();

    // Preserve transcripts that already have paragraph breaks. Re-embedding
    // them would add a long model pass without improving their formatting.
    if (/\n\s*\n/.test(normalizedText)) {
        return normalizedText;
    }

    const S = sentences(normalizedText);

    // Match the reference implementation: short text is not
    // semantically paragraphized.
    if (S.length < 7) return S.join(" ");

    const E = await embed(S, statusCallback);
    const B = boundarySignals(S, E);
    const breaks = chooseBreaks(S, B);

    return formatParagraphs(S, breaks);
}

/**
 * Paragraphize a complete Memora transcript while preserving its
 * metadata block and separator. This is intended for the future
 * "paragraph existing transcripts" workflow.
 */
export async function paragraphizeTranscript(text, statusCallback) {
    if (!text || !text.trim()) return "";

    const normalized = text.replace(/\r\n?/g, "\n");
    const marker = /^-{10,}\s*$/m;
    const match = normalized.match(marker);

    if (!match) {
        return paragraphize(normalized, statusCallback);
    }

    const metadata = normalized.slice(0, match.index).trimEnd();
    const recording = normalized
        .slice(match.index + match[0].length)
        .trim();

    const paragraphized = await paragraphize(
        recording,
        statusCallback
    );

    return (
        metadata +
        "\n\n--------------------\n\n" +
        paragraphized
    );
}
