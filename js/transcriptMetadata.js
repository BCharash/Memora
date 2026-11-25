// Readable individual TXT metadata. Body text is never an identity source.
const UUID=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const pendingEdits = new WeakSet();
const EDIT_DATE = 'Memora edited at';
const EDIT_TARGET = 'Memora edit target';
export function setMemoraEditPending(file, pending) {
    if (pending) pendingEdits.add(file);
    else pendingEdits.delete(file);
}
export function isMemoraEditConfirmed(file, target) {
    return target === file?.name && !pendingEdits.has(file);
}
export function readMemoraEdit(header, file) {
    const values = label => header.split(/\r?\n/).filter(line => line.startsWith(label + ':'))
        .map(line => line.slice(label.length + 1).trim());
    const dates = values(EDIT_DATE), targets = values(EDIT_TARGET);
    if (dates.length !== 1 || targets.length !== 1 || !targets[0] ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(dates[0]) ||
        !Number.isFinite(Date.parse(dates[0]))) return null;
    return { at: dates[0], target: targets[0], confirmed: isMemoraEditConfirmed(file, targets[0]) };
}
export const isRecordingUuid=value=>typeof value==='string'&&UUID.test(value);
export function transcriptHeader(text) {
    const match=/^--------------------------------------------------[\t ]*(?:\r?\n|$)/m.exec(text);
    if(!match || match.index>65536)throw Error('The transcript has no supported header separator.');
    return {text:text.slice(0,match.index),bodyOffset:match.index+match[0].length};
}
export function readTranscriptIdentity(text) {
    const header=transcriptHeader(text).text;
    const field=label=>{
        const values=header.split(/\r?\n/).filter(line=>line.startsWith(label+':')).map(line=>line.slice(label.length+1).trim()).filter(value=>value&&value!=='Unknown');
        if(values.length>1)throw Error(`The transcript repeats its ${label} field.`);
        return values[0]||null;
    };
    const recordingId=field('Recording ID'),legacy=field('Voice Memo ID');
    if(recordingId&&legacy&&recordingId.toLowerCase()!==legacy.toLowerCase())throw Error('Recording ID and Voice Memo ID disagree. The transcript was not changed.');
    // Historical Audio Source ID is intentionally ignored, including malformed/repeated values.
    const result={recordingId:recordingId||legacy,archiveUuid:field('Archive UUID'),originalAudioFolderName:field('Original Audio Folder'),metadataVersion:field('Metadata version'),recordingIdentityMethod:field('Recording ID method')};
    for(const key of ['recordingId','archiveUuid'])if(result[key]&&!isRecordingUuid(result[key]))throw Error(`The transcript contains an invalid ${key}.`);
    if(result.recordingIdentityMethod&&result.recordingIdentityMethod!=='memora-recording-prefix-v1')throw Error('The recording identity method is unsupported.');
    if(result.metadataVersion&&result.metadataVersion!=='1')throw Error('The transcript metadata version is unsupported.');
    return result;
}
export function replaceTranscriptBody(original,body,{filename, editedAt = new Date()} = {}) {
    readTranscriptIdentity(original);
    const {text: header,bodyOffset}=transcriptHeader(original);
    // Retain unrelated header bytes, line endings and leading body spacing.
    const space=/^(?:\r?\n)*/.exec(original.slice(bodyOffset))[0];
    let prefix = original.slice(0,bodyOffset);
    if (filename !== undefined) {
        if (!filename || /[\r\n\x00-\x1f\x7f]/.test(filename)) throw Error('The transcript filename cannot be recorded in its header.');
        const newline = header.includes('\r\n') ? '\r\n' : '\n';
        const originalLines = header.match(/[^\r\n]*(?:\r\n|\n|$)/g) || [];
        const retained = originalLines.filter(line => !line.startsWith(EDIT_DATE + ':') && !line.startsWith(EDIT_TARGET + ':')).join('');
        const separator = original.slice(header.length, bodyOffset);
        prefix = retained + EDIT_DATE + ': ' + editedAt.toISOString() + newline +
            EDIT_TARGET + ': ' + filename + newline + separator +
            (separator.endsWith('\n') ? '' : newline);
    }
    return prefix+space+String(body);
}
export function recordingIdentityLines({recordingId,archiveUuid,originalAudioFolderName,recordingIdentityMethod=null}) {
    if(![recordingId,archiveUuid].every(isRecordingUuid))throw Error('Resolve recording and archive identity before saving.');
    if(typeof originalAudioFolderName!=='string'||/[\r\n\x00-\x1f\x7f]/.test(originalAudioFolderName))throw Error('The audio folder name cannot be represented in a readable transcript header.');
    if(recordingIdentityMethod&&recordingIdentityMethod!=='memora-recording-prefix-v1')throw Error('The recording identity method is unsupported.');
    return [`Metadata version: 1`,`Archive UUID: ${archiveUuid}`,`Original Audio Folder: ${originalAudioFolderName}`,`Recording ID: ${recordingId}`,...(recordingIdentityMethod?[`Recording ID method: ${recordingIdentityMethod}`]:[])];
}
