import { AUDIO_SOURCE_LIMITS as limits, parseAudioSourceManifest as parse, validateAudioSourceManifest as validate,
    serializeAudioSourceManifest as serialize, createAudioSourceManifest as create, resolveAudioSourceId as resolveSource,
    planRecordingIdentity as plan } from '../js/audioSourceIdentity.js';
import { readEmbeddedRecordingIdentity } from '../js/recordingIdentity.js';
import * as f from './recording-identity-fixtures.js';
const SOURCE = '15d91f9a-735e-4d73-a6b6-427140869795', SOURCE2 = '9599e552-b194-4511-8865-b37a07413a38';
const THIRD = '99999999-1234-1234-1234-123456789abc';
const FP = { algorithm: 'sha256', byteLength: 123, digest: 'a'.repeat(64) };
const CHANGED = { ...FP, digest: 'b'.repeat(64) };
const absent = () => ({ status: 'absent', recordingId: null, identityOrigins: [], evidence: [], issues: [], combinedProvenance: null });
const valid = (recordingId = f.ID, origin = 'imuse-embedded') => ({ ...absent(), status: 'valid', recordingId,
    identityOrigins: [origin], evidence: [{ recordingId, origin }] });
const unreadable = (status = 'invalid', code = 'invalid-uuid') => ({ ...absent(), status, issues: [{ status, code, scope: 'identity', message: 'Synthetic reader issue' }] });
const entry = (fields = {}) => ({ audioRelativePath: 'memo.wav', recordingId: f.ID, identityOrigin: 'memora-assigned', audioFingerprint: { ...FP }, ...fields });
const manifest = (entries = []) => ({ schemaVersion: 1, audioSourceId: SOURCE, recordings: entries });
const input = (fields = {}) => ({ manifest: manifest(), audioRelativePath: 'memo.wav', fingerprint: { ...FP }, embedded: absent(), ...fields });
const lines = [], failures = [];
const assert = (value, message) => { if (!value) throw Error(message); };
const equal = (a, b, message) => assert(JSON.stringify(a) === JSON.stringify(b), message);
async function test(name, work) {
    try { await work(); lines.push('PASS ' + name); }
    catch (error) { failures.push(name); lines.push(`FAIL ${name}: ${error.stack || error}`); }
    document.querySelector('#results').textContent = lines.join('\n');
}
function checked(result, status, code) {
    assert(result.status === status, `Expected ${status}: ${JSON.stringify(result)}`);
    if (code) assert(result.code === code || result.issues?.some(issue => issue.code === code), `Expected ${code}: ${JSON.stringify(result)}`);
    if (['decision-required', 'blocked', 'cancelled', 'skipped', 'assignment-required'].includes(status)) assert(result.candidate === null && result.recordingId === null, 'Unresolved state exposes a usable ID or candidate');
    if (status === 'ready') assert(validate(result.candidate).status === 'valid', 'Staged candidate is invalid');
    return result;
}
const recoveryEntry = (reason = 'invalid-embedded-metadata') => entry({ identityRecovery: { reason } });

await test('Core schema, empty source and every origin validate', () => {
    assert(create(SOURCE).status === 'valid', 'Cannot create in-memory source');
    for (const origin of ['apple-embedded', 'imuse-embedded', 'memora-assigned']) assert(parse(JSON.stringify(manifest([entry({ identityOrigin: origin })]))).status === 'valid', 'Valid origin rejected');
    assert(create('bad').status === 'invalid', 'Invalid source ID accepted');
});
await test('Malformed JSON, duplicate and escaped-alias fields are rejected', () => {
    for (const source of ['', '{', '[] trailing', '{"schemaVersion":1,}', '{"schemaVersion":1,"schemaVersion":2}',
        '{"schemaVersion":1,"schema\\u0056ersion":2}']) assert(parse(source).status === 'invalid', 'Malformed/ambiguous JSON accepted');
    const text = JSON.stringify(manifest([entry()])).replace('"algorithm":"sha256"', '"algorithm":"sha256","algorithm":"other"');
    checked(parse(text), 'invalid', 'duplicate-key');
});
await test('Missing and unsupported schemas are distinct and never partially accepted', () => {
    checked(parse('{}'), 'invalid', 'schema-version');
    checked(parse(JSON.stringify({ ...manifest(), schemaVersion: 2 })), 'unsupported', 'schema-version');
    for (const data of [null, [], {}, { ...manifest(), recordings: null }, { ...manifest(), audioSourceId: 'bad' },
        ...['1', null, -1, 1.5].map(schemaVersion => ({ ...manifest(), schemaVersion }))]) assert(validate(data).status === 'invalid', 'Invalid manifest accepted');
});
await test('Unknown fields round-trip at every level without prototype effects', () => {
    const value = manifest([recoveryEntry()]);
    value.future = { unicode: 'café 東京 😀', values: [true, null, 0] };
    value.recordings[0].custom = { keep: 'yes' };
    value.recordings[0].audioFingerprint.future = 'fingerprint-extension';
    value.recordings[0].identityRecovery.future = { keep: 'recovery-extension' };
    const text = JSON.stringify(value).replace('"schemaVersion":1', '"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"schemaVersion":1');
    const parsed = checked(parse(text), 'valid');
    const saved = serialize(parsed.manifest);
    assert(saved.status === 'valid' && saved.text.endsWith('\n'), 'Cannot serialize');
    equal(parse(saved.text).manifest, parsed.manifest, 'Unknown fields changed');
    assert(Object.hasOwn(parsed.manifest, '__proto__') && ({}).polluted === undefined, 'Prototype changed');
});
await test('Object input cannot execute getters, toJSON or custom prototypes', () => {
    let calls = 0;
    const getter = { ...manifest() }; Object.defineProperty(getter, 'extension', { enumerable: true, get() { calls++; return 1; } });
    for (const value of [getter, { ...manifest(), toJSON() { calls++; return manifest(); } }, Object.assign(Object.create({ inherited: true }), manifest())]) assert(validate(value).status === 'invalid', 'Unsafe object accepted');
    assert(calls === 0, 'Validator executed untrusted code');
});
await test('Non-JSON values, cycles, sparse arrays and hidden fields are rejected', () => {
    const cycle = manifest(); cycle.extra = cycle;
    const sparse = manifest(); sparse.extra = Array(2);
    const hidden = manifest(); Object.defineProperty(hidden, 'hidden', { value: true });
    for (const value of [cycle, sparse, hidden, { ...manifest(), extra: Infinity }, { ...manifest(), extra: undefined }, { ...manifest(), extra: new Date() }, { ...manifest(), extra: 1n }]) assert(validate(value).status === 'invalid', 'Non-JSON value accepted');
});
await test('Source and recording UUID values preserve original case and non-v4 syntax', () => {
    const value = manifest([entry({ recordingId: 'A9BB039E-11D1-1EEA-03DE-24F9C179C0CE' })]); value.audioSourceId = SOURCE.toUpperCase();
    const result = checked(parse(JSON.stringify(value)), 'valid'); equal(result.manifest, value, 'Original values changed');
    assert(validate(manifest([entry({ recordingId: 'not a uuid' })])).status === 'invalid', 'Invalid recording ID');
});
await test('Relative filenames/subfolders work; unsafe paths do not', () => {
    for (const path of ['memo.wav', 'nested/café 東京 😀.m4a']) assert(validate(manifest([entry({ audioRelativePath: path })])).status === 'valid', 'Safe path rejected');
    for (const path of ['', '/memo.wav', '../memo.wav', 'nested/../memo.wav', './memo.wav', 'C:/memo.wav', '\\server\\memo.wav', 'nested\\memo.wav', 'a//memo.wav', 'a/', 'a\u0000.wav', 'a\n.wav', 'a./memo.wav', 'a /memo.wav']) {
        checked(validate(manifest([entry({ audioRelativePath: path })])), 'invalid', 'audio-path');
    }
});
await test('Duplicate paths, case and Unicode normalization collisions are conflicts', () => {
    for (const paths of [['memo.wav', 'memo.wav'], ['Memo.wav', 'memo.wav'], ['café.wav', 'cafe\u0301.wav']]) {
        checked(validate(manifest([entry({ audioRelativePath: paths[0] }), entry({ audioRelativePath: paths[1], recordingId: f.OTHER })])), 'conflicting', 'duplicate-path');
    }
});
await test('Duplicate Recording IDs across paths require review, never deduplication', () => {
    const value = manifest([entry(), entry({ audioRelativePath: 'copy.wav', recordingId: f.ID.toUpperCase() })]);
    checked(validate(value), 'conflicting', 'duplicate-recording-id');
    assert(value.recordings.length === 2, 'Duplicate silently removed');
});
await test('All fingerprints and recovery combinations are validated', () => {
    for (const fingerprint of [null, {}, { ...FP, algorithm: 'md5' }, { ...FP, byteLength: -1 }, { ...FP, byteLength: 1.2 }, { ...FP, byteLength: Number.MAX_SAFE_INTEGER + 1 }, { ...FP, digest: 'no' }]) checked(validate(manifest([entry({ audioFingerprint: fingerprint })])), 'invalid', 'audio-fingerprint');
    for (const recovery of [null, {}, { reason: 'invented' }]) checked(validate(manifest([entry({ identityRecovery: recovery })])), 'invalid', 'identity-recovery');
    checked(validate(manifest([entry({ identityOrigin: 'apple-embedded', identityRecovery: { reason: 'invalid-embedded-metadata' } })])), 'invalid', 'identity-recovery');
    for (const reason of ['invalid-embedded-metadata', 'unsupported-embedded-metadata']) checked(validate(manifest([recoveryEntry(reason)])), 'valid');
});
await test('Input byte, string, path, depth and entry limits are enforced', () => {
    checked(parse(' '.repeat(limits.jsonBytes + 1)), 'invalid', 'json-size');
    checked(validate({ ...manifest(), extension: 'x'.repeat(limits.stringCharacters + 1) }), 'invalid', 'string-limit');
    checked(validate(manifest([entry({ audioRelativePath: 'x'.repeat(limits.pathCharacters + 1) })])), 'invalid', 'audio-path');
    let nested = true; for (let i = 0; i < limits.depth + 1; i++) nested = { nested };
    checked(validate({ ...manifest(), extension: nested }), 'invalid', 'structure-limit');
    checked(parse('['.repeat(limits.depth + 2) + '0' + ']'.repeat(limits.depth + 2)), 'invalid', 'structure-limit');
    assert(validate(manifest(Array(limits.recordings + 1).fill(null))).status === 'invalid', 'Count limit ignored');
});
await test('Source-ID reuse preserves case, requires explicit conflict resolution', () => {
    const original = SOURCE.toUpperCase();
    const reused = resolveSource({ audioSourceId: original, establishedAudioSourceIds: [SOURCE] });
    assert(reused.status === 'resolved' && reused.audioSourceId === original, 'Existing spelling changed');
    const pending = resolveSource({ audioSourceId: SOURCE, establishedAudioSourceIds: [SOURCE2] });
    assert(pending.status === 'decision-required' && pending.audioSourceId === null && pending.candidates.length === 2, 'Source conflict auto-resolved');
    const chosen = resolveSource({ audioSourceId: SOURCE, establishedAudioSourceIds: [SOURCE2], selectedAudioSourceId: SOURCE2 });
    assert(chosen.status === 'resolved' && chosen.audioSourceId === SOURCE2, 'Explicit source selection ignored');
    assert(resolveSource({ audioSourceId: SOURCE, selectedAudioSourceId: THIRD }).status === 'invalid', 'Unestablished source selected');
    assert(resolveSource().status === 'assignment-required', 'Missing source ID invented');
});
await test('Valid embedded UUID creates a staged entry, without changing inputs', () => {
    const request = input({ embedded: valid() }), snapshot = JSON.stringify(request);
    const result = checked(plan(request), 'ready', 'embedded-id');
    assert(result.recordingId === f.ID && result.requiresPersistence && result.candidate.recordings[0].identityOrigin === 'imuse-embedded', 'Embedded ID lost');
    assert(JSON.stringify(request) === snapshot, 'Request changed');
    assert(!Object.hasOwn(result.candidate, 'archiveUuid'), 'Archive identity conflated');
});
await test('Unchanged established ID is reused across repeated in-memory requests', () => {
    const value = manifest([entry()]); const request = input({ manifest: value });
    const first = checked(plan(request), 'ready', 'reused');
    assert(first.recordingId === f.ID && !first.requiresPersistence, 'Unchanged ID churn');
    equal(plan({ ...request, manifest: first.candidate }).candidate, value, 'Retry changed identity');
    first.candidate.recordings[0].audioFingerprint.digest = 'c'.repeat(64);
    assert(value.recordings[0].audioFingerprint.digest === FP.digest, 'Returned candidate aliases original');
});
await test('New fallback ID is requested, not generated; reserved UUID is staged', () => {
    checked(plan(input()), 'assignment-required', 'new-assignment');
    const request = input({ assignedRecordingId: f.OTHER });
    const result = checked(plan(request), 'ready', 'assigned');
    assert(result.recordingId === f.OTHER && result.candidate.recordings[0].identityOrigin === 'memora-assigned', 'Fallback mislabeled');
    equal(plan(request), result, 'Reserved UUID changed on retry');
    checked(plan(input({ assignedRecordingId: 'bad' })), 'blocked', 'assigned-id');
});
await test('Embedded/source mismatch requires confirmation and embedded ID wins', () => {
    const request = input({ manifest: manifest([entry()]), embedded: valid(f.OTHER) });
    equal(checked(plan(request), 'decision-required', 'embedded-id-mismatch').choices, ['use-embedded', 'cancel'], 'Wrong choices');
    const result = checked(plan({ ...request, choice: 'use-embedded' }), 'ready', 'embedded-id-confirmed');
    assert(result.recordingId === f.OTHER && request.manifest.recordings[0].recordingId === f.ID, 'Priority or non-mutation failure');
    checked(plan({ ...request, choice: 'assign-new', assignedRecordingId: THIRD }), 'blocked', 'choice');
});
await test('Embedded case, byte changes and dual origins preserve identity semantics', () => {
    const request = input({ manifest: manifest([entry({ identityOrigin: 'apple-embedded' })]), embedded: valid(f.ID.toUpperCase(), 'apple-embedded'), fingerprint: CHANGED });
    const result = checked(plan(request), 'ready', 'embedded-id');
    assert(result.recordingId === f.ID.toUpperCase() && result.candidate.recordings[0].audioFingerprint.digest === CHANGED.digest, 'Embedded value not authoritative');
    const both = valid(); both.identityOrigins = ['apple-embedded', 'imuse-embedded']; both.evidence.push({ recordingId: f.ID, origin: 'apple-embedded' });
    assert(plan(input({ embedded: both })).candidate.recordings[0].identityOrigin === 'imuse-embedded', 'Dual origin nondeterministic');
    assert(plan(input({ manifest: request.manifest, embedded: both })).candidate.recordings[0].identityOrigin === 'apple-embedded', 'Existing agreeing origin lost');
});
await test('No-ID changed size or same-size changed digest requires a decision', () => {
    for (const fingerprint of [CHANGED, { ...FP, byteLength: 124 }]) {
        const request = input({ manifest: manifest([entry()]), fingerprint });
        equal(checked(plan(request), 'decision-required', 'audio-changed').choices, ['keep-existing', 'assign-new', 'cancel'], 'Wrong changed-file choices');
        const kept = checked(plan({ ...request, choice: 'keep-existing' }), 'ready', 'changed-id-kept');
        assert(kept.recordingId === f.ID, 'Keep changed identity'); equal(kept.candidate.recordings[0].audioFingerprint, fingerprint, 'Fingerprint not refreshed');
        checked(plan({ ...request, choice: 'assign-new' }), 'assignment-required');
        assert(checked(plan({ ...request, choice: 'assign-new', assignedRecordingId: f.OTHER }), 'ready').recordingId === f.OTHER, 'New choice ignored');
    }
});
await test('Invalid and unsupported metadata recover only after explicit assignment', () => {
    for (const [status, code, reason] of [['invalid', 'invalid-uuid', 'invalid-embedded-metadata'], ['unsupported', 'identity-version', 'unsupported-embedded-metadata']]) {
        const request = input({ embedded: unreadable(status, code), assignedRecordingId: f.OTHER });
        checked(plan(request), 'decision-required', 'unreadable-embedded-id');
        checked(plan({ ...request, choice: 'assign-new', assignedRecordingId: null }), 'assignment-required', 'recovery-assignment');
        const result = checked(plan({ ...request, choice: 'assign-new' }), 'ready', 'recovery-assigned');
        assert(result.candidate.recordings[0].identityRecovery.reason === reason, 'Recovery reason not stored');
    }
});
await test('Saved unchanged recovery avoids warnings but changed bytes require consent again', () => {
    const request = input({ manifest: manifest([recoveryEntry()]), embedded: unreadable() });
    checked(plan(request), 'ready', 'reused');
    checked(plan({ ...request, fingerprint: CHANGED }), 'decision-required', 'unreadable-embedded-id');
    checked(plan({ ...request, embedded: unreadable('unsupported', 'identity-version') }), 'ready', 'reused');
});
await test('Later readable embedded identity reconciles recovery and preserves unknown fields', () => {
    const existing = recoveryEntry(); existing.extra = { preserve: true };
    existing.audioFingerprint.future = 'keep-fingerprint'; existing.identityRecovery.future = { preserve: 'history extension' };
    const request = input({ manifest: manifest([existing]), embedded: valid(f.OTHER) });
    checked(plan(request), 'decision-required', 'embedded-id-mismatch');
    const result = checked(plan({ ...request, choice: 'use-embedded' }), 'ready');
    const staged = result.candidate.recordings[0];
    assert(staged.identityOrigin === 'imuse-embedded' && !Object.hasOwn(staged.identityRecovery, 'reason'), 'Active recovery not cleared');
    equal(staged.identityRecovery.future, existing.identityRecovery.future, 'Recovery extension lost');
    equal(staged.extra, existing.extra, 'Entry extension lost'); assert(staged.audioFingerprint.future === 'keep-fingerprint', 'Fingerprint extension lost');
    const same = checked(plan({ ...request, embedded: valid(f.ID) }), 'ready'); assert(same.recordingId === f.ID, 'Same-ID promotion churn');
});
await test('No active recovery field remains when no extension data needs preserving', () => {
    const result = checked(plan(input({ manifest: manifest([recoveryEntry()]), embedded: valid(f.ID) })), 'ready');
    assert(!Object.hasOwn(result.candidate.recordings[0], 'identityRecovery'), 'Empty recovery persisted');
});
await test('Cancel and skip are non-mutating and expose no candidate or ID', () => {
    const request = input({ manifest: manifest([entry()]), fingerprint: CHANGED }), snapshot = JSON.stringify(request);
    checked(plan({ ...request, choice: 'cancel' }), 'cancelled'); checked(plan({ ...request, choice: 'skip' }), 'skipped');
    assert(JSON.stringify(request) === snapshot, 'Cancellation changed input');
});
await test('Conflicts, read errors, unchecked containers and provenance cannot be bypassed', () => {
    for (const embedded of [unreadable('conflicting', 'duplicate-imuse'), unreadable('invalid', 'read-failed'), unreadable('unsupported', 'container'), unreadable('invalid', 'provenance-disagreement'), unreadable('unsupported', 'provenance-version')]) {
        checked(plan(input({ embedded, choice: 'assign-new', assignedRecordingId: f.OTHER })), 'blocked');
    }
    const partial = unreadable(); partial.evidence = [{ recordingId: f.ID, origin: 'apple-embedded' }];
    checked(plan(input({ embedded: partial, choice: 'assign-new', assignedRecordingId: f.OTHER })), 'blocked', 'unresolved-reader-issues');
    const unscoped = unreadable(); delete unscoped.issues[0].scope;
    checked(plan(input({ embedded: unscoped, choice: 'assign-new', assignedRecordingId: f.OTHER })), 'blocked', 'unresolved-reader-issues');
});
await test('Stale/inconsistent decisions cannot silently rotate or invent identity', () => {
    checked(plan(input({ choice: 'keep-existing', assignedRecordingId: f.OTHER })), 'blocked', 'choice');
    checked(plan(input({ choice: 'use-embedded', assignedRecordingId: f.OTHER })), 'blocked', 'choice');
    checked(plan(input({ manifest: manifest([entry()]), choice: 'assign-new', assignedRecordingId: f.OTHER })), 'blocked', 'choice');
    const inconsistent = valid(); inconsistent.evidence[0].recordingId = f.OTHER;
    checked(plan(input({ embedded: inconsistent })), 'blocked', 'embedded-result');
});
await test('New candidate cannot reuse another path ID or guess a case-only association', () => {
    const existing = manifest([entry({ audioRelativePath: 'other.wav' })]);
    checked(plan(input({ manifest: existing, embedded: valid(f.ID) })), 'blocked', 'duplicate-recording-id');
    checked(plan(input({ manifest: manifest([entry({ audioRelativePath: 'Memo.wav' })]) })), 'blocked', 'path-spelling');
});
await test('Source-ID conflict blocks recording changes until a known association is chosen', () => {
    const request = input({ embedded: valid(), establishedAudioSourceIds: [SOURCE2] });
    checked(plan(request), 'decision-required', 'source-id-conflict');
    const result = checked(plan({ ...request, selectedAudioSourceId: SOURCE2 }), 'ready');
    assert(result.candidate.audioSourceId === SOURCE2 && request.manifest.audioSourceId === SOURCE, 'Wrong source mutation');
});
await test('Deep-frozen accepted inputs and untouched entries are preserved', () => {
    function freeze(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
    const value = manifest([entry({ audioRelativePath: 'other.wav', recordingId: f.OTHER, future: { untouched: true } })]); value.future = ['preserve'];
    const request = freeze(input({ manifest: value, embedded: valid() })), snapshot = JSON.stringify(request);
    const result = checked(plan(request), 'ready');
    equal(result.candidate.recordings[0], value.recordings[0], 'Unrelated entry changed');
    equal(result.candidate.future, value.future, 'Root extension lost'); assert(JSON.stringify(request) === snapshot, 'Frozen request modified');
});
await test('Actual checkpoint-1 reader feeds the planner for embedded, absent and recovery cases', async () => {
    const fixtures = await (await fetch('./fixtures/imuse-recording-identity.json')).json();
    for (const fixture of fixtures.files) {
        const blob = new Blob([Uint8Array.from(atob(fixture.base64), c => c.charCodeAt(0))]);
        const embedded = await readEmbeddedRecordingIdentity(blob);
        const result = checked(plan(input({ embedded, fingerprint: { ...FP, byteLength: blob.size } })), 'ready');
        assert(result.recordingId === fixtures.recordingId, fixture.name + ': ID lost');
    }
    const noMetadata = await readEmbeddedRecordingIdentity(f.wav());
    checked(plan(input({ embedded: noMetadata })), 'assignment-required');
    const unsupported = await readEmbeddedRecordingIdentity(f.mp4([f.imuseBox(f.payload(f.ID, 2))]));
    checked(plan(input({ embedded: unsupported })), 'decision-required', 'unreadable-embedded-id');
});
await test('Actual malformed provenance cannot masquerade as recoverable identity JSON', async () => {
    const malformed = f.box('uuid', f.join([f.hex('694d757365436f6d62696e6500000001'), f.encode('{')]));
    const observation = await readEmbeddedRecordingIdentity(f.mp4([malformed]));
    assert(observation.issues.some(issue => issue.scope === 'provenance' && issue.code === 'invalid-json'), 'Reader lost provenance issue context');
    checked(plan(input({ embedded: observation, choice: 'assign-new', assignedRecordingId: f.OTHER })), 'blocked', 'unresolved-reader-issues');
    const damagedIdentity = await readEmbeddedRecordingIdentity(f.mp4([f.imuseBox(f.encode('{'))]));
    const recovered = checked(plan(input({ embedded: damagedIdentity, choice: 'assign-new', assignedRecordingId: f.OTHER })), 'ready');
    assert(recovered.candidate.recordings[0].identityRecovery.reason === 'invalid-embedded-metadata', 'Identity JSON recovery blocked');
});

document.body.dataset.testStatus = failures.length ? 'failed' : 'passed';
document.querySelector('#results').textContent = lines.join('\n') + `\n${lines.length - failures.length}/${lines.length} groups passed`;
globalThis.recordingIdentityTestResult = { passed: lines.length - failures.length, failed: failures };
if (globalThis.location?.search.includes('report=1')) await fetch('/_identity-test-result', {
    method: 'POST', body: JSON.stringify({ ...globalThis.recordingIdentityTestResult, output: document.querySelector('#results').textContent })
});
