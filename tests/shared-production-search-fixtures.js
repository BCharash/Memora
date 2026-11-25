import {getEditedTranscriptChoices,readTranscriptFile,selectHighestModelRecords} from '../js/combine.js';
import {readTranscriptPreferences} from '../js/transcriptPreferences.js';
let currentRecords=[];
const editorFixtureName='Long filename for narrow screen Search editor verification.txt';
export const searchEditorFixture={
 filename:editorFixtureName,
 body:'Opening paragraph.\n\nThe first match crosses a\nline break.\n\nThe second match contains   extra spaces.\n\nClosing paragraph.'
};
export const sharedSearchBuilds=[];
export const sharedSearchArchives=[];
export async function buildSearchIndex(files,onProgress,archive,{activate=true}={}){
 sharedSearchArchives.push(archive);
 sharedSearchBuilds.push(files.map(file=>file.name));
 const available=await Promise.all(files.map(readTranscriptFile));
 const records=readTranscriptPreferences().size?selectHighestModelRecords(available):available;
 if(activate)currentRecords=records;
 const versionChoices=getEditedTranscriptChoices(available,selectHighestModelRecords(available));
 return {records,versionChoices,sentences:records.length,chunkCount:records.length,durationMs:1,readDurationMs:0,sentenceProcessingDurationMs:0,chunkProcessingDurationMs:0,embeddingDurationMs:0,archiveNeedsUpdate:records.some(record=>record.filename===editorFixtureName)};
}

export function createSearchEmbeddingsArchive(index){return {
 fixture:true,
 files:index.records.map(record=>record.filename),
 bodies:index.records.map(record=>record.transcript)
};}
export function serializeSearchEmbeddingsArchive(index){return JSON.stringify(createSearchEmbeddingsArchive(index));}
export function activateSearchIndex(index){currentRecords=index.records;}
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
