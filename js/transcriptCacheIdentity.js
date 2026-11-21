// Cache keys identify a logical TXT variant, independently of folder names.
import {readTranscriptIdentity,transcriptHeader} from './transcriptMetadata.js';
export const transcriptFilenameKey = filename => String(filename).normalize('NFC').toLowerCase();
export function cachedTranscriptRecord(record, {allowLegacy=false}={}) {
    let identity=null,model=record.model||'',operation=record.operation||'transcribe';
    try{
        identity=readTranscriptIdentity(record.transcript);
        const header=transcriptHeader(record.transcript).text;
        model=/^Whisper model:[ \t]*(.*)$/m.exec(header)?.[1]?.trim()||model;
        const declaredOperation=/^Operation:[ \t]*(.*)$/m.exec(header)?.[1]?.trim().toLowerCase();
        if(['transcribe','translate'].includes(declaredOperation))operation=declaredOperation;
    }catch(error){if(!allowLegacy)throw error;}
    const identified=!!(identity?.archiveUuid&&identity?.recordingId);
    if(!identified&&!allowLegacy)throw Error('Cached transcripts require Recording ID and Archive UUID metadata.');
    const filenameKey=transcriptFilenameKey(record.filename);
    const archiveUuid=identity?.archiveUuid||null,recordingId=identity?.recordingId||null;
    const id=identified?JSON.stringify(['transcript-v1',archiveUuid.toLowerCase(),recordingId.toLowerCase(),filenameKey,String(model).toLowerCase(),operation]):JSON.stringify(['legacy-transcript',record.filename]);
    return {...record,model,operation,...(record.id!==undefined&&record.id!==id?{previousCacheId:record.id}:{}),id,filenameKey,archiveUuid,recordingId,
        originalAudioFolderName:identity?.originalAudioFolderName||null,
        identityStatus:identified?'identified':'legacy',
        ...(identified?{archiveFilename:[archiveUuid.toLowerCase(),filenameKey]}:{})};
}
