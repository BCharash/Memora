// TXT metadata is authoritative. This bounded local cache never grants access,
// supplies missing identities to existing files, or writes a folder sidecar.
import {readTranscriptFile} from './combine.js';
import {openMemoraDatabase} from './database.js';

const scopes = new WeakMap();
const emptyCollections = new WeakMap();
const STORE = 'transcriptCatalogues';
const MAX_CACHED_FOLDERS = 16;

function scope(source) {
    if (!scopes.has(source)) scopes.set(source, crypto.randomUUID());
    return scopes.get(source);
}

async function readTranscriptCatalogueRows() {
    const db = await openMemoraDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction(STORE).objectStore(STORE).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

const normalize=value=>String(value).normalize('NFC').toLowerCase();
const hasHandle=row=>typeof row.directoryHandle?.isSameEntry==='function';
function logicalScope(row){
    if(typeof row.folderName!=='string'||!Array.isArray(row.records))return null;
    const ids=[...new Set(row.records.map(record=>record.archiveUuid).filter(id=>typeof id==='string'&&id).map(normalize))].sort();
    return ids.length?JSON.stringify([normalize(row.folderName),normalize(transcriptMetadataParent(row)),ids]):null;
}
async function sameScope(older,newer){
    if(hasHandle(older)&&hasHandle(newer)){
        try{return await newer.directoryHandle.isSameEntry(older.directoryHandle);}catch{return false;}
    }
    const scope=logicalScope(older);if(!scope||scope!==logicalScope(newer))return false;
    // Do not let a handle-free row bridge two proven physical locations.
    if(hasHandle(older)&&!hasHandle(newer)&&newer.complete!==false)return false;
    return true;
}
function withMetadataLock(work){
    return globalThis.navigator?.locks?navigator.locks.request('memora-transcript-metadata',work):work();
}
async function cleanedTranscriptRows(){
    for(let attempt=0;attempt<2;attempt++){
        const rows=await readTranscriptCatalogueRows(),keep=[],obsolete=[];
        rows.sort((a,b)=>Number(a.complete===false)-Number(b.complete===false)||b.updatedAt-a.updatedAt);
        for(const row of rows){
            if(Array.isArray(row.records)&&row.records.length===0){obsolete.push(row);continue;}
            let duplicate=false;
            for(const current of keep)if(await sameScope(row,current)){duplicate=true;break;}
            (duplicate?obsolete:keep).push(row);
        }
        if(!obsolete.length)return rows;
        try{await removeTranscriptCatalogueCache(obsolete);return await readTranscriptCatalogueRows();}
        catch(error){if(attempt)throw error;} // Recheck a snapshot refreshed during cleanup.
    }
}
// Settings refresh and reads also clean pre-existing versions, even if their
// original folder has not been selected again since the app was updated.
export function listTranscriptCatalogueCache(){return withMetadataLock(cleanedTranscriptRows);}

export async function clearTranscriptCatalogueCache() {
    const db = await openMemoraDatabase();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).clear();
            tx.oncomplete = resolve;
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

// Delete exact observed snapshots only; a refresh in another tab is retained.
export async function removeTranscriptCatalogueCache(entries) {
    if(!entries.length)return;
    const db=await openMemoraDatabase();
    try{
        await new Promise((resolve,reject)=>{
            const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let failure;
            tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(failure||tx.error||Error('Could not delete transcript folder metadata.'));
            for(const entry of entries){const request=store.get(entry.id);request.onsuccess=()=>{
                if(request.result&&JSON.stringify(request.result)!==JSON.stringify(entry)){
                    failure=Error('Transcript folder metadata changed. Refresh the list before deleting.');tx.abort();return;
                }
                if(request.result)store.delete(entry.id);
            };}
        });
    }finally{db.close();}
}

export function transcriptMetadataParent(row) {
    const names=[...new Set(row.records.map(record=>record.originalAudioFolderName).filter(Boolean))];
    return names.length===1?names[0]:names.length>1?'Multiple Audio Folders':row.parentAudioFolderName||'Parent Audio Folder Unknown';
}

export function cacheTranscriptMetadata(source,records){return withMetadataLock(()=>writeTranscriptMetadata(source,records));}
async function writeTranscriptMetadata(source, records) {
    const complete=source.kind==='directory'||source.selectionScope==='folder';
    const archives=[...new Set(records.map(record=>record.archiveUuid?.toLowerCase()).filter(Boolean))].sort();
    const entry={id:scope(source),folderName:source.name,updatedAt:Date.now(),revision:crypto.randomUUID(),complete,
        parentAudioFolderName:source.parentAudioName||null,
        records:records.map(record=>({filename:record.filename,recordingId:record.recordingId,archiveUuid:record.archiveUuid,whisperModel:record.whisperModel,
            operation:record.operation,recordingDate:record.recordingDate,duration:record.duration,audioRelativePath:record.audioRelativePath,
            recordingFilename:record.recordingFilename,originalAudioFolderName:record.originalAudioFolderName,size:record.file.size,lastModified:record.file.lastModified})),
        ...(source.kind==='directory'?{directoryHandle:source}:{})};
    const existing=await cleanedTranscriptRows(),matches=[];
    for(const old of existing){
        let same=old.id===entry.id;
        if(!same&&source.kind==='directory'&&old.directoryHandle){try{same=await source.isSameEntry(old.directoryHandle);}catch{/* Unproved association. */}}
        if(!same&&!old.directoryHandle&&archives.length&&complete){
            const oldArchives=[...new Set(old.records.map(record=>record.archiveUuid?.toLowerCase()).filter(Boolean))].sort();
            same=old.folderName.normalize('NFC').toLowerCase()===source.name.normalize('NFC').toLowerCase()&&transcriptMetadataParent(old)===transcriptMetadataParent(entry)&&JSON.stringify(oldArchives)===JSON.stringify(archives);
        }
        if(same)matches.push(old);
    }
    if(!records.length){if(complete&&matches.length)await removeTranscriptCatalogueCache(matches);return;}
    matches.sort((a,b)=>b.updatedAt-a.updatedAt);const latest=matches[0];
    if(latest){if(!complete&&latest.complete)return;entry.id=latest.id;}
    const db=await openMemoraDatabase();
    try{
        await new Promise((resolve,reject)=>{
            const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let failure;
            tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(failure||tx.error);
            const expected=new Map(matches.map(row=>[row.id,row]));if(!expected.has(entry.id))expected.set(entry.id,null);
            let pending=expected.size;
            for(const [id,old]of expected){const request=store.get(id);request.onsuccess=()=>{
                if(JSON.stringify(request.result||null)!==JSON.stringify(old)){
                    failure=Error('Transcript metadata was refreshed elsewhere. The newer snapshot was kept.');tx.abort();return;
                }
                if(--pending===0){
                    for(const old of matches)if(old.id!==entry.id)store.delete(old.id);
                    store.put(entry);const all=store.getAll();all.onsuccess=()=>{for(const old of all.result.sort((a,b)=>b.updatedAt-a.updatedAt).slice(MAX_CACHED_FOLDERS))store.delete(old.id);};
                }
            };}
        });
        scopes.set(source,entry.id);
    }finally{db.close();}
}

export async function readTranscriptFolder(source, {onProgress, signal} = {}) {
    const files = [], records = [], issues = [];
    const check = () => {
        if (signal?.aborted) throw new DOMException('Reading cancelled.', 'AbortError');
    };
    if (source?.kind === 'file-input') {
        for (const file of source.files) {
            check();
            if (/\.txt$/i.test(file.name) && (!file.webkitRelativePath ||
                file.webkitRelativePath === `${source.name}/${file.name}`)) files.push(file);
        }
    } else if (source?.kind === 'directory') {
        for await (const [name, handle] of source.entries()) {
            check();
            if (handle.kind === 'file' && /\.txt$/i.test(name)) files.push(await handle.getFile());
        }
    } else throw Error('Select a transcript folder.');

    const names = new Set();
    for (const [index, file] of files.entries()) {
        check();
        const key = file.name.normalize('NFC').toLowerCase();
        if (names.has(key)) issues.push(`Conflicting transcript filename: ${file.name}`);
        names.add(key);
        try { records.push(await readTranscriptFile(file)); }
        catch (error) { issues.push(`${file.name}: ${error.message}`); }
        onProgress?.({completed: index + 1, total: files.length});
        if (index % 32 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    check();
    const ids = new Set(records.map(record => record.archiveUuid?.toLowerCase()).filter(Boolean));
    let cacheError = null;
    try { if(!issues.length)await cacheTranscriptMetadata(source, records); }
    catch (error) { cacheError = error.message; } // Cache availability never establishes identity.
    return {source, files: records.map(record => record.file), records, issues, cacheError,
        archiveUuid: ids.size === 1 ? records.find(record => record.archiveUuid).archiveUuid : null,
        complete: source.kind === 'directory' || source.selectionScope === 'folder'};
}

export class TranscriptCollectionError extends Error {}

export async function openTranscriptCatalogue(source) {
    const snapshot = await readTranscriptFolder(source);
    if (snapshot.issues.length) throw Error(snapshot.issues.join(' '));
    const ids = new Set(snapshot.records.map(record => record.archiveUuid?.toLowerCase()).filter(Boolean));
    if (ids.size > 1) throw new TranscriptCollectionError('Choose one transcript collection before adding new transcripts.');
    if (snapshot.records.some(record => !record.archiveUuid || !record.recordingId))
        throw new TranscriptCollectionError('Existing transcripts need Recording ID and Archive UUID metadata before adding to this collection.');
    // Empty collections get a session identity here, written into their first TXT.
    // Clearing the metadata cache does not change the active collection identity.
    if (!snapshot.records.length && !emptyCollections.has(source))
        emptyCollections.set(source, crypto.randomUUID());
    return {archiveUuid: snapshot.archiveUuid || emptyCollections.get(source), snapshot};
}
