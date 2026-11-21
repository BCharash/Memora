// Settings has its own route. Unused setup is guarded on return only after a
// transcript source/destination has actually been selected elsewhere.
export function createTranscriptionGate(){
    let enabled=false,departed=false,hasTranscriptSource=false;
    return {
        activity(){enabled=true;departed=false;},
        leave(){if(!enabled)departed=true;},
        setTranscriptSource(selected){hasTranscriptSource=!!selected;},
        snapshot:()=>({enabled,guarded:!enabled&&departed&&hasTranscriptSource})
    };
}
