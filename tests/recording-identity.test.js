import { readEmbeddedRecordingIdentity as read } from '../js/recordingIdentity.js';
import * as f from './recording-identity-fixtures.js';
const lines = [], failures = [];
const assert = (value, message) => { if (!value) throw Error(message); };
async function test(label, work) {
    try { await work(); lines.push(`PASS ${label}`); }
    catch (error) { lines.push(`FAIL ${label}: ${error.stack || error}`); failures.push(label); }
    document.querySelector('#results').textContent = lines.join('\n');
}
async function expect(blob, status, code = null) {
    const result = await read(blob);
    assert(result.status === status, `Expected ${status}, got ${JSON.stringify(result)}`);
    if (status !== 'valid') assert(result.recordingId === null, 'Error/missing states must not resolve identity');
    if (code) assert(result.issues.some(issue => issue.code === code), `Missing issue ${code}: ${JSON.stringify(result)}`);
    return result;
}
await test('All four container conventions and both Ogg codecs', async () => {
    for (const blob of [f.mp4([f.imuseBox()]), f.webm([f.simpleTag()]), f.wav([f.wavChunk('imID', f.payload())]), f.ogg([f.comment()]), f.ogg([f.comment()], { vorbis: true })]) {
        const result = await expect(blob, 'valid');
        assert(result.recordingId === f.ID && result.identityOrigins.join() === 'imuse-embedded', 'UUID/origin changed');
    }
});
await test('Signatures override filenames and MIME types', async () => {
    const blob = new File([f.mp4([f.imuseBox()])], 'misleading.wav', { type: 'audio/ogg' });
    const result = await expect(blob, 'valid'); assert(result.container === 'mp4', 'Extension selected container');
});
await test('Complete containers without metadata are absent, other formats unsupported', async () => {
    for (const blob of [f.mp4(), f.webm(), f.wav(), f.ogg(), f.ogg([], { vorbis: true })]) await expect(blob, 'absent');
    for (const blob of [new Blob(), new Blob(['ID3 metadata']), new Blob(['random uuid ' + f.ID])]) await expect(blob, 'unsupported', 'container');
});
await test('Apple freeform structure preserves uppercase IDs', async () => {
    const id = f.ID.toUpperCase(); const result = await expect(f.mp4([f.appleMoov([f.appleItem(id)])]), 'valid');
    assert(result.recordingId === id && result.identityOrigins.join() === 'apple-embedded', 'Apple value lost');
});
await test('Unrelated UUIDs and markers in audio bytes are not Apple metadata', async () => {
    await expect(f.mp4([f.box('mdat', f.encode('voice-memo-uuid ' + f.ID))]), 'absent');
    await expect(f.mp4([f.box('free', f.encode('voice-memo-uuid ' + f.ID))]), 'absent');
});
await test('Agreeing dual conventions retain both origins, disagreeing ones conflict', async () => {
    const result = await expect(f.mp4([f.appleMoov([f.appleItem(f.ID.toUpperCase())]), f.imuseBox()]), 'valid');
    assert(result.identityOrigins.length === 2 && result.evidence.length === 2, 'Origins discarded');
    await expect(f.mp4([f.appleMoov(), f.imuseBox(f.payload(f.OTHER))]), 'conflicting', 'embedded-disagreement');
});
await test('Duplicate identity entries, including identical UUIDs, never resolve', async () => {
    for (const blob of [f.mp4([f.imuseBox(), f.imuseBox()]), f.wav([f.wavChunk('imID', f.payload()), f.wavChunk('imID', f.payload())]),
        f.webm([f.simpleTag(), f.simpleTag()]), f.ogg([f.comment(), f.comment()]), f.mp4([f.appleMoov([f.appleItem(), f.appleItem()])])]) await expect(blob, 'conflicting');
});
await test('Invalid UTF-8, JSON, UUID and unsupported format/version are distinct', async () => {
    for (const data of [new Uint8Array([255]), f.encode('{'), f.payload('not-a-uuid'), f.payload(null)]) await expect(f.mp4([f.imuseBox(data)]), 'invalid');
    for (const data of [f.payload(f.ID, 2), f.payload(f.ID, '1'), f.encode(JSON.stringify({ format: 'other', version: 1, recordingId: f.ID }))]) await expect(f.mp4([f.imuseBox(data)]), 'unsupported', 'identity-version');
});
await test('Zero, exactly 4 KiB and oversized identity payloads', async () => {
    await expect(f.mp4([f.imuseBox(new Uint8Array())]), 'invalid', 'metadata-size');
    const data = f.encode(new TextDecoder().decode(f.payload()).padEnd(4096, ' '));
    await expect(f.mp4([f.imuseBox(data)]), 'valid');
    await expect(f.mp4([f.imuseBox(f.join([data, f.encode(' ')]))]), 'invalid', 'metadata-size');
});
await test('Malformed identity cannot be hidden by a later valid one', async () => {
    const result = await expect(f.mp4([f.imuseBox(f.payload(f.ID, 2)), f.imuseBox()]), 'conflicting', 'duplicate-imuse');
    assert(result.issues.some(issue => issue.status === 'unsupported'), 'Original issue lost');
});
await test('Apple malformed/duplicate data fields are rejected', async () => {
    await expect(f.mp4([f.appleMoov([f.appleItem('invalid')])]), 'invalid', 'invalid-apple-uuid');
    await expect(f.mp4([f.appleMoov([f.appleItem(f.ID, [f.box('data', f.join([f.number(1), f.number(0), f.encode(f.OTHER)]))])])]), 'invalid', 'apple-fields');
});
await test('MP4 extended/open-ended boxes and truncation', async () => {
    const extended = f.join([f.number(1), f.encode('uuid'), f.number(0), f.number(32 + f.payload().length), f.hex('91c3892e57a44f78a9833a19947c9c01'), f.payload()]);
    await expect(f.mp4([extended]), 'valid');
    await expect(new Blob([f.box('ftyp', f.encode('M4A ')), f.number(0), f.encode('mdat'), f.encode('voice-memo-uuid ' + f.ID)]), 'absent');
    await expect(new Blob([f.box('ftyp', f.encode('M4A ')), f.number(3000), f.encode('uuid')]), 'invalid', 'mp4-length');
    await expect(new Blob([f.mp4([f.imuseBox()]), new Uint8Array([1])]), 'invalid', 'mp4-header');
});
await test('Combined provenance retained independently; no identity invention', async () => {
    const provenance = { format: 'imuse-combined-recording', version: 1, id: f.ID, sources: [{ id: f.OTHER }], segments: [], extension: 'preserve' };
    const result = await expect(f.mp4([f.combinedBox(provenance), f.imuseBox()]), 'valid');
    assert(JSON.stringify(result.combinedProvenance) === JSON.stringify(provenance), 'Provenance changed');
    await expect(f.mp4([f.combinedBox(provenance)]), 'absent');
    await expect(f.mp4([f.combinedBox({ ...provenance, id: f.OTHER }), f.imuseBox()]), 'conflicting', 'provenance-disagreement');
    await expect(f.mp4([f.combinedBox({ ...provenance, version: 2 }), f.imuseBox()]), 'unsupported', 'provenance-version');
    await expect(f.mp4([f.combinedBox(provenance), f.combinedBox(provenance)]), 'conflicting', 'duplicate-provenance');
});
await test('WebM known/unknown segment and cluster sizes', async () => {
    for (const unknown of [true, false]) for (const unknownCluster of [true, false]) await expect(f.webm([f.simpleTag()], { unknown, unknownCluster }), 'valid');
    await expect(f.webm([f.simpleTag(f.payload(), [f.element('4487', f.payload())])]), 'invalid', 'webm-tag-fields');
    await expect(new Blob([f.element('1a45dfa3', f.element('4282', f.encode('matroska'))), f.hex('18538067'), new Uint8Array([255])]), 'unsupported', 'ebml-doctype');
});
await test('WAV chunk padding and RIFF truncation', async () => {
    await expect(f.wav([f.wavChunk('JUNK', new Uint8Array([1])), f.wavChunk('imID', f.payload())]), 'valid');
    const original = f.wav([f.wavChunk('imID', f.payload())]);
    await expect(original.slice(0, original.size - 1), 'invalid', 'riff-size');
});
await test('Ogg multi-page comments, lower-case comment keys and unrelated bytes', async () => {
    for (const vorbis of [true, false]) await expect(f.ogg([f.comment(f.payload(), true)], { vorbis, large: true }), 'valid');
    await expect(f.ogg([new Uint8Array([255, 254, 253])]), 'absent');
});
await test('Ogg checksum and incomplete final page are rejected after metadata', async () => {
    const original = f.ogg([f.comment()]), corrupt = new Uint8Array(await original.arrayBuffer()); corrupt[corrupt.length - 1] ^= 1;
    await expect(new Blob([corrupt]), 'invalid', 'ogg-checksum');
    await expect(original.slice(0, original.size - 1), 'invalid');
    const noEnd = new Uint8Array(await original.arrayBuffer());
    // Rebuild final audio page without EOS so its checksum remains correct.
    const tail = f.page(2, [3], new Uint8Array([248, 255, 254]));
    await expect(new Blob([noEnd.slice(0, noEnd.length - tail.length), tail]), 'invalid', 'ogg-incomplete');
});
await test('Reading is deterministic and never mutates audio or invents IDs', async () => {
    const blob = f.mp4([f.imuseBox()]), before = Array.from(new Uint8Array(await blob.arrayBuffer())).join();
    const first = await read(blob), second = await read(blob);
    assert(JSON.stringify(first) === JSON.stringify(second), 'Read result changed');
    assert(Array.from(new Uint8Array(await blob.arrayBuffer())).join() === before, 'Audio changed');
    const broken = { size: 20, slice() { throw Error('read denied'); } };
    await expect(broken, 'invalid', 'read-failed');
    await expect({ size: 20, slice() { throw null; } }, 'invalid', 'read-failed');
    await expect({ size: -1, slice() { throw Error('must not read'); } }, 'invalid', 'invalid-file');
});
await test('Bounded reads, malformed WebM and chained Ogg are conservative', async () => {
    const blob = f.mp4([f.imuseBox()]);
    const guarded = { size: blob.size, slice(start, end) {
        assert(end - start <= 1024 * 1024, 'Unbounded metadata read'); return blob.slice(start, end);
    } };
    await expect(guarded, 'valid');
    const webm = f.webm([f.simpleTag()]);
    await expect(webm.slice(0, webm.size - 1), 'invalid');
    await expect(new Blob([f.ogg([f.comment()]), f.ogg([f.comment()])]), 'invalid', 'ogg-sequence');
});

// Reference-exported byte fixtures are committed, so normal tests never need
// a sibling checkout or a test-only exporter in production.
await test('Committed fixtures generated by actual iMuse exporter', async () => {
    const fixtures = await (await fetch('./fixtures/imuse-recording-identity.json')).json();
    for (const fixture of fixtures.files) {
        const blob = new Blob([Uint8Array.from(atob(fixture.base64), c => c.charCodeAt(0))]);
        const result = await expect(blob, 'valid');
        assert(result.recordingId === fixtures.recordingId, fixture.name + ': wrong UUID');
        if (fixture.name === 'm4a-with-provenance') assert(result.combinedProvenance?.id === fixtures.recordingId, 'Actual combined provenance was not found');
    }
    assert(fixtures.files.length === 6, 'Missing exported container fixtures');
});
await test('Bundled real Apple Voice Memo stays compatible', async () => {
    const blob = await (await fetch('../data/whisper-test/test-audio.m4a')).blob();
    const result = await expect(blob, 'valid');
    assert(result.recordingId === 'D1B8E35B-1AB6-46CE-A3AF-DC4FECC4872C', 'Bundled Apple ID changed');
});
document.body.dataset.testStatus = failures.length ? 'failed' : 'passed';
document.querySelector('#results').textContent = lines.join('\n') + `\n${lines.length - failures.length}/${lines.length} groups passed`;
globalThis.recordingIdentityTestResult = { passed: lines.length - failures.length, failed: failures };
if (globalThis.location?.search.includes('report=1')) {
    await fetch('/_identity-test-result', { method: 'POST', body: JSON.stringify({ ...globalThis.recordingIdentityTestResult, output: document.querySelector('#results').textContent }) });
}
