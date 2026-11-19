import * as real from '../js/storage.js?checkpoint3';
export * from '../js/storage.js?checkpoint3';
import * as f from './recording-identity-fixtures.js';
export const calls=[];
let inferenceGate=null;
export function pauseNextTranscription(){let release;inferenceGate=new Promise(resolve=>{release=resolve;});return release;}
export const selections=[];
export function directory(name='Audio'){
    const files=new Map(),folders=new Map();
    const state={files,folders,failTranscriptOnce:false,aborts:0};
    const root={kind:'directory',name,async isSameEntry(other){return root===other;},async resolve(handle){if(handle===root)return [];for(const [name,child]of folders)if(child===handle)return [name];return null;},
        async *entries(){for(const [name]of files)yield [name,await root.getFileHandle(name)];for(const [name,folder]of folders)yield [name,folder];},
        async getDirectoryHandle(name,{create=false}={}){if(!folders.has(name)){if(!create)throw new DOMException('Missing','NotFoundError');folders.set(name,directory(name).root);}return folders.get(name);},
        async getFileHandle(name,{create=false}={}){
            if(!files.has(name)){if(!create)throw new DOMException('Missing','NotFoundError');files.set(name,new Uint8Array());}
            return {kind:'file',name,async getFile(){return new File([files.get(name)],name,{lastModified:123});},async createWritable(){let pending;return {async write(value){if(state.failTranscriptOnce&&name.endsWith('.txt')){state.failTranscriptOnce=false;throw Error('Injected transcript write failure');}pending=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value);},async close(){files.set(name,pending);},async abort(){state.aborts++;}};}};
        }
    };return {root,state};
}
export async function selectFolder(){if(!selections.length)throw Error('No synthetic folder selection queued');return selections.shift();}
export async function readAudioMetadata(){return {recordingDate:null,fileCreationDate:null,duration:1,durationTimescale:null,uuid:null};}
export async function listQualifiedWhisperProductionModels(){return [{family:'tiny',label:'Tiny (synthetic test)'}];}
export async function transcribeRecording(file,model,language,operation,status,afterInference,embedded){
    calls.push({file,model,language,operation,embedded});
    const gate=inferenceGate;inferenceGate=null;if(gate)await gate;
    const record={file,model,metadata:await readAudioMetadata(),transcript:'Synthetic completed text.\n\nSecond paragraph.',timings:{},diagnostics:null};
    if(afterInference)await afterInference(record,{id:'synthetic',checkpoint(){}});return record;
}
export async function seedAudio(root,name='memo.wav',id=null){
    const blob=id?f.wav([f.wavChunk('imID',f.payload(id))]):f.wav();
    const writer=await (await root.getFileHandle(name,{create:true})).createWritable();await writer.write(new Uint8Array(await blob.arrayBuffer()));await writer.close();
    return (await root.getFileHandle(name)).getFile();
}
export async function requireWhisperProductionEligibility(){throw Error('A real model path was reached in an isolated identity test.');}
