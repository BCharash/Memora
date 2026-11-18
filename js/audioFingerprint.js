// Incremental SHA-256 over raw Blob bytes. Fixed-size working buffers; no audio
// decoding and no whole-file arrayBuffer. Yield between chunks for cancellation.
const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const rotate = (x, n) => (x >>> n) | (x << (32 - n));
export function checkAudioSourceAbort(signal) {
    if (signal?.aborted) throw new DOMException('The recording-list operation was cancelled.', 'AbortError');
}
export async function fingerprintAudio(blob, { signal, chunkBytes = 256 * 1024, onProgress } = {}) {
    if (!blob || !Number.isSafeInteger(blob.size) || blob.size < 0 || typeof blob.slice !== 'function') throw new TypeError('A readable audio snapshot is required.');
    if (!Number.isInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 1024 * 1024) throw new RangeError('Hash chunks must be between 1 byte and 1 MiB.');
    const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const words = new Uint32Array(64), tail = new Uint8Array(64); let used = 0;
    function block(bytes, offset) {
        for (let i = 0; i < 16; i++) { const p = offset + i * 4; words[i] = (bytes[p] << 24) | (bytes[p+1] << 16) | (bytes[p+2] << 8) | bytes[p+3]; }
        for (let i = 16; i < 64; i++) {
            const a = words[i-15], b = words[i-2];
            words[i] = words[i-16] + (rotate(a,7)^rotate(a,18)^(a>>>3)) + words[i-7] + (rotate(b,17)^rotate(b,19)^(b>>>10));
        }
        let [a,b,c,d,e,f,g,z] = h;
        for (let i = 0; i < 64; i++) {
            const t = (z + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + K[i] + words[i]) | 0;
            const u = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
            z=g; g=f; f=e; e=(d+t)|0; d=c; c=b; b=a; a=(t+u)|0;
        }
        [a,b,c,d,e,f,g,z].forEach((value,i) => { h[i] += value; });
    }
    function update(bytes) {
        let at = 0;
        if (used) { const count = Math.min(64-used, bytes.length); tail.set(bytes.subarray(0,count),used); used+=count; at+=count; if (used===64) { block(tail,0); used=0; } }
        while (at+64<=bytes.length) { block(bytes,at); at+=64; }
        if (at<bytes.length) { tail.set(bytes.subarray(at)); used=bytes.length-at; }
    }
    checkAudioSourceAbort(signal);
    for (let at=0; at<blob.size; at+=chunkBytes) {
        checkAudioSourceAbort(signal);
        const end=Math.min(at+chunkBytes,blob.size), bytes=new Uint8Array(await blob.slice(at,end).arrayBuffer());
        if (bytes.length!==end-at) throw new Error('The audio snapshot could not be read completely.');
        checkAudioSourceAbort(signal); update(bytes); onProgress?.({ bytesRead:end, byteLength:blob.size });
        await new Promise(resolve => setTimeout(resolve,0));
    }
    checkAudioSourceAbort(signal);
    const padding=new Uint8Array(used<56 ? 64-used : 128-used); padding[0]=128;
    let bits=BigInt(blob.size)*8n;
    for (let i=padding.length-1;i>=padding.length-8;i--) { padding[i]=Number(bits&255n); bits>>=8n; }
    update(padding);
    return { algorithm:'sha256', byteLength:blob.size, digest:Array.from(h,x=>x.toString(16).padStart(8,'0')).join('') };
}
