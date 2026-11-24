export const searchHighlightColors = {
    yellow: "#FFFF00",
    blue: "#C8E7FF",
    orange: "#FFD2B3",
    green: "#D8EBCB"
};

function normalizeWithOffsets(text, start = 0) {
    const offsets = [];
    let normalized = "";
    for (const match of text.matchAll(/\s+|\S/g)) {
        offsets.push(start + match.index);
        normalized += /^\s/.test(match[0]) ? " " : match[0];
    }
    offsets.push(start + text.length);
    return {normalized, offsets};
}

export function splitHighlightSentences(text) {
    const sentences = [];
    const boundaries = [...text.matchAll(/\r?\n\s*\r?\n+/g), {index: text.length, 0: ""}];
    let paragraphStart = 0;
    let paragraphIndex = 0;
    for (const boundary of boundaries) {
        const paragraph = text.slice(paragraphStart, boundary.index);
        const {normalized, offsets} = normalizeWithOffsets(paragraph, paragraphStart);
        paragraphStart = boundary.index + boundary[0].length;
        const protectedText = normalized
            .replace(/(\d)\.(?=\d)/g, "$1§")
            .replace(/\b(?:Mr|Mrs|Dr|Ms)\./g, value => value.replace(".", "§"))
            .replace(/\b(?:e\.g\.|i\.e\.)/gi, value => value.replaceAll(".", "§"));
        let sentenceIndex = 0;
        for (const match of protectedText.matchAll(/[^.!?]+(?:[.!?]+["'’”)]*)?(?=\s+|$)/g)) {
            const start = match.index + match[0].length - match[0].trimStart().length;
            const end = match.index + match[0].trimEnd().length;
            if (end <= start) continue;
            const key = normalized.slice(start, end);
            const searchOffsets = [];
            let searchText = "";
            const abbreviations = new Set([...key.matchAll(/\b(?:e\.g\.|i\.e\.)/gi)].map(item => item.index));
            for (let i = 0; i < key.length; i++) {
                if (abbreviations.has(i)) {
                    searchOffsets.push(i, i + 2, i + 3);
                    searchText += key[i].toLowerCase() + key[i + 2].toLowerCase() + ".";
                    i += 3;
                } else {
                    searchOffsets.push(i);
                    searchText += key[i];
                }
            }
            searchOffsets.push(key.length);
            sentences.push({
                key, searchText, searchOffsets, paragraphIndex, sentenceIndex: sentenceIndex++,
                offsets: offsets.slice(start, end + 1)
            });
        }
        if (paragraph.trim()) paragraphIndex++;
    }
    return sentences;
}

function indexSentences(sentences) {
    const index = new Map();
    for (const [position, sentence] of sentences.entries()) {
        if (!index.has(sentence.key)) index.set(sentence.key, []);
        index.get(sentence.key).push(position);
    }
    return index;
}

export function resolveSearchHighlights(snapshot, text) {
    if (!snapshot) return [];
    const source = normalizeWithOffsets(snapshot.text);
    const updated = normalizeWithOffsets(text);
    if (source.normalized.trim() === updated.normalized.trim()) {
        // Use offsets from the unchanged text when an edit only reflows whitespace,
        // including a paragraph break inserted inside a highlighted sentence.
        const shift = Number(updated.normalized.startsWith(" ")) - Number(source.normalized.startsWith(" "));
        const translated = new Map(source.offsets.map((offset, index) => [offset, updated.offsets[index + shift]]));
        return snapshot.sentences.filter(sentence => sentence.color || sentence.bold.length).map(sentence => ({
            start: translated.get(sentence.offsets[0]),
            end: translated.get(sentence.offsets.at(-1)),
            color: sentence.color,
            bold: sentence.bold.map(({start, end}) => ({
                start: translated.get(sentence.offsets[start]),
                end: translated.get(sentence.offsets[end])
            }))
        }));
    }
    const current = splitHighlightSentences(text);
    const original = snapshot.sentences;
    const sameOrder = current.length === original.length &&
        current.every((sentence, i) => sentence.key === original[i].key);
    const oldIndex = indexSentences(original);
    const newIndex = indexSentences(current);
    const sharesNeighbor = (old, next) => [-1, 1].some(delta =>
        original[old + delta] && original[old + delta].key === current[next + delta]?.key
    );
    const highlights = [];
    for (const [i, sentence] of original.entries()) {
        if (!sentence.color && !sentence.bold.length) continue;
        const previous = oldIndex.get(sentence.key);
        const next = newIndex.get(sentence.key) || [];
        let position = sameOrder ? i : next[0];
        if (!sameOrder && (previous.length !== 1 || next.length !== 1)) {
            // Require a unique match in both directions when a sentence is repeated.
            const candidates = next.filter(candidate => sharesNeighbor(i, candidate));
            if (candidates.length !== 1 ||
                previous.filter(candidate => sharesNeighbor(candidate, candidates[0])).length !== 1) continue;
            [position] = candidates;
        }
        const target = current[position];
        if (!target) continue;
        highlights.push({
            start: target.offsets[0],
            end: target.offsets.at(-1),
            color: sentence.color,
            bold: sentence.bold.map(({start, end}) => ({
                start: target.offsets[start],
                end: target.offsets[end]
            }))
        });
    }
    return highlights.sort((a, b) => a.start - b.start);
}

export function transcriptHighlightRuns(text, highlights = []) {
    const runs = [];
    const append = (start, end, color, bold) => {
        if (end > start) runs.push({text: text.slice(start, end), color, bold});
    };
    let cursor = 0;
    for (const highlight of highlights) {
        append(cursor, highlight.start);
        cursor = highlight.start;
        for (const {start, end} of highlight.bold) {
            append(cursor, start, highlight.color);
            append(Math.max(cursor, start), end, highlight.color, true);
            cursor = Math.max(cursor, end);
        }
        append(cursor, highlight.end, highlight.color);
        cursor = highlight.end;
    }
    append(cursor, text.length);
    return runs;
}
