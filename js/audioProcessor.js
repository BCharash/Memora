export async function decodeAudio(file) {
    const arrayBuffer = await file.arrayBuffer();

    const audioContext = new AudioContext();

    try {
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);

        const targetSampleRate = 16000;

        if (decodedAudio.sampleRate === targetSampleRate) {
            return decodedAudio.getChannelData(0);
        }

        const duration = decodedAudio.length / decodedAudio.sampleRate;
        const targetLength = Math.ceil(duration * targetSampleRate);

        const offlineContext = new OfflineAudioContext(
            1,
            targetLength,
            targetSampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(offlineContext.destination);
        source.start(0);

        const resampledAudio = await offlineContext.startRendering();

        return resampledAudio.getChannelData(0);

    } finally {
        await audioContext.close();
    }
}