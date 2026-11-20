// Read-only parent-selection adapter. Not connected to production UI or storage.
import {parseTranscriptFile} from './combine.js';
import {parseAudioSourceManifest, AUDIO_SOURCE_LIMITS} from './audioSourceIdentity.js';
import {readEmbeddedRecordingIdentity} from './recordingIdentity.js';
const AUDIO=/\.(m4a|mp3|wav|webm|mp4|aiff|flac|ogg)$/i;
const key=path=>path.normalize('NFC').toLowerCase();
const same=(a,b)=>!!a&&!!b&&a.toLowerCase()===b.toLowerCase();
const safe=path=>typeof path==='string'&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/[\\:\x00-\x1f]/.test(p));
const fail=message=>{throw Error(message);};
export function createArchiveFolderAccess(files){
    const roots=new Set(),entries=new Map(),headers=new Map();
    for(const file of files){
        const full=file.webkitRelativePath;
        if(!full||!safe(full)||!full.includes('/'))fail('Relative folder paths are required. Select one parent archive folder.');
        const [root,...parts]=full.split('/');roots.add(root);const path=parts.join('/'),k=key(path);
        if(entries.has(k))fail(`Ambiguous or duplicate supplied path: ${path}`);
        entries.set(k,{path,file});
    }
    if(roots.size!==1)fail('Select exactly one archive root.');
    const rootName=[...roots][0];
    const readHeader=entry=>{
        if(!headers.has(entry.path))headers.set(entry.path,(async()=>{
            try{return {record:parseTranscriptFile(entry.file,await entry.file.slice(0,65536).text()),error:null};}
            catch(error){return {record:null,error:error.message};}
        })());return headers.get(entry.path);
    };
    let sourcePromise=null;
    async function sourceList(){
        if(!sourcePromise)sourcePromise=(async()=>{
            const entry=entries.get('memora-audio-source.json');if(!entry)return null;
            if(entry.file.size>AUDIO_SOURCE_LIMITS.jsonBytes)fail('Audio Recording List exceeds the read limit.');
            const parsed=parseAudioSourceManifest(await entry.file.text());
            if(parsed.status!=='valid')fail('Audio Recording List is invalid: '+(parsed.issues?.[0]?.message||parsed.status));
            return parsed.manifest;
        })();return sourcePromise;
    }
    return {
        rootName,
        async discover(onProgress=()=>{}){
            const groups=new Map();let scanned=0;
            // Immediate transcript subfolders only; combined exports stay outside scope.
            for(const entry of entries.values()){
                const parts=entry.path.split('/');if(parts.length!==2)continue;
                if(!/\.txt$/i.test(entry.file.name)&&!['memora-transcript-archive.json','memora-archive.json'].includes(entry.file.name))continue;
                const group=groups.get(parts[0])||{name:parts[0],transcripts:[],issues:[],hasTranscriptList:false};groups.set(parts[0],group);
                if(/\.txt$/i.test(entry.file.name)){
                    const result=await readHeader(entry);if(result.record)group.transcripts.push({...entry,...result});else group.issues.push({path:entry.path,error:result.error});
                    if(++scanned%16===0){onProgress(`Checked ${scanned} transcript headers…`);await new Promise(resolve=>setTimeout(resolve,0));}
                }else group.hasTranscriptList=true;
            }
            const folders=[...groups.values()].filter(g=>g.transcripts.length||g.hasTranscriptList).sort((a,b)=>a.name.localeCompare(b.name));
            for(const group of folders){
                group.transcripts.sort((a,b)=>a.file.name.localeCompare(b.file.name));
                const ids=new Set(group.transcripts.map(t=>t.record.archiveUuid?.toLowerCase()).filter(Boolean));
                if(ids.size>1)group.issues.push({path:group.name,error:'Mixed Archive UUIDs: this folder is not a single verified transcript archive.'});
            }
            return folders;
        },
        async preview(transcript){return (await transcript.file.slice(0,65536).text());},
        async resolve(transcript){
            const record=transcript.record;if(!record)fail('The transcript header could not be read.');
            const list=await sourceList();let candidate=null,viaList=false;
            if(record.audioSourceId&&list&&!same(record.audioSourceId,list.audioSourceId))fail('Audio Source ID mismatch: this transcript belongs to another audio source.');
            if(record.audioSourceId&&!list)fail('Audio Recording List missing: the transcript source cannot be verified.');
            if(list&&record.recordingId){
                const matches=list.recordings.filter(item=>same(item.recordingId,record.recordingId));
                if(matches.length!==1)fail('Recording ID is not present in this Audio Recording List. Filename fallback was not used.');
                const entry=matches[0];candidate=entries.get(key(entry.audioRelativePath));viaList=true;
                if(!candidate)fail(`Audio missing from selection: ${entry.audioRelativePath}`);
            }else{
                const reference=record.audioRelativePath||record.recordingFilename;
                if(!safe(reference)||reference.split('/').some(p=>p==='..'))fail('Legacy audio reference is missing or unsafe.');
                // Relative references are exact; plain names refer only to root audio.
                candidate=entries.get(key(reference));
                if(!candidate)fail(`Legacy audio not found at archive-relative path: ${reference}`);
            }
            if(!AUDIO.test(candidate.file.name))fail('The audio reference does not point to a supported audio filename.');
            const embedded=await readEmbeddedRecordingIdentity(candidate.file);
            if(['invalid','conflicting'].includes(embedded.status)||embedded.issues?.some(i=>i.code==='read-failed'))fail('Audio identity cannot be used safely: '+(embedded.issues?.[0]?.message||embedded.status));
            if(record.recordingId&&embedded.status==='valid'&&!same(record.recordingId,embedded.recordingId))fail('Embedded Recording ID mismatch. Playback blocked.');
            const verified=viaList&&!!record.audioSourceId&&embedded.status==='valid'&&same(record.recordingId,embedded.recordingId);
            const message=verified?'Verified: Audio Source ID, list Recording ID and embedded Recording ID match.':viaList?'Linked through Audio Recording List; full embedded/source verification is unavailable.':'Legacy filename match; archive identity is not fully verified.';
            return {...candidate,verified,message,embeddedStatus:embedded.status};
        }
    };
}
