// Checkpoint 1: read-only, deliberately not imported by the production workflow.
// Container conventions follow iMuse recording-identity.js (v1, 16 Nov 2026).
// No decoding, writing, UUID generation, persistence or UI dependencies.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMUSE_BOX = '91c3892e57a44f78a9833a19947c9c01';
const COMBINE_BOX = '694d757365436f6d62696e6500000001';
const TAG = 'IMUSE_RECORDING_METADATA';
const MAX_IDENTITY = 4096;
const MAX_METADATA = 1024 * 1024;
const MAX_ELEMENTS = 1000000;
const decoder = new TextDecoder('utf-8', { fatal: true });
const ascii = data => String.fromCharCode(...data);
const hex = data => Array.from(data, n => n.toString(16).padStart(2, '0')).join('');
const equalId = (a, b) => a.toLowerCase() === b.toLowerCase();

class IdentityError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function requireValue(value, code, message, status = 'invalid') {
    if (!value) throw new IdentityError(status, code, message);
}
async function bytes(blob, start, end) {
    return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}
function text(data) {
    try { return decoder.decode(data); }
    catch { throw new IdentityError('invalid', 'invalid-utf8', 'Recording metadata is not valid UTF-8.'); }
}
function json(data, limit) {
    requireValue(data.length > 0 && data.length <= limit, 'metadata-size', 'Recording metadata exceeds its supported size or is empty.');
    const value = text(data);
    try { return JSON.parse(value); }
    catch { throw new IdentityError('invalid', 'invalid-json', 'Recording metadata is not valid JSON.'); }
}
function payload(data) {
    const value = json(data, MAX_IDENTITY);
    requireValue(value?.format === 'imuse-recording' && value.version === 1,
        'identity-version', 'The embedded recording identity format or version is unsupported.', 'unsupported');
    requireValue(typeof value.recordingId === 'string' && UUID.test(value.recordingId), 'invalid-uuid', 'The embedded Recording ID is not a UUID.');
    return value.recordingId;
}

// All errors return a null resolved ID; evidence is descriptive, never a fallback.
// identityOrigins preserves both origins when Apple and iMuse agree. A future
// source-list adapter chooses its single-origin representation, not this reader.
export async function readEmbeddedRecordingIdentity(blob) {
    const evidence = [], issues = [];
    let container = null, provenance = null, elements = 0;
    const tick = () => requireValue(++elements <= MAX_ELEMENTS, 'element-limit', 'The container has too many metadata elements.', 'unsupported');
    const addIssue = (error, scope = 'identity') => issues.push(error instanceof IdentityError
        ? { status: error.status, code: error.code, message: error.message, scope }
        : { status: 'invalid', code: 'read-failed', message: 'Recording metadata could not be read.', scope });
    const inspect = async (work, scope = 'identity') => { try { await work(); } catch (error) { if (!(error instanceof IdentityError)) throw error; addIssue(error, scope); } };
    let imuseCount = 0, appleCount = 0, provenanceCount = 0;
    function addImuse(data) {
        if (++imuseCount > 1) addIssue(new IdentityError('conflicting', 'duplicate-imuse', 'The audio contains duplicate iMuse recording identities.'));
        evidence.push({ recordingId: payload(data), origin: 'imuse-embedded' });
    }
    function addApple(value) {
        if (++appleCount > 1) addIssue(new IdentityError('conflicting', 'duplicate-apple', 'The audio contains duplicate Apple recording identities.'));
        requireValue(UUID.test(value), 'invalid-apple-uuid', 'The Apple Recording ID is not a UUID.');
        evidence.push({ recordingId: value, origin: 'apple-embedded' });
    }

    // Bounded box traversal, including extended and open-ended box sizes.
    async function boxes(start, end, visit) {
        for (let offset = start; offset < end;) {
            tick();
            const head = await bytes(blob, offset, Math.min(end, offset + 32));
            requireValue(head.length >= 8, 'mp4-header', 'The MP4 box header is truncated.');
            const view = new DataView(head.buffer);
            let size = view.getUint32(0), headerSize = 8;
            if (size === 1) {
                requireValue(head.length >= 16, 'mp4-header', 'The extended MP4 box header is truncated.');
                size = view.getUint32(8) * 4294967296 + view.getUint32(12); headerSize = 16;
            } else if (size === 0) size = end - offset;
            requireValue(Number.isSafeInteger(size) && size >= headerSize && size <= end - offset, 'mp4-length', 'The MP4 box length is invalid.');
            await visit({ type: ascii(head.slice(4, 8)), start: offset + headerSize, end: offset + size });
            offset += size;
        }
    }
    async function bounded(start, end, limit) {
        requireValue(end >= start && end - start <= limit, 'metadata-size', 'Recording metadata exceeds its supported size.');
        return bytes(blob, start, end);
    }
    // Known Apple iTunes freeform convention: mean/name/data within one ----
    // item. Never scan mdat or use an unrelated nearby UUID as Apple identity.
    async function appleItem(item) {
        let names = [], means = [], values = [];
        await boxes(item.start, item.end, async box => {
            if (box.type === 'name' || box.type === 'mean') {
                requireValue(box.end - box.start >= 4, 'apple-header', 'An Apple metadata field is truncated.');
                const value = text(await bounded(box.start + 4, box.end, MAX_IDENTITY));
                (box.type === 'name' ? names : means).push(value);
            } else if (box.type === 'data') values.push(box);
        });
        if (!names.includes('voice-memo-uuid')) return;
        requireValue(names.length === 1 && means.length <= 1 && (!means.length || means[0] === 'com.apple.iTunes') && values.length === 1,
            'apple-fields', 'The Apple recording identity fields are ambiguous.');
        const box = values[0];
        requireValue(box.end - box.start >= 8, 'apple-header', 'The Apple identity data is truncated.');
        const header = await bytes(blob, box.start, box.start + 8);
        requireValue(new DataView(header.buffer).getUint32(0) === 1, 'apple-type', 'The Apple identity data type is unsupported.', 'unsupported');
        addApple(text(await bounded(box.start + 8, box.end, MAX_IDENTITY)));
    }
    async function appleTree(start, end, depth = 0) {
        requireValue(depth < 8, 'mp4-depth', 'The MP4 metadata is nested too deeply.', 'unsupported');
        await boxes(start, end, async box => {
            if (box.type === '----') await inspect(() => appleItem(box));
            else if (['moov', 'udta', 'ilst'].includes(box.type)) await appleTree(box.start, box.end, depth + 1);
            else if (box.type === 'meta') {
                requireValue(box.end - box.start >= 4, 'mp4-meta', 'The MP4 metadata header is truncated.');
                const header = await bytes(blob, box.start, box.start + 4);
                requireValue(header.every(n => n === 0), 'mp4-meta-version', 'The MP4 metadata version is unsupported.', 'unsupported');
                await appleTree(box.start + 4, box.end, depth + 1);
            }
        });
    }
    async function mp4() {
        await boxes(0, blob.size, async box => {
            if (box.type === 'moov') await inspect(() => appleTree(box.start, box.end), 'container');
            if (box.type !== 'uuid') return;
            requireValue(box.end - box.start >= 16, 'mp4-uuid', 'The MP4 UUID box is truncated.');
            const type = hex(await bytes(blob, box.start, box.start + 16));
            if (type === IMUSE_BOX) await inspect(async () => addImuse(await bounded(box.start + 16, box.end, MAX_IDENTITY)));
            if (type === COMBINE_BOX) await inspect(async () => {
                if (++provenanceCount > 1) addIssue(new IdentityError('conflicting', 'duplicate-provenance', 'The audio contains duplicate combined-recording provenance.'), 'provenance');
                const value = json(await bounded(box.start + 16, box.end, MAX_METADATA), MAX_METADATA);
                provenance = value; // Retained separately even when its format is unsupported.
                requireValue(value?.format === 'imuse-combined-recording' && value.version === 1, 'provenance-version', 'The combined-recording provenance format or version is unsupported.', 'unsupported');
                requireValue(typeof value.id === 'string' && value.id.length > 0, 'provenance-id', 'The combined-recording output identity is missing.');
            }, 'provenance');
        });
    }
    async function wav() {
        const head = await bytes(blob, 0, 12);
        requireValue(new DataView(head.buffer).getUint32(4, true) + 8 === blob.size, 'riff-size', 'The WAV container is incomplete or has an invalid length.');
        for (let offset = 12; offset < blob.size;) {
            tick();
            const h = await bytes(blob, offset, offset + 8);
            requireValue(h.length === 8, 'riff-header', 'The WAV chunk header is truncated.');
            const size = new DataView(h.buffer).getUint32(4, true), end = offset + 8 + size;
            requireValue(end + size % 2 <= blob.size, 'riff-chunk', 'The WAV chunk length is invalid.');
            if (ascii(h.slice(0, 4)) === 'imID') await inspect(async () => addImuse(await bounded(offset + 8, end, MAX_IDENTITY)));
            offset = end + size % 2;
        }
    }
    async function webm() {
        async function header(offset, end) {
            tick();
            const data = await bytes(blob, offset, Math.min(end, offset + 12));
            const id = vint(data, 0, true), size = vint(data, id.width);
            const start = offset + id.width + size.width;
            requireValue(start <= end && (size.unknown || size.value <= end - start), 'ebml-length', 'The WebM element is truncated.');
            return { id: id.value, start, end: size.unknown ? null : start + size.value };
        }
        const ebml = await header(0, blob.size);
        requireValue(ebml.id === 0x1a45dfa3 && ebml.end !== null, 'ebml-header', 'The WebM header is invalid.');
        // An EBML signature alone can also denote Matroska. Require WebM DocType.
        let docType = null;
        for (let pos = ebml.start; pos < ebml.end;) {
            const h = await header(pos, ebml.end);
            requireValue(h.end !== null, 'ebml-header', 'The WebM header has an unknown-size child.');
            if (h.id === 0x4282) docType = text(await bounded(h.start, h.end, 32));
            pos = h.end;
        }
        requireValue(docType === 'webm', 'ebml-doctype', 'This EBML container is not supported WebM.', 'unsupported');
        const segment = await header(ebml.end, blob.size);
        requireValue(segment.id === 0x18538067 && (segment.end === null || segment.end === blob.size), 'ebml-segment', 'Expected one complete WebM segment.');
        const levelOne = new Set([0x114d9b74, 0x1549a966, 0x1654ae6b, 0x1f43b675, 0x1c53bb6b, 0x1941a469, 0x1043a770, 0x1254c367]);
        async function tags(start, end, depth = 0) {
            requireValue(depth < 8, 'webm-depth', 'WebM tags are nested too deeply.', 'unsupported');
            const names = [], values = [];
            for (let pos = start; pos < end;) {
                const h = await header(pos, end);
                requireValue(h.end !== null, 'webm-tags', 'A WebM tag has an unknown length.');
                if (h.id === 0x45a3) names.push(text(await bounded(h.start, h.end, MAX_IDENTITY)));
                else if (h.id === 0x4487) values.push(h);
                else if ([0x7373, 0x67c8].includes(h.id)) await tags(h.start, h.end, depth + 1);
                pos = h.end;
            }
            if (names.includes(TAG)) await inspect(async () => {
                requireValue(names.length === 1 && values.length === 1, 'webm-tag-fields', 'The iMuse WebM tag has missing or duplicate fields.');
                addImuse(await bounded(values[0].start, values[0].end, MAX_IDENTITY));
            });
        }
        for (let pos = segment.start; pos < blob.size;) {
            const h = await header(pos, blob.size);
            // Do not silently accept an unverified segment checksum.
            requireValue(h.id !== 0xbf, 'webm-crc', 'WebM segment checksum verification is unsupported.', 'unsupported');
            if (h.id === 0x1254c367) {
                requireValue(h.end !== null && h.end - h.start <= MAX_METADATA, 'webm-tags-size', 'WebM tags exceed the supported limit.');
                await tags(h.start, h.end);
            }
            if (h.end !== null) { pos = h.end; continue; }
            requireValue(h.id === 0x1f43b675, 'webm-unknown', 'This unknown-size WebM element is unsupported.', 'unsupported');
            pos = h.start;
            while (pos < blob.size) {
                const child = await header(pos, blob.size);
                if (levelOne.has(child.id)) break;
                requireValue(child.end !== null, 'webm-cluster', 'This unknown-size WebM cluster child is unsupported.', 'unsupported');
                pos = child.end;
            }
        }
    }
    async function ogg() {
        let offset = 0, serial = null, sequence = 0, packetIndex = 0, fragments = [], length = 0, codec = null, ended = false;
        // Validate the complete page chain, not just pages preceding the tag.
        while (offset < blob.size) {
            tick();
            const page = await oggPage(blob, offset);
            if (serial === null) serial = page.serial;
            requireValue(page.serial === serial, 'ogg-stream', 'Chained or multiplexed Ogg streams are unsupported.', 'unsupported');
            requireValue(!ended && page.sequence === sequence++ && !!(page.flags & 1) === (fragments.length > 0) &&
                !!(page.flags & 2) === (page.sequence === 0) && !(page.flags & ~7), 'ogg-sequence', 'The Ogg page sequence or continuation is invalid.');
            let at = 0;
            for (const lace of page.laces) {
                if (packetIndex < 2) {
                    fragments.push(page.body.slice(at, at + lace)); length += lace;
                    requireValue(length <= MAX_METADATA, 'ogg-comments-size', 'Ogg headers exceed the supported size.');
                }
                at += lace;
                if (lace < 255) {
                    if (packetIndex < 2) {
                        const packet = new Uint8Array(length); let into = 0;
                        for (const part of fragments) { packet.set(part, into); into += part.length; }
                        if (packetIndex === 0) {
                            codec = ascii(packet.slice(0, 8)) === 'OpusHead' ? 'opus' : packet[0] === 1 && ascii(packet.slice(1, 7)) === 'vorbis' ? 'vorbis' : null;
                            requireValue(codec, 'ogg-codec', 'Only Ogg Opus and Vorbis identities are supported.', 'unsupported');
                        } else await oggComments(packet, codec);
                    }
                    fragments = []; length = 0; packetIndex++;
                } else if (packetIndex >= 2) fragments = [true]; // Track continuation without buffering audio.
            }
            ended = !!(page.flags & 4);
            requireValue(!ended || fragments.length === 0, 'ogg-packet', 'The final Ogg packet is incomplete.');
            offset = page.end;
        }
        requireValue(ended && packetIndex >= 2, 'ogg-incomplete', 'The Ogg stream is incomplete.');
        async function oggComments(packet, codec) {
            let at = codec === 'opus' ? 8 : 7;
            requireValue(codec === 'opus' ? ascii(packet.slice(0, 8)) === 'OpusTags' : packet[0] === 3 && ascii(packet.slice(1, 7)) === 'vorbis', 'ogg-comments', 'The Ogg comment header is missing.');
            const view = new DataView(packet.buffer);
            function number() {
                requireValue(at + 4 <= packet.length, 'ogg-comments', 'Ogg comments are truncated.');
                const n = view.getUint32(at, true); at += 4; return n;
            }
            function block() {
                const n = number();
                requireValue(n <= MAX_METADATA && n <= packet.length - at, 'ogg-comments', 'An Ogg comment is oversized or truncated.');
                const value = packet.slice(at, at + n); at += n; return value;
            }
            block(); const count = number();
            requireValue(count <= 10000, 'ogg-comment-count', 'The Ogg stream has too many comments.', 'unsupported');
            const prefixLength = TAG.length + 1;
            for (let i = 0; i < count; i++) {
                const value = block();
                if (ascii(value.slice(0, prefixLength)).toUpperCase() === TAG + '=') await inspect(() => addImuse(value.slice(prefixLength)));
            }
            if (codec === 'vorbis') requireValue(at < packet.length && packet[at] === 1 && at + 1 === packet.length, 'vorbis-framing', 'The Vorbis comment framing is invalid.');
        }
    }
    try {
        requireValue(blob && typeof blob.slice === 'function' && Number.isSafeInteger(blob.size) && blob.size >= 0, 'invalid-file', 'A readable audio file is required.');
        const head = await bytes(blob, 0, 16);
        if (ascii(head.slice(4, 8)) === 'ftyp') { container = 'mp4'; await mp4(); }
        else if (hex(head.slice(0, 4)) === '1a45dfa3') { container = 'webm'; await webm(); }
        else if (ascii(head.slice(0, 4)) === 'OggS') { container = 'ogg'; await ogg(); }
        else if (ascii(head.slice(0, 4)) === 'RIFF' && ascii(head.slice(8, 12)) === 'WAVE') { container = 'wav'; await wav(); }
        else throw new IdentityError('unsupported', 'container', 'This audio container is not supported by the recording identity reader.');
    } catch (error) { addIssue(error, 'container'); }
    const ids = new Set(evidence.map(item => item.recordingId.toLowerCase()));
    if (ids.size > 1) addIssue(new IdentityError('conflicting', 'embedded-disagreement', 'The embedded recording identities disagree.'));
    if (provenance?.format === 'imuse-combined-recording' && provenance.version === 1 && typeof provenance.id === 'string' &&
        evidence.some(item => !equalId(item.recordingId, provenance.id))) {
        addIssue(new IdentityError('conflicting', 'provenance-disagreement', 'The Recording ID disagrees with the combined-recording output ID.'), 'provenance');
    }
    const status = ['conflicting', 'invalid', 'unsupported'].find(value => issues.some(issue => issue.status === value)) || (evidence.length ? 'valid' : 'absent');
    return { status, container, recordingId: status === 'valid' ? evidence[0].recordingId : null,
        identityOrigins: [...new Set(evidence.map(item => item.origin))], evidence, issues, combinedProvenance: provenance };
}

function vint(input, offset, id = false) {
    requireValue(offset < input.length && input[offset] !== 0, 'ebml-integer', 'An EBML integer is invalid.');
    let width = 1, mask = 128;
    while (!(input[offset] & mask)) { mask >>= 1; width++; }
    requireValue(width <= (id ? 4 : 8) && offset + width <= input.length, 'ebml-integer', 'An EBML integer is truncated.');
    let value = id ? input[offset] : input[offset] & (mask - 1), unknown = !id && value === mask - 1;
    for (let i = 1; i < width; i++) { value = value * 256 + input[offset + i]; unknown &&= input[offset + i] === 255; }
    requireValue(unknown || Number.isSafeInteger(value), 'ebml-integer', 'An EBML integer exceeds the supported range.');
    return { value, width, unknown };
}
function oggCrc(input) {
    let crc = 0;
    for (const byte of input) {
        crc ^= byte << 24;
        for (let bit = 0; bit < 8; bit++) crc = (crc & 0x80000000) ? (crc << 1) ^ 0x04c11db7 : crc << 1;
    }
    return crc >>> 0;
}
async function oggPage(blob, offset) {
    const head = await bytes(blob, offset, offset + 27);
    requireValue(head.length === 27 && ascii(head.slice(0, 4)) === 'OggS' && head[4] === 0, 'ogg-header', 'An Ogg page header is invalid or truncated.');
    const laces = await bytes(blob, offset + 27, offset + 27 + head[26]);
    requireValue(laces.length === head[26], 'ogg-lacing', 'Ogg lacing is truncated.');
    const length = 27 + laces.length + laces.reduce((sum, n) => sum + n, 0);
    requireValue(offset + length <= blob.size, 'ogg-page', 'An Ogg page is truncated.');
    const data = await bytes(blob, offset, offset + length), view = new DataView(data.buffer), crc = view.getUint32(22, true);
    view.setUint32(22, 0, true);
    requireValue(oggCrc(data) === crc, 'ogg-checksum', 'An Ogg page checksum is invalid.');
    return { end: offset + length, serial: view.getUint32(14, true), sequence: view.getUint32(18, true), flags: head[5], laces, body: data.subarray(27 + laces.length) };
}
