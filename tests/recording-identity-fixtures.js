// Synthetic encoded-container shapes, not playable private recordings.
export const ID = '4cd30ed1-dad7-4f9b-876c-0ba7f9d53ed9';
export const OTHER = '12345678-1234-4234-8234-123456789abc';
export const encode = value => new TextEncoder().encode(value);
export const join = parts => {
    const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0;
    for (const p of parts) { result.set(p, at); at += p.length; } return result;
};
export const number = (n, little = false) => { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, n, little); return out; };
export const hex = value => Uint8Array.from(value.match(/../g), v => parseInt(v, 16));
export const payload = (recordingId = ID, version = 1) => encode(JSON.stringify({ format: 'imuse-recording', version, recordingId }));
export const box = (type, body) => join([number(body.length + 8), encode(type), body]);
export const imuseBox = (data = payload()) => box('uuid', join([hex('91c3892e57a44f78a9833a19947c9c01'), data]));
export const combinedBox = value => box('uuid', join([hex('694d757365436f6d62696e6500000001'), encode(JSON.stringify(value))]));
export function appleItem(id = ID, extra = []) {
    return box('----', join([
        box('mean', join([number(0), encode('com.apple.iTunes')])),
        box('name', join([number(0), encode('voice-memo-uuid')])),
        box('data', join([number(1), number(0), encode(id)])), ...extra
    ]));
}
export const appleMoov = (items = [appleItem()]) => box('moov', box('udta', box('meta', join([number(0), box('ilst', join(items))]))));
export const mp4 = (parts = []) => new Blob([box('ftyp', encode('M4A ')), ...parts, box('mdat', new Uint8Array([1, 2, 3, 4]))]);
export const wavChunk = (type, data) => join([encode(type), number(data.length, true), data, ...(data.length % 2 ? [new Uint8Array(1)] : [])]);
export const wav = (parts = []) => {
    const body = join([encode('WAVE'), wavChunk('data', new Uint8Array([1, 0, 2, 0])), ...parts]);
    return new Blob([encode('RIFF'), number(body.length, true), body]);
};
export function size(n, width = null) {
    if (width === null) { width = 1; while (n >= 2 ** (7 * width) - 1) width++; }
    const out = new Uint8Array(width); let value = n;
    for (let i = width - 1; i >= 0; i--) { out[i] = value % 256; value = Math.floor(value / 256); }
    out[0] |= 1 << (8 - width); return out;
}
export const element = (id, data) => join([hex(id), size(data.length), data]);
export const simpleTag = (data = payload(), extra = []) => element('67c8', join([element('45a3', encode('IMUSE_RECORDING_METADATA')), element('4487', data), ...extra]));
export function webm(tags = [], { unknown = true, unknownCluster = false } = {}) {
    const block = element('a3', new Uint8Array([0x81, 0, 0, 0x80, 1, 2, 3]));
    const cluster = unknownCluster ? join([hex('1f43b675'), new Uint8Array([255]), block]) : element('1f43b675', block);
    const body = join([cluster, ...(tags.length ? [element('1254c367', element('7373', join(tags)))] : [])]);
    return new Blob([element('1a45dfa3', element('4282', encode('webm'))), hex('18538067'), unknown ? new Uint8Array([255]) : size(body.length, 3), body]);
}
export function crc(data) {
    let n = 0;
    for (const value of data) { n ^= value << 24; for (let i = 0; i < 8; i++) n = n & 0x80000000 ? (n << 1) ^ 0x04c11db7 : n << 1; }
    return n >>> 0;
}
export function page(sequence, laces, body, flags = 0, serial = 1234) {
    const out = new Uint8Array(27 + laces.length + body.length), view = new DataView(out.buffer);
    out.set(encode('OggS')); out[5] = flags; view.setUint32(14, serial, true); view.setUint32(18, sequence, true);
    out[26] = laces.length; out.set(laces, 27); out.set(body, 27 + laces.length); view.setUint32(22, crc(out), true); return out;
}
export function ogg(comments = [], { vorbis = false, large = false } = {}) {
    const head = vorbis ? join([new Uint8Array([1]), encode('vorbis'), new Uint8Array(22)]) : join([encode('OpusHead'), new Uint8Array([1, 1, 0, 0, 128, 187, 0, 0, 0, 0, 0])]);
    const vendor = encode('synthetic fixture');
    const list = [encode('TITLE=' + (large ? 'x'.repeat(64900) : 'café 東京')), ...comments];
    const packet = join([vorbis ? join([new Uint8Array([3]), encode('vorbis')]) : encode('OpusTags'), number(vendor.length, true), vendor, number(list.length, true),
        ...list.flatMap(value => [number(value.length, true), value]), ...(vorbis ? [new Uint8Array([1])] : [])]);
    const parts = [page(0, [head.length], head, 2)]; let pos = 0, sequence = 1;
    const laces = Array(Math.floor(packet.length / 255)).fill(255); laces.push(packet.length % 255);
    for (let i = 0; i < laces.length; i += 255) {
        const group = laces.slice(i, i + 255), n = group.reduce((a, b) => a + b, 0);
        parts.push(page(sequence++, group, packet.slice(pos, pos + n), i ? 1 : 0)); pos += n;
    }
    parts.push(page(sequence, [3], new Uint8Array([248, 255, 254]), 4)); return new Blob(parts);
}
export const comment = (data = payload(), lower = false) => join([encode((lower ? 'imuse_recording_metadata' : 'IMUSE_RECORDING_METADATA') + '='), data]);
