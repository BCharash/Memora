// --------------------------------------------------
// Audio metadata
// --------------------------------------------------

const MP4_HEADER_SIZE = 16;
const UUID_HEAD_SCAN_SIZE = 1024 * 1024;
const UUID_SEARCH_CONTEXT = 200;


export async function readAudioMetadata(file) {

    const isMP4Container =
        /\.(m4a|mp4)$/i.test(file.name);

    if (isMP4Container) {
        return readMP4Metadata(file);
    }

    return readBrowserAudioMetadata(file);
}


async function readMP4Metadata(file) {

    const boxes =
        await findTopLevelBoxes(file);

    if (!boxes.moov) {
        throw new Error(
            "MP4 metadata box (moov) was not found."
        );
    }

    const ftypBuffer =
        boxes.ftyp
            ? await readFileRange(
                file,
                boxes.ftyp.start,
                boxes.ftyp.size
            )
            : null;

    const moovBuffer =
        await readFileRange(
            file,
            boxes.moov.start,
            boxes.moov.size
        );

    const uuid =
        await extractVoiceMemoUUID(
            file,
            moovBuffer
        );

    let mp4boxFile =
        MP4Box.createFile();

    const info =
        await parseMP4Metadata(
            mp4boxFile,
            ftypBuffer,
            moovBuffer
        );

    mp4boxFile.onReady = null;
    mp4boxFile.onError = null;
    mp4boxFile = null;

    return {
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
    };
}


async function parseMP4Metadata(
    mp4boxFile,
    ftypBuffer,
    moovBuffer
) {

    return new Promise(
        async (resolve, reject) => {

            let settled = false;

            const finish =
                (callback) => {

                    if (settled) {
                        return;
                    }

                    settled = true;
                    callback();
                };

            mp4boxFile.onReady =
                (info) => {

                    finish(() => {
                        resolve(info);
                    });
                };

            mp4boxFile.onError =
                (error) => {

                    finish(() => {
                        reject(error);
                    });
                };

            try {

                if (ftypBuffer) {
                    mp4boxFile.appendBuffer(
                        ftypBuffer
                    );
                }

                mp4boxFile.appendBuffer(
                    moovBuffer
                );

                mp4boxFile.flush();

            } catch (error) {

                finish(() => {
                    reject(error);
                });
            }
        }
    );
}


async function findTopLevelBoxes(file) {

    let offset = 0;
    let ftyp = null;
    let moov = null;

    while (
        offset + 8 <= file.size
    ) {

        const headerBuffer =
            await readFileRange(
                file,
                offset,
                Math.min(
                    MP4_HEADER_SIZE,
                    file.size - offset
                )
            );

        if (headerBuffer.byteLength < 8) {
            break;
        }

        const view =
            new DataView(
                headerBuffer
            );

        let size =
            view.getUint32(0);

        const type =
            readFourCC(
                view,
                4
            );

        let headerSize = 8;

        if (size === 1) {

            if (headerBuffer.byteLength < 16) {
                throw new Error(
                    "Invalid MP4 extended box header."
                );
            }

            const largeSize =
                view.getBigUint64(8);

            if (
                largeSize >
                BigInt(
                    Number.MAX_SAFE_INTEGER
                )
            ) {
                throw new Error(
                    "MP4 box size is too large."
                );
            }

            size = Number(largeSize);
            headerSize = 16;

        } else if (size === 0) {

            size =
                file.size - offset;
        }

        if (
            size < headerSize ||
            offset + size > file.size
        ) {
            throw new Error(
                `Invalid MP4 ${type} box size.`
            );
        }

        if (type === "ftyp" && !ftyp) {
            ftyp = {
                start: offset,
                size
            };
        }

        if (type === "moov") {
            moov = {
                start: offset,
                size
            };
            break;
        }

        offset += size;
    }

    return {
        ftyp,
        moov
    };
}


async function readFileRange(
    file,
    start,
    size
) {

    if (!size) {
        return new ArrayBuffer(0);
    }

    const arrayBuffer =
        await file
            .slice(start, start + size)
            .arrayBuffer();

    arrayBuffer.fileStart =
        start;

    return arrayBuffer;
}


function readFourCC(
    view,
    offset
) {

    return String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
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


async function extractVoiceMemoUUID(
    file,
    moovBuffer
) {

    const uuidFromMoov =
        findVoiceMemoUUID(
            moovBuffer
        );

    if (uuidFromMoov) {
        return uuidFromMoov;
    }

    const headSize =
        Math.min(
            UUID_HEAD_SCAN_SIZE,
            file.size
        );

    const headBuffer =
        await readFileRange(
            file,
            0,
            headSize
        );

    return findVoiceMemoUUID(
        headBuffer
    );
}


function findVoiceMemoUUID(
    arrayBuffer
) {

    const marker =
        "voice-memo-uuid";

    const decoder =
        new TextDecoder(
            "latin1"
        );

    const text =
        decoder.decode(
            arrayBuffer
        );

    const markerIndex =
        text.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const searchArea =
        text.slice(
            markerIndex,
            markerIndex + UUID_SEARCH_CONTEXT
        );

    const uuidMatch =
        searchArea.match(
            /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
        );

    return uuidMatch ?
        uuidMatch[0] :
        null;
}
