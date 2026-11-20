import {readTranscriptFile} from '../js/combine.js';
export const sharedSearchBuilds=[];
export async function buildSearchIndex(files){
 sharedSearchBuilds.push(files.map(file=>file.name));
 const records=await Promise.all(files.map(readTranscriptFile));
 return {records,sentences:records.length,chunkCount:records.length,durationMs:1,readDurationMs:0,sentenceProcessingDurationMs:0,chunkProcessingDurationMs:0,embeddingDurationMs:0,archiveNeedsUpdate:false};
}
