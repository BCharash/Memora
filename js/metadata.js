// --------------------------------------------------
// Audio metadata
// --------------------------------------------------

export async function readAudioMetadata(file) {

    const isMP4Container =
        /\.(m4a|mp4)$/i.test(file.name);

    if (isMP4Container) {
        return readMP4Metadata(file);
    }

    return readBrowserAudioMetadata(file);
}


async function readMP4Metadata(file) {

    const arrayBuffer =
        await file.arrayBuffer();

    const uuid =
        extractVoiceMemoUUID(
            arrayBuffer
        );

    const mp4boxFile =
        MP4Box.createFile();

    return new Promise(
        (resolve, reject) => {

            mp4boxFile.onReady =
                (info) => {

                    resolve({
                        recordingDate:
                            uuid && info.created
                                ? info.created
                                : null,

                        fileCreationDate:
                            info.created ||
                            null,

                        uuid:
                            uuid,

                        duration:
                            info.duration ||
                            null,

                        durationTimescale:
                            info.timescale ||
                            null
                    });
                };

            mp4boxFile.onError =
                (error) => {

                    reject(error);
                };

            arrayBuffer.fileStart = 0;

            mp4boxFile.appendBuffer(
                arrayBuffer
            );

            mp4boxFile.flush();
        }
    );
}


async function readBrowserAudioMetadata(file) {

    const arrayBuffer =
        await file.arrayBuffer();

    const audioContext =
        new AudioContext();

    try {

        const audioBuffer =
            await audioContext.decodeAudioData(
                arrayBuffer
            );

        return {
            recordingDate: null,
            fileCreationDate: null,
            uuid: null,
            duration: audioBuffer.duration,
            durationTimescale: 1
        };

    } finally {

        await audioContext.close();
    }
}


function extractVoiceMemoUUID(
    arrayBuffer
) {

    const bytes =
        new Uint8Array(
            arrayBuffer
        );

    const marker =
        "voice-memo-uuid";

    const markerBytes =
        new TextEncoder().encode(
            marker
        );

    let markerIndex = -1;

    for (
        let i = 0;
        i <= bytes.length - markerBytes.length;
        i++
    ) {

        let match = true;

        for (
            let j = 0;
            j < markerBytes.length;
            j++
        ) {

            if (bytes[i + j] !== markerBytes[j]) {
                match = false;
                break;
            }
        }

        if (match) {
            markerIndex = i;
            break;
        }
    }

    if (markerIndex === -1) {
        return null;
    }

    const searchEnd =
        Math.min(
            bytes.length,
            markerIndex + markerBytes.length + 200
        );

    const searchArea =
        new TextDecoder(
            "latin1"
        ).decode(
            bytes.subarray(
                markerIndex,
                searchEnd
            )
        );

    const uuidMatch =
        searchArea.match(
            /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
        );

    return uuidMatch ?
        uuidMatch[0] :
        null;
}
