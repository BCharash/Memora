// Synthetic directory objects contain functions and cannot be structured-cloned
// into IndexedDB. Real handle/IDB behavior is covered by the 2B native harness.
export { matchAudioSourceRecovery } from '../js/audioSourceRecovery.js?checkpoint3';
const records=new Map();
export function createAudioSourceRecoveryStore(){return {
 async list(){return [...records.values()];},async get(id){return records.get(id.toLowerCase())||null;},
 async put(record,expected){const key=record.audioSourceId.toLowerCase();if((records.get(key)?.revision||null)!==expected)throw Object.assign(Error('Recovery changed'),{code:'recovery-conflict'});records.set(key,{...record});},
 async remove(id,expected){if((records.get(id.toLowerCase())?.revision||null)!==expected)throw Error('Recovery changed');records.delete(id.toLowerCase());}
};}
