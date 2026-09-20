// --------------------------------------------------
// M4A metadata
// --------------------------------------------------

export async function readM4AMetadata(file) {

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
                        date:
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


function extractVoiceMemoUUID(
    arrayBuffer
) {

    const bytes =
        new Uint8Array(
            arrayBuffer
        );

    const text =
        new TextDecoder(
            "latin1"
        ).decode(bytes);

    const marker =
        "voice-memo-uuid";

    const markerIndex =
        text.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const searchArea =
        text.slice(
            markerIndex,
            markerIndex + 200
        );

    const uuidMatch =
        searchArea.match(
            /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
        );

    return uuidMatch ?
        uuidMatch[0] :
        null;
}
