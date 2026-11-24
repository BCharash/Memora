import {readTranscriptFile} from '../js/combine.js';
let currentRecords=[];
const editorFixtureName='Long filename for narrow screen Search editor verification.txt';
export const searchEditorFixture={
 filename:editorFixtureName,
 body:'Opening paragraph.\n\nThe first match crosses a\nline break.\n\nThe second match contains   extra spaces.\n\nClosing paragraph.'
};
export const sharedSearchBuilds=[];
export const sharedSearchArchives=[];
export async function buildSearchIndex(files,onProgress,archive){
 sharedSearchArchives.push(archive);
 sharedSearchBuilds.push(files.map(file=>file.name));
 const records=await Promise.all(files.map(readTranscriptFile));currentRecords=records;
 return {records,sentences:records.length,chunkCount:records.length,durationMs:1,readDurationMs:0,sentenceProcessingDurationMs:0,chunkProcessingDurationMs:0,embeddingDurationMs:0,archiveNeedsUpdate:records.some(record=>record.filename===editorFixtureName)};
}

export function serializeSearchEmbeddingsArchive(){return '{"fixture":true}';}
export function getSearchIndexRecords(){return currentRecords;}
export async function search(){
 const record=currentRecords[0];
 if(record?.filename===editorFixtureName){
  const sentences=['The first match crosses a line break.','The second match contains extra spaces.'];
  return {sentenceResults:sentences.map((sentence,i)=>({record,filename:record.filename,sentence,paragraphIndex:i+1,sentenceIndex:0,score:0.9})),transcriptRanks:[],durationMs:1};
 }
 return {sentenceResults:record?[{record,filename:record.filename,sentence:'This is an existing transcript.',paragraphIndex:0,sentenceIndex:0,score:0.9}]:[],transcriptRanks:[],durationMs:1};
}
export function searchLexical(){return [];}
export async function searchStoredRepresentations(){return {representations:[],transcriptRanks:[]};}
