// Read-only parent-selection adapter. Not connected to production UI or storage.
import {parseTranscriptFile} from './combine.js';
import {createReproducibleRecordingIdentityResolver,groupRecordingIdentityCandidates} from './reproducibleRecordingIdentity.js';
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
    const identityResolver=createReproducibleRecordingIdentityResolver();
    const abort=signal=>{if(signal?.aborted)throw new DOMException('Inventory cancelled.','AbortError');};
    const readHeader=entry=>{
        if(!headers.has(entry.path))headers.set(entry.path,(async()=>{
            try{const text=await entry.file.slice(0,65536).text();const at=text.search(/^--------------------------------------------------[\t ]*(?:\r?\n|$)/m);
                // Obsolete source UUIDs do not participate in this test's identity parsing.
                const cleaned=at<0?text:text.slice(0,at).split(/\r?\n/).filter(line=>!line.startsWith('Audio Source ID:')).join('\n')+'\n'+text.slice(at);
                return {record:parseTranscriptFile(entry.file,cleaned),error:null};}
            catch(error){return {record:null,error:error.message};}
        })());return headers.get(entry.path);
    };
    return {
        rootName,
        async discover(onProgress=(_message)=>{}){
            const groups=new Map();let scanned=0;
            // Immediate transcript subfolders only; combined exports stay outside scope.
            for(const entry of entries.values()){
                const parts=entry.path.split('/');if(parts.length!==2)continue;
                if(!/\.txt$/i.test(entry.file.name))continue;
                const group=groups.get(parts[0])||{name:parts[0],transcripts:[],issues:[]};groups.set(parts[0],group);
                if(/\.txt$/i.test(entry.file.name)){
                    const result=await readHeader(entry);if(result.record)group.transcripts.push({...entry,...result});else group.issues.push({path:entry.path,error:result.error});
                    if(++scanned%16===0){onProgress(`Checked ${scanned} transcript headers…`);await new Promise(resolve=>setTimeout(resolve,0));}
                }
            }
            const folders=[...groups.values()].filter(g=>g.transcripts.length).sort((a,b)=>a.name.localeCompare(b.name));
            for(const group of folders){
                group.transcripts.sort((a,b)=>a.file.name.localeCompare(b.file.name));
                const ids=new Set(group.transcripts.map(t=>t.record.archiveUuid?.toLowerCase()).filter(Boolean));
                if(ids.size>1)group.issues.push({path:group.name,error:'Mixed Archive UUIDs: this folder is not a single verified transcript archive.'});
            }
            return folders;
        },
        async openTranscriptSelection(files,name,{relativeFolder=null}={}){
            const group={name,transcripts:[],issues:[]};const seen=new Set();
            for(const file of files){
                const parts=file.webkitRelativePath?.split('/');
                if(parts?.length!==(relativeFolder?3:2)||relativeFolder&&parts[1]!==relativeFolder)continue;
                const k=key(file.name);if(seen.has(k))fail('Ambiguous transcript filename: '+file.name);seen.add(k);
                                if(!/\.txt$/i.test(file.name))continue;
                const entry={file,path:`${name}/${file.name}`};
                let result;try{const text=await file.slice(0,65536).text();const at=text.search(/^--------------------------------------------------[\t ]*(?:\r?\n|$)/m);const cleaned=at<0?text:text.slice(0,at).split(/\r?\n/).filter(line=>!line.startsWith('Audio Source ID:')).join('\n')+'\n'+text.slice(at);result={record:parseTranscriptFile(file,cleaned),error:null};}catch(error){result={record:null,error:error.message};}
                if(result.record)group.transcripts.push({...entry,...result});else group.issues.push({path:entry.path,error:result.error});
            }
            group.transcripts.sort((a,b)=>a.file.name.localeCompare(b.file.name));
            const ids=new Set(group.transcripts.map(t=>t.record.archiveUuid?.toLowerCase()).filter(Boolean));
            if(ids.size>1)group.issues.push({path:name,error:'Mixed Archive UUIDs: this folder is not a single verified transcript archive.'});
            return group;
        },
        async preview(transcript){return (await transcript.file.slice(0,65536).text());},
        async buildInventory({onProgress=(_message)=>{},signal}={}){
            const audio=[...entries.values()].filter(entry=>!entry.path.includes('/')&&AUDIO.test(entry.file.name));
            const candidates=[];
            for(let i=0;i<audio.length;i++){
                abort(signal);onProgress(`Reading recording identity ${i+1} of ${audio.length}: ${audio[i].file.name}`);
                const identity=await identityResolver.resolve(audio[i].file,{signal});
                candidates.push({...audio[i],...identity});
                if(i%16===0)await new Promise(resolve=>setTimeout(resolve,0));
            }
            abort(signal);const index=groupRecordingIdentityCandidates(candidates);
            return {rootName,mode:'audio-metadata',candidates,...index,
                records:candidates.filter(c=>c.status==='ready').map(c=>({audioRelativePath:c.path,recordingId:c.recordingId,method:c.method,...(c.fingerprint?{sampledIdentity:c.fingerprint}:{})}))};
        },
        async resolve(transcript,{inventory}={}){
            const record=transcript.record;if(!record)fail('The transcript header could not be read.');
            const current=inventory||await this.buildInventory();let candidate=null,verified=false;
            if(record.recordingId){
                const matches=current.groups.filter(group=>same(group.recordingId,record.recordingId));
                if(!matches.length)fail('Recording ID not found among readable parent audio. No filename fallback was used. Check missing or blocked recordings in the inventory.');
                const group=matches[0];
                if(group.status==='ambiguous')fail('Ambiguous Recording ID. Available copies: '+group.candidates.map(c=>c.path).join(', '));
                candidate=group.candidates[0];verified=true;
            }else{
                // Legacy filename is only a location hint. Resolve ../ within the
                // selected root, never above it; plain filename points at root audio.
                let reference=record.audioRelativePath||record.recordingFilename;
                if(!reference||/[\\:\x00-\x1f]/.test(reference)||reference.startsWith('/'))fail('Legacy audio reference is missing or unsafe.');
                if(record.audioRelativePath){const parts=transcript.path.split('/').slice(0,-1);for(const part of reference.split('/')){if(part==='..'){if(!parts.length)fail('Legacy reference escapes selected root.');parts.pop();}else if(part!=='.'&&part)parts.push(part);}reference=parts.join('/');}
                candidate=current.candidates.find(c=>key(c.path)===key(reference));
                if(!candidate||candidate.status!=='ready')fail('Legacy audio reference is missing or its identity is blocked.');
                const group=current.groups.find(g=>same(g.recordingId,candidate.recordingId));if(group?.status==='ambiguous')fail('Ambiguous legacy audio copies: '+group.candidates.map(c=>c.path).join(', '));
            }
            const message=verified?(candidate.method==='embedded'?'Verified: transcript Recording ID matches embedded audio Recording ID.':'Matched: transcript Recording ID matches reproducible sampled fingerprint; not a full-content verification.'):'Legacy filename match only; transcript has no Recording ID. Audio was inspected but transcript identity is unverified.';
            return {...candidate,verified,message};
        }
    };
}
