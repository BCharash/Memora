// Checkpoint 2B. Uses the sole schema owner; no database opens on import.
import { openMemoraDatabase } from './database.js';
import { parseAudioSourceManifest } from './audioSourceIdentity.js';
const STORE = 'audioSourceRecovery';
const idKey = id => {
    if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new TypeError('An Audio Source UUID is required.');
    return id.toLowerCase();
};
function checkRecord(record) {
    const parsed = parseAudioSourceManifest(record.manifestText);
    if (parsed.status !== 'valid' || idKey(parsed.manifest.audioSourceId) !== idKey(record.audioSourceId) ||
        typeof record.revision !== 'string' || !record.revision || record.revision.length>128 ||
        !(record.baseBytes===null || record.baseBytes instanceof Uint8Array && record.baseBytes.length<=8*1024*1024) ||
        !['pending','verified','export-pending'].includes(record.state)) {
        throw new Error('The saved recording-list recovery data is invalid.');
    }
    return record;
}
export function createAudioSourceRecoveryStore({ openDatabase = openMemoraDatabase } = {}) {
    async function transact(mode, work) {
        const database = await openDatabase();
        try {
            return await new Promise((resolve,reject) => {
                const tx = database.transaction(STORE,mode); let result, failure;
                tx.oncomplete = () => resolve(result);
                tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Recording-list recovery storage failed.'));
                try { work(tx.objectStore(STORE), value => { result=value; }, error => { failure=error; tx.abort(); }); }
                catch (error) { failure=error; tx.abort(); }
            });
        } finally { database.close(); }
    }
    const get = async id => {
        const record = await transact('readonly',(store,set) => { const request=store.get(idKey(id)); request.onsuccess=()=>set(request.result || null); });
        return record ? checkRecord(record) : null;
    };
    return Object.freeze({
        get,
        // No expiry. Explicit removal is revision-checked, including across tabs.
        put: async (record, expectedRevision = null) => {
            checkRecord(record); const key=idKey(record.audioSourceId);
            return transact('readwrite',(store,set,fail) => {
                const request=store.get(key);
                request.onsuccess=()=> {
                    if ((request.result?.revision || null)!==expectedRevision) return fail(Object.assign(new Error('This recording list changed in another Memora session. Reload it before continuing.'),{code:'recovery-conflict'}));
                    store.put({ ...record, audioSourceId:key }); set(record.revision);
                };
            });
        },
        remove: async (id, expectedRevision) => transact('readwrite',(store,set,fail) => {
            const request=store.get(idKey(id));
            request.onsuccess=()=> {
                if ((request.result?.revision || null)!==expectedRevision) return fail(Object.assign(new Error('The saved recording list changed. Refresh before removing it.'),{code:'recovery-conflict'}));
                store.delete(idKey(id)); set(true);
            };
        }),
        list: async () => transact('readonly',(store,set) => { const request=store.getAll(); request.onsuccess=()=>set(request.result); })
    });
}
// Match only independently established identity or a browser-confirmed directory.
// Names, paths and audio hashes are never source association evidence.
export async function matchAudioSourceRecovery(records, { source = null, establishedAudioSourceIds = [] } = {}) {
    const matches=[];
    for (const record of records) {
        try {
            checkRecord(record);
            const byId=establishedAudioSourceIds.some(id=>idKey(id)===idKey(record.audioSourceId));
            let byHandle=false;
            if (source?.kind==='directory' && record.directoryHandle?.kind==='directory' && typeof source.isSameEntry==='function') {
                try { byHandle=await source.isSameEntry(record.directoryHandle); } catch { /* Cannot prove handle identity. */ }
            }
            if (byId || byHandle) matches.push(record);
        } catch { /* Invalid recovery data is not offered as a restorable list. */ }
    }
    return matches;
}
