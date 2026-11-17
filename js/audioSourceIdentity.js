// Checkpoint 2A: pure source-list validation and identity decisions.
// No files, crypto calls, hashing, storage, prompts or production imports.
export const AUDIO_SOURCE_LIMITS = Object.freeze({
    jsonBytes: 8 * 1024 * 1024, recordings: 10000, pathCharacters: 4096,
    stringCharacters: 65536, depth: 16, nodes: 200000
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGEST = /^[0-9a-f]{64}$/i;
const ORIGINS = ['apple-embedded', 'imuse-embedded', 'memora-assigned'];
const RECOVERY = ['invalid-embedded-metadata', 'unsupported-embedded-metadata'];
const has = (value, key) => Object.hasOwn(value, key);
const sameId = (a, b) => a.toLowerCase() === b.toLowerCase();
const uuid = value => typeof value === 'string' && UUID.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
class SourceError extends Error {
    constructor(code, message, status = 'invalid') { super(message); this.code = code; this.status = status; }
}
function requireValue(value, code, message, status) {
    if (!value) throw new SourceError(code, message, status);
}
function errorResult(error) {
    return { status: error instanceof SourceError ? error.status : 'invalid', manifest: null,
        issues: [{ code: error instanceof SourceError ? error.code : 'invalid-data', message: error instanceof SourceError ? error.message : 'The recording list is not valid plain JSON data.' }] };
}
// Descriptor-based copying rejects getters, custom prototypes and non-JSON
// values without executing them. Define own keys, including inert __proto__.
function copyJson(value) {
    let nodes = 0;
    const ancestors = new Set();
    function copy(input, depth) {
        requireValue(++nodes <= AUDIO_SOURCE_LIMITS.nodes && depth <= AUDIO_SOURCE_LIMITS.depth, 'structure-limit', 'The recording list is too large or deeply nested.');
        if (input === null || typeof input === 'boolean') return input;
        if (typeof input === 'number') { requireValue(Number.isFinite(input), 'json-number', 'JSON numbers must be finite.'); return input; }
        if (typeof input === 'string') { requireValue(input.length <= AUDIO_SOURCE_LIMITS.stringCharacters, 'string-limit', 'A recording-list field is too long.'); return input; }
        requireValue(object(input) || Array.isArray(input), 'json-value', 'The recording list must contain plain JSON values.');
        const proto = Object.getPrototypeOf(input);
        requireValue(Array.isArray(input) ? proto === Array.prototype : proto === Object.prototype || proto === null, 'json-object', 'The recording list must contain plain JSON objects.');
        requireValue(!ancestors.has(input), 'json-cycle', 'The recording list contains a cycle.');
        ancestors.add(input);
        const result = Array.isArray(input) ? [] : {};
        for (const key of Reflect.ownKeys(input)) {
            if (Array.isArray(input) && key === 'length') continue;
            requireValue(typeof key === 'string' && key.length <= AUDIO_SOURCE_LIMITS.stringCharacters, 'json-key', 'The recording list has an invalid property name.');
            if (Array.isArray(input)) requireValue(/^(0|[1-9][0-9]*)$/.test(key) && Number(key) < input.length, 'json-array', 'JSON arrays cannot contain named properties.');
            const property = Object.getOwnPropertyDescriptor(input, key);
            requireValue(property.enumerable && has(property, 'value'), 'json-property', 'The recording list cannot contain getters or hidden properties.');
            Object.defineProperty(result, key, { value: copy(property.value, depth + 1), enumerable: true, writable: true, configurable: true });
        }
        if (Array.isArray(input)) requireValue(result.length === input.length && Object.keys(result).length === input.length, 'json-array', 'JSON arrays cannot contain gaps.');
        ancestors.delete(input); return result;
    }
    return copy(value, 0);
}
function checkSize(text) {
    requireValue(typeof text === 'string', 'json-input', 'The recording list must be JSON text.');
    requireValue(text.length <= AUDIO_SOURCE_LIMITS.jsonBytes && new TextEncoder().encode(text).length <= AUDIO_SOURCE_LIMITS.jsonBytes,
        'json-size', 'The recording list exceeds the supported JSON size.');
}
// JSON.parse alone silently accepts duplicate names, including escaped aliases.
// This scanner checks nesting and duplicate object keys before the normal parse.
function checkJsonKeys(source) {
    let at = 0, nodes = 0;
    const space = () => { while (/[\x20\t\r\n]/.test(source[at] || '\0')) at++; };
    function string() {
        const start = at++;
        while (at < source.length) {
            const char = source[at++];
            if (char === '\\') { at++; continue; }
            if (char === '"') return JSON.parse(source.slice(start, at));
        }
        throw new SourceError('json-syntax', 'The recording list is not valid JSON.');
    }
    function value(depth) {
        requireValue(++nodes <= AUDIO_SOURCE_LIMITS.nodes && depth <= AUDIO_SOURCE_LIMITS.depth, 'structure-limit', 'The recording list is too large or deeply nested.');
        space(); const char = source[at];
        if (char === '"') { string(); return; }
        if (char === '{' || char === '[') {
            const end = char === '{' ? '}' : ']', keys = new Set(); at++; space();
            if (source[at] === end) { at++; return; }
            while (at < source.length) {
                if (char === '{') {
                    requireValue(source[at] === '"', 'json-syntax', 'The recording list is not valid JSON.');
                    const key = string();
                    requireValue(!keys.has(key), 'duplicate-key', 'The recording list contains a duplicate JSON field.'); keys.add(key);
                    space(); requireValue(source[at++] === ':', 'json-syntax', 'The recording list is not valid JSON.');
                }
                value(depth + 1); space();
                if (source[at] === end) { at++; return; }
                requireValue(source[at++] === ',', 'json-syntax', 'The recording list is not valid JSON.'); space();
            }
            throw new SourceError('json-syntax', 'The recording list is incomplete.');
        }
        const start = at;
        while (at < source.length && !/[\x20\t\r\n,}\]]/.test(source[at])) at++;
        requireValue(at > start, 'json-syntax', 'The recording list is not valid JSON.');
        JSON.parse(source.slice(start, at));
    }
    value(0); space(); requireValue(at === source.length, 'json-syntax', 'The recording list has trailing data.');
}
function pathKey(path) {
    requireValue(typeof path === 'string' && path.length > 0 && path.length <= AUDIO_SOURCE_LIMITS.pathCharacters,
        'audio-path', 'An audio-relative path is missing or too long.');
    requireValue(!/[\\:\x00-\x1f\x7f]/.test(path) && !path.startsWith('/'), 'audio-path', 'An audio path must remain relative to the source folder.');
    requireValue(path.split('/').every(part => part && part !== '.' && part !== '..' && !/[. ]$/.test(part)),
        'audio-path', 'An audio path contains an empty, unsafe or ambiguous segment.');
    // Conservative portable collision detection; preserve original spelling.
    return path.normalize('NFC').toLowerCase();
}
function checkFingerprint(value) {
    requireValue(object(value) && value.algorithm === 'sha256' && Number.isSafeInteger(value.byteLength) && value.byteLength >= 0 &&
        typeof value.digest === 'string' && DIGEST.test(value.digest), 'audio-fingerprint', 'An audio fingerprint is missing or invalid.');
}
function checkManifest(value) {
    requireValue(object(value), 'manifest-object', 'The recording list must be a JSON object.');
    requireValue(has(value, 'schemaVersion'), 'schema-version', 'The recording list has no schema version.');
    requireValue(Number.isSafeInteger(value.schemaVersion) && value.schemaVersion > 0, 'schema-version', 'The recording-list schema version must be a positive integer.');
    requireValue(value.schemaVersion === 1, 'schema-version', 'This recording-list version is unsupported.', 'unsupported');
    requireValue(uuid(value.audioSourceId), 'source-id', 'The Audio Source ID must be a UUID.');
    requireValue(Array.isArray(value.recordings) && value.recordings.length <= AUDIO_SOURCE_LIMITS.recordings,
        'recording-count', 'The recording list has no recordings array or exceeds the supported entry count.');
    const paths = new Set(), ids = new Set();
    for (const entry of value.recordings) {
        requireValue(object(entry), 'recording-entry', 'A recording entry must be an object.');
        const key = pathKey(entry.audioRelativePath);
        requireValue(!paths.has(key), 'duplicate-path', 'Multiple recording entries refer to the same or an ambiguous audio path.', 'conflicting'); paths.add(key);
        requireValue(uuid(entry.recordingId), 'recording-id', 'A Recording ID must be a UUID.');
        const id = entry.recordingId.toLowerCase();
        requireValue(!ids.has(id), 'duplicate-recording-id', 'Multiple audio paths have the same Recording ID; explicit review is required.', 'conflicting'); ids.add(id);
        requireValue(ORIGINS.includes(entry.identityOrigin), 'identity-origin', 'A recording entry has an unknown identity origin.');
        checkFingerprint(entry.audioFingerprint);
        if (has(entry, 'identityRecovery')) {
            requireValue(object(entry.identityRecovery), 'identity-recovery', 'Identity recovery must be an object.');
            // Extension-only objects can remain after clearing an active reason;
            // accepted unknown information is never discarded during promotion.
            if (has(entry.identityRecovery, 'reason')) requireValue(entry.identityOrigin === 'memora-assigned' && RECOVERY.includes(entry.identityRecovery.reason),
                'identity-recovery', 'An active recovery reason requires a Memora-assigned identity and a supported reason.');
            else requireValue(Object.keys(entry.identityRecovery).length > 0, 'identity-recovery', 'An empty identity-recovery object has no recovery reason or extension data.');
        }
    }
    return value;
}
export function parseAudioSourceManifest(text) {
    try {
        checkSize(text); checkJsonKeys(text);
        return { status: 'valid', manifest: checkManifest(copyJson(JSON.parse(text))), issues: [] };
    } catch (error) { return errorResult(error); }
}
export function validateAudioSourceManifest(value) {
    try {
        const manifest = checkManifest(copyJson(value)); checkSize(JSON.stringify(manifest));
        return { status: 'valid', manifest, issues: [] };
    } catch (error) { return errorResult(error); }
}
export function serializeAudioSourceManifest(value) {
    const checked = validateAudioSourceManifest(value);
    if (checked.status !== 'valid') return { ...checked, text: null };
    const text = JSON.stringify(checked.manifest, null, 2) + '\n';
    try { checkSize(text); return { ...checked, text }; }
    catch (error) { return { ...errorResult(error), text: null }; }
}
// UUIDs are supplied by the eventual caller; this module never generates them.
export function createAudioSourceManifest(audioSourceId) {
    return validateAudioSourceManifest({ schemaVersion: 1, audioSourceId, recordings: [] });
}
export function resolveAudioSourceId({ audioSourceId = null, establishedAudioSourceIds = [], selectedAudioSourceId = null } = {}) {
    try {
        requireValue(audioSourceId === null || uuid(audioSourceId), 'source-id', 'The Audio Source ID must be a UUID.');
        requireValue(Array.isArray(establishedAudioSourceIds) && establishedAudioSourceIds.length <= AUDIO_SOURCE_LIMITS.recordings && establishedAudioSourceIds.every(uuid),
            'source-evidence', 'Established source associations must contain UUIDs.');
        const ids = new Map();
        for (const id of [audioSourceId, ...establishedAudioSourceIds].filter(Boolean)) if (!ids.has(id.toLowerCase())) ids.set(id.toLowerCase(), id);
        const candidates = [...ids.values()];
        if (selectedAudioSourceId !== null) {
            requireValue(uuid(selectedAudioSourceId) && candidates.some(id => sameId(id, selectedAudioSourceId)), 'source-choice', 'The selected Audio Source ID is not one of the established associations.');
            return { status: 'resolved', audioSourceId: candidates.find(id => sameId(id, selectedAudioSourceId)), candidates };
        }
        return { status: candidates.length > 1 ? 'decision-required' : candidates.length ? 'resolved' : 'assignment-required',
            audioSourceId: candidates.length === 1 ? candidates[0] : null, candidates };
    } catch (error) { return { ...errorResult(error), audioSourceId: null, candidates: [] }; }
}
const matchingFingerprint = (a, b) => a.byteLength === b.byteLength && a.digest.toLowerCase() === b.digest.toLowerCase();
const outcome = (status, code, extra = {}) => ({ status, code, recordingId: null, candidate: null, requiresPersistence: false, choices: [], ...extra });
const IDENTITY_ISSUES = new Set(['invalid-utf8', 'invalid-json', 'invalid-uuid', 'identity-version', 'metadata-size',
    'invalid-apple-uuid', 'apple-header', 'apple-type', 'apple-fields', 'webm-tag-fields']);

// Produces a complete staged manifest, never a committed/saved result.
// choices: use-embedded | keep-existing | assign-new | skip | cancel.
export function planRecordingIdentity({ manifest, audioRelativePath, fingerprint, embedded,
    choice = null, assignedRecordingId = null, establishedAudioSourceIds = [], selectedAudioSourceId = null } = {}) {
    if (choice === 'cancel') return outcome('cancelled', 'cancelled');
    if (choice === 'skip') return outcome('skipped', 'skipped');
    try {
        const checked = validateAudioSourceManifest(manifest);
        if (checked.status !== 'valid') return outcome('blocked', 'invalid-manifest', { validation: checked });
        const originalText = JSON.stringify(checked.manifest);
        requireValue(choice === null || ['use-embedded', 'keep-existing', 'assign-new'].includes(choice), 'choice', 'The identity choice is invalid.');
        pathKey(audioRelativePath); fingerprint = copyJson(fingerprint); checkFingerprint(fingerprint);
        const source = resolveAudioSourceId({ audioSourceId: checked.manifest.audioSourceId, establishedAudioSourceIds, selectedAudioSourceId });
        if (source.status !== 'resolved') return outcome(source.status === 'decision-required' ? 'decision-required' : 'blocked', 'source-id-conflict', { sourceResolution: source });
        const candidate = checked.manifest;
        candidate.audioSourceId = source.audioSourceId;
        const entry = candidate.recordings.find(item => pathKey(item.audioRelativePath) === pathKey(audioRelativePath));
        requireValue(!entry || entry.audioRelativePath === audioRelativePath, 'path-spelling', 'The selected audio path differs in case or Unicode spelling; explicit file association is required.');
        const observation = copyJson(embedded);
        requireValue(object(observation) && ['valid', 'absent', 'invalid', 'unsupported', 'conflicting'].includes(observation.status), 'embedded-result', 'A current embedded-identity reader result is required.');
        requireValue(Array.isArray(observation.issues), 'embedded-result', 'The embedded reader result has no issue list.');
        if (observation.status === 'conflicting') return outcome('blocked', 'embedded-conflict', { issues: observation.issues });
        let id, origin, reason = null, code;
        const unchanged = !!entry && matchingFingerprint(entry.audioFingerprint, fingerprint);
        if (observation.status === 'valid') {
            requireValue(uuid(observation.recordingId) && observation.issues.length === 0 && Array.isArray(observation.identityOrigins) && observation.identityOrigins.length > 0 &&
                observation.identityOrigins.every(value => ['apple-embedded', 'imuse-embedded'].includes(value)), 'embedded-result', 'The embedded reader result is inconsistent.');
            if (observation.evidence) requireValue(Array.isArray(observation.evidence) && observation.evidence.every(item => object(item) && uuid(item.recordingId) && sameId(item.recordingId, observation.recordingId)),
                'embedded-result', 'Embedded identity evidence disagrees with its resolved ID.');
            if (entry && !sameId(entry.recordingId, observation.recordingId) && choice !== 'use-embedded') {
                requireValue(choice === null, 'choice', 'A valid embedded ID cannot be replaced by a Memora assignment.');
                return outcome('decision-required', 'embedded-id-mismatch', { choices: ['use-embedded', 'cancel'] });
            }
            requireValue(choice === null || choice === 'use-embedded', 'choice', 'A valid embedded ID takes priority.');
            id = observation.recordingId;
            // Agreement is not identity precedence: keep an already represented
            // origin, otherwise use iMuse when both conventions hold the same ID.
            origin = observation.identityOrigins.includes(entry?.identityOrigin) ? entry.identityOrigin :
                observation.identityOrigins.includes('imuse-embedded') ? 'imuse-embedded' : 'apple-embedded';
            code = entry && !sameId(entry.recordingId, id) ? 'embedded-id-confirmed' : 'embedded-id';
        } else {
            requireValue(observation.recordingId === null, 'embedded-result', 'An unresolved reader result cannot supply a Recording ID.');
            const absent = observation.status === 'absent';
            if (absent) requireValue(observation.issues.length === 0, 'embedded-result', 'Absent metadata cannot contain unresolved reader issues.');
            else {
                // No recovery through a valid-ID/provenance conflict, read error
                // or unchecked container. Do not disguise those as corrupt ID data.
                if (!observation.issues.length || observation.evidence?.length || observation.issues.some(issue => !object(issue) ||
                    issue.scope !== 'identity' || issue.status === 'conflicting' || !IDENTITY_ISSUES.has(issue.code))) {
                    return outcome('blocked', 'unresolved-reader-issues', { issues: observation.issues });
                }
                reason = observation.status === 'unsupported' ? RECOVERY[1] : RECOVERY[0];
            }
            const savedRecovery = unchanged && entry.identityOrigin === 'memora-assigned' && RECOVERY.includes(entry.identityRecovery?.reason);
            if (savedRecovery && !absent) reason = entry.identityRecovery.reason;
            if (!absent && !savedRecovery && choice !== 'assign-new') {
                requireValue(choice === null, 'choice', 'Unreadable embedded metadata requires explicit assignment or skip.');
                return outcome('decision-required', 'unreadable-embedded-id', { choices: ['assign-new', 'skip', 'cancel'], recoveryReason: reason });
            }
            if (absent && entry && !unchanged && choice === null) return outcome('decision-required', 'audio-changed', { choices: ['keep-existing', 'assign-new', 'cancel'] });
            if (absent) requireValue(choice === null || choice === 'keep-existing' && entry || choice === 'assign-new' && (!entry || !unchanged),
                'choice', 'This identity choice does not apply to the current recording.');
            if (!absent && savedRecovery) requireValue(choice === null, 'choice', 'The unchanged recording already has an accepted recovery identity.');
            const assign = choice === 'assign-new' || (absent && !entry);
            if (assign) {
                if (assignedRecordingId === null) return outcome('assignment-required', reason ? 'recovery-assignment' : 'new-assignment', { recoveryReason: reason });
                requireValue(uuid(assignedRecordingId) && (!entry || !sameId(entry.recordingId, assignedRecordingId)), 'assigned-id', 'A new assignment requires a new standard UUID.');
                id = assignedRecordingId; origin = 'memora-assigned'; code = reason ? 'recovery-assigned' : 'assigned';
            } else {
                requireValue(entry && (choice === null || (absent && choice === 'keep-existing')), 'choice', 'There is no applicable existing Recording ID to keep.');
                id = entry.recordingId; origin = entry.identityOrigin; code = unchanged ? 'reused' : 'changed-id-kept';
            }
        }
        if (candidate.recordings.some(item => item !== entry && sameId(item.recordingId, id))) return outcome('blocked', 'duplicate-recording-id');
        const staged = entry || { audioRelativePath };
        staged.recordingId = id; staged.identityOrigin = origin;
        staged.audioFingerprint = { ...(entry?.audioFingerprint || {}), ...copyJson(fingerprint), algorithm: 'sha256', digest: fingerprint.digest.toLowerCase() };
        if (reason) staged.identityRecovery = { ...(entry?.identityRecovery || {}), reason };
        else if (staged.identityRecovery) {
            delete staged.identityRecovery.reason;
            if (!Object.keys(staged.identityRecovery).length) delete staged.identityRecovery;
        }
        if (!entry) candidate.recordings.push(staged);
        const final = validateAudioSourceManifest(candidate);
        if (final.status !== 'valid') return outcome('blocked', 'invalid-candidate', { validation: final });
        return outcome('ready', code, { recordingId: id, candidate: final.manifest,
            requiresPersistence: JSON.stringify(final.manifest) !== originalText });
    } catch (error) { return outcome('blocked', error instanceof SourceError ? error.code : 'invalid-input', { validation: errorResult(error) }); }
}
