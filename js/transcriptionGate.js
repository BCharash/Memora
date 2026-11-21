// Settings has its own route; only primary-tab departure guards unused setup.
export function createTranscriptionGate(){let enabled=false,guarded=false;return {activity(){enabled=true;guarded=false;},leave(){if(!enabled)guarded=true;},snapshot:()=>({enabled,guarded})};}
