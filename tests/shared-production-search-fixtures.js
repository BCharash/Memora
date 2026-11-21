import {readTranscriptFile} from '../js/combine.js';
let currentRecords=[];
export const sharedSearchBuilds=[];
export const sharedSearchArchives=[];
export async function buildSearchIndex(files,onProgress,archive){
 sharedSearchArchives.push(archive);
 sharedSearchBuilds.push(files.map(file=>file.name));
 const records=await Promise.all(files.map(readTranscriptFile));currentRecords=records;
 return {records,sentences:records.length,chunkCount:records.length,durationMs:1,readDurationMs:0,sentenceProcessingDurationMs:0,chunkProcessingDurationMs:0,embeddingDurationMs:0,archiveNeedsUpdate:false};
}

export function getSearchIndexRecords(){return currentRecords;}
export async function search(){
 const record=currentRecords[0];
 return {sentenceResults:record?[{record,filename:record.filename,sentence:'This is an existing transcript.',paragraphIndex:0,sentenceIndex:0,score:0.9}]:[],transcriptRanks:[],durationMs:1};
}
export function searchLexical(){return [];}
export async function searchStoredRepresentations(){return {representations:[],transcriptRanks:[]};}
