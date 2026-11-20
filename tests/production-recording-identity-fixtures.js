// Synthetic semantic embeddings only: no models or databases.
export let generated=0;
export function resetGenerated(){generated=0;}
export async function getSemanticEmbeddings({items}){generated+=items.length;return items.map(()=>new Float32Array(384).fill(0.125));}
export async function getStoredSemanticEntries(){return [];}
export async function persistSemanticEmbeddings(){}
