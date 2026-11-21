import {openTranscriptCatalogue} from './transcriptCatalogue.js';
import {openAudioFolderInventory} from './audioFolderCache.js';
import {recordingIdentityLines} from './transcriptMetadata.js';
// Historical source UUIDs are not modern recording identity.
export async function associatedSourceEvidence(){return {ids:[],labels:new Map()};}
export function createTranscriptionIdentity(){
 let session=null,archive=null,destination=null,source=null;
 return {
  reset(){session=null;archive=null;destination=null;source=null;},
  invalidateDestination(){archive=null;destination=null;},
  getSession:()=>session,
  getInventorySummary:()=>session?.getSummary(),
  async prepareSource(selectedSource,files,options={}){session=await openAudioFolderInventory(selectedSource,files,options);source=selectedSource;return session;},
  async begin(selectedSource,selectedDestination){
   if(!session||selectedSource!==source)throw Error('Select the audio source folder first.');
   if(!selectedDestination)throw Error('Select a transcript destination first.');
   if(archive&&destination===selectedDestination)return;
   archive=await openTranscriptCatalogue(selectedDestination);destination=selectedDestination;
  },
  async prepare(file){const identity=await session.prepare(file);const resolved={...identity,archiveUuid:archive.archiveUuid,originalAudioFolderName:source.name};recordingIdentityLines(resolved);return resolved;},
  finishRecording(){},
  persist:()=>session?.saveMetadata()
 };
}
