// Readable individual TXT metadata. Body text is never an identity source.
const UUID=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
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
    const result={recordingId:recordingId||legacy,archiveUuid:field('Archive UUID'),audioSourceId:null,originalAudioFolderName:field('Original Audio Folder'),metadataVersion:field('Metadata version'),recordingIdentityMethod:field('Recording ID method')};
    for(const key of ['recordingId','archiveUuid'])if(result[key]&&!isRecordingUuid(result[key]))throw Error(`The transcript contains an invalid ${key}.`);
    if(result.recordingIdentityMethod&&result.recordingIdentityMethod!=='memora-recording-prefix-v1')throw Error('The recording identity method is unsupported.');
    if(result.metadataVersion&&result.metadataVersion!=='1')throw Error('The transcript metadata version is unsupported.');
    return result;
}
export function replaceTranscriptBody(original,body) {
    readTranscriptIdentity(original);
    const {bodyOffset}=transcriptHeader(original);
    // Retain the original header bytes/line endings and leading body spacing.
    const space=/^(?:\r?\n)*/.exec(original.slice(bodyOffset))[0];
    return original.slice(0,bodyOffset)+space+String(body);
}
export function recordingIdentityLines({recordingId,archiveUuid,originalAudioFolderName,recordingIdentityMethod=null}) {
    if(![recordingId,archiveUuid].every(isRecordingUuid))throw Error('Resolve recording and archive identity before saving.');
    if(typeof originalAudioFolderName!=='string'||/[\r\n\x00-\x1f\x7f]/.test(originalAudioFolderName))throw Error('The audio folder name cannot be represented in a readable transcript header.');
    if(recordingIdentityMethod&&recordingIdentityMethod!=='memora-recording-prefix-v1')throw Error('The recording identity method is unsupported.');
    return [`Metadata version: 1`,`Archive UUID: ${archiveUuid}`,`Original Audio Folder: ${originalAudioFolderName}`,`Recording ID: ${recordingId}`,...(recordingIdentityMethod?[`Recording ID method: ${recordingIdentityMethod}`]:[])];
}
