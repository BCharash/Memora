// Page-session access only. Folder identities describe granted access, not paths
// that let a browser navigate to an unselected parent.
const key = value => value.normalize('NFC').toLowerCase();
export function transcriptSaveLocation(source, childFolder) {
    const folder = [source.parentAudioName, source.name, childFolder].filter(Boolean).join(' / ');
    return {
        folder,
        parentHint: source.parentAudioName ? '' : childFolder
            ? ` Check the parent of “${source.name}” in Files.`
            : ' Check that it is under the correct parent in Files.'
    };
}

export function transcriptReplacementGuidance(source, filename) {
    const { folder, parentHint } = transcriptSaveLocation(source);
    return {
        folder, parentHint,
        before: `In Save to Files, save “${filename}” and choose Replace if offered. Files can keep a numbered copy without asking.`,
        after: `Transcript shared. In Files, check the edited text in “${filename}” in ${folder}. A numbered copy does not replace the original.${parentHint}`
    };
}

export function renderSaveDestination(container, { before, folder, parentHint }) {
    const path = document.createElement('strong');
    path.className = 'save-destination-path';
    path.textContent = folder;
    container.replaceChildren(before, path, parentHint.trim());
}

export function rebaseTranscriptFolder(root, name) {
    const prefix = `${root.name}/${name}/`;
    const files = root.files.filter(file => file.webkitRelativePath?.startsWith(prefix) &&
        !file.webkitRelativePath.slice(prefix.length).includes('/')).map(file => {
        const snapshot = new File([file], file.name, {type:file.type,lastModified:file.lastModified});
        Object.defineProperty(snapshot, 'webkitRelativePath', {value:`${name}/${file.name}`});
        return snapshot;
    });
    return {kind:'file-input',name,files,selectionScope:root.selectionScope, parentAudioName:root.name};
}
export async function discoverTranscriptFolders(root) {
    const folders=[];
    if(root.kind==='directory') {
        // Only enumerate immediate directory handles. Do not read every nested
        // transcript, index, ZIP or audio file merely to offer folder choices.
        for await(const [name,handle] of root.entries()) if(handle.kind==='directory') folders.push({name,source:handle});
    } else if(root.kind==='file-input') {
        const names=new Set();
        for(const file of root.files) {
            const parts=file.webkitRelativePath?.split('/');
            if(parts?.length===3 && parts[0]===root.name) names.add(parts[1]);
        }
        for(const name of names) folders.push({name,source:rebaseTranscriptFolder(root,name)});
    } else throw Error('Select an Audio Source folder.');
    return folders.sort((a,b)=>a.name.localeCompare(b.name));
}
export function createSharedFolderSelection() {
    let audio=null,transcript=null,folders=[],audioFiles=[],audioRecords=[];
    return {
        snapshot:()=>({audio,transcript,folders:[...folders]}),
        setAudio(source,children,files,inventory) {
            if(!Array.isArray(inventory?.records))throw new TypeError('Audio inventory records are missing. Reopen the Audio Source folder.');
            audio=source;folders=children;audioFiles=files;audioRecords=inventory.records;
            const defaults=folders.filter(folder=>key(folder.name)==='transcription');
            transcript=defaults.length===1?{...defaults[0],label:`${source.name} / ${defaults[0].name}`}:null;
        },
        setTranscript(source,label=source.name) {transcript={name:source.name,source,label};},
        audioLabel:()=>audio?.name||'None Selected',
        transcriptLabel:()=>transcript?.label||'None Selected',
        // Look up by Recording ID first, not basename. Membership is prepared by
        // the audio workflow; playback still verifies the actual embedded/sample ID.
        resolveAudio(record) {
            if(!audio)return null;
            const id=record.recordingId||record.voiceMemoId;
            let paths;
            if(id) paths=audioRecords.filter(item=>key(item.recordingId)===key(id)).map(item=>item.audioRelativePath);
            else paths=audioFiles.filter(file=>key(file.name)===key(record.recordingFilename||'')).map(file=>file.name);
            if(paths.length>1)throw Error('Several audio files have this Recording ID. Select the correct recording explicitly.');
            const wanted=paths[0];if(!wanted)return null;
            const matches=audioFiles.filter(file=>key(file.webkitRelativePath?file.webkitRelativePath.split('/').slice(1).join('/'):file.name)===key(wanted));
            if(matches.length>1)throw Error('The selected audio location is ambiguous.');
            return matches[0]||null;
        }
    };
}
export const sharedFolders=createSharedFolderSelection();
