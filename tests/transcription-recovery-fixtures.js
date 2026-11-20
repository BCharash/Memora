// Synthetic directory objects contain functions and cannot be structured-cloned
// into IndexedDB. Real handle/IDB behavior is covered by the 2B native harness.
export { matchAudioSourceRecovery, groupAudioSourceRecovery } from '../js/audioSourceRecovery.js?checkpoint3';
const records=new Map();
export function createAudioSourceRecoveryStore(){return {
 async list(){return [...records.values()];},async get(id){return records.get(id.toLowerCase())||null;},
 async put(record,expected){const key=record.audioSourceId.toLowerCase();if((records.get(key)?.revision||null)!==expected)throw Object.assign(Error('Recovery changed'),{code:'recovery-conflict'});records.set(key,{...record});},
 async pruneSuperseded(id,revision){const current=records.get(id.toLowerCase());if(!current||current.revision!==revision||current.state!=='verified'||!current.directoryHandle?.isSameEntry)return 0;let count=0;for(const [key,record]of records){if(key!==id.toLowerCase()&&record.state==='verified'&&!record.pendingTranscriptArchive&&record.directoryHandle&&await current.directoryHandle.isSameEntry(record.directoryHandle)){records.delete(key);count++;}}return count;},
 async removeMany(items){for(const item of items)if(records.get(item.audioSourceId.toLowerCase())?.revision!==item.revision)throw Error('Recovery changed');for(const item of items)records.delete(item.audioSourceId.toLowerCase());},
 async remove(id,expected){if((records.get(id.toLowerCase())?.revision||null)!==expected)throw Error('Recovery changed');records.delete(id.toLowerCase());}
};}
