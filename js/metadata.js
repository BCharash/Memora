// --------------------------------------------------
// Audio metadata
// --------------------------------------------------

const MP4_HEADER_SIZE = 16;
const UUID_SCAN_CHUNK_BYTES = 64 * 1024;
const UUID_SCAN_HEAD_BYTES = 1024 * 1024;
const UUID_CONTEXT_BYTES = 256;


export async function readAudioMetadata(file) {

    const isMP4Container =
        /\.(m4a|mp4)$/i.test(file.name);

    if (isMP4Container) {
        return readMP4Metadata(file);
    }

    return readBrowserAudioMetadata(file);
}


// --------------------------------------------------
// MP4 / M4A metadata
// --------------------------------------------------

async function readMP4Metadata(file) {

    const moovBox =
        await findTopLevelBox(
            file,
            "moov"
        );

    if (!moovBox) {
        throw new Error(
            `Could not locate the MP4 moov box in ${file.name}.`
        );
    }

    const mvhdBox =
        await findChildBox(
            file,
            moovBox,
            "mvhd"
        );

    const movieInfo =
        mvhdBox
            ? await readMovieHeader(
                file,
                mvhdBox
            )
            : {
                created: null,
                duration: null,
                timescale: null
            };

    const uuid =
        await findVoiceMemoUUID(
            file,
            moovBox
        );

    return {
        recordingDate:
            uuid && movieInfo.created
                ? movieInfo.created
                : null,

        fileCreationDate:
            movieInfo.created ||
            null,

        uuid,

        duration:
            movieInfo.duration ||
            null,

        durationTimescale:
            movieInfo.timescale ||
            null
    };
}


async function findTopLevelBox(
    file,
    wantedType
) {

    return findBoxInRange(
        file,
        0,
        file.size,
        wantedType
    );
}


async function findChildBox(
    file,
    parentBox,
    wantedType
) {

    return findBoxInRange(
        file,
        parentBox.contentOffset,
        parentBox.offset + parentBox.size,
        wantedType
    );
}


async function findBoxInRange(
    file,
    start,
    end,
    wantedType
) {

    let offset = start;

    while (offset + 8 <= end) {

        const headerBuffer =
            await file.slice(
                offset,
                Math.min(
                    file.size,
                    offset + MP4_HEADER_SIZE
                )
            ).arrayBuffer();

        const box =
            parseBoxHeader(
                new DataView(headerBuffer),
                offset,
                end
            );

        if (!box) {
            return null;
        }

        if (box.type === wantedType) {
            return box;
        }

        if (box.size <= 0) {
            return null;
        }

        offset += box.size;
    }

    return null;
}


function parseBoxHeader(
    view,
    offset,
    parentEnd
) {

    if (view.byteLength < 8) {
        return null;
    }

    let size =
        view.getUint32(0);

    const type =
        readFourCC(
            view,
            4
        );

    let headerSize = 8;

    if (size === 1) {

        if (view.byteLength < 16) {
            return null;
        }

        size =
            readUint64AsNumber(
                view,
                8
            );

        headerSize = 16;

    } else if (size === 0) {

        size =
            parentEnd - offset;
    }

    if (
        size < headerSize ||
        offset + size > parentEnd
    ) {
        return null;
    }

    return {
        type,
        offset,
        size,
        headerSize,
        contentOffset:
            offset + headerSize
    };
}


async function readMovieHeader(
    file,
    mvhdBox
) {

    const buffer =
        await file.slice(
            mvhdBox.offset,
            mvhdBox.offset + mvhdBox.size
        ).arrayBuffer();

    const view =
        new DataView(buffer);

    if (view.byteLength < 24) {
        return {
            created: null,
            duration: null,
            timescale: null
        };
    }

    const version =
        view.getUint8(
            mvhdBox.headerSize
        );

    if (version === 0) {

        const creationSeconds =
            view.getUint32(
                mvhdBox.headerSize + 4
            );

        const timescale =
            view.getUint32(
                mvhdBox.headerSize + 12
            );

        const duration =
            view.getUint32(
                mvhdBox.headerSize + 16
            );

        return buildMovieInfo(
            creationSeconds,
            duration,
            timescale
        );
    }

    if (version === 1) {

        if (view.byteLength < mvhdBox.headerSize + 32) {
            return {
                created: null,
                duration: null,
                timescale: null
            };
        }

        const creationSeconds =
            readUint64AsNumber(
                view,
                mvhdBox.headerSize + 4
            );

        const timescale =
            view.getUint32(
                mvhdBox.headerSize + 20
            );

        const duration =
            readUint64AsNumber(
                view,
                mvhdBox.headerSize + 24
            );

        return buildMovieInfo(
            creationSeconds,
            duration,
            timescale
        );
    }

    return {
        created: null,
        duration: null,
        timescale: null
    };
}


function buildMovieInfo(
    creationSeconds,
    duration,
    timescale
) {

    const created =
        creationSeconds
            ? new Date(
                Date.UTC(1904, 0, 1) +
                creationSeconds * 1000
            )
            : null;

    return {
        created,
        duration: duration || null,
        timescale: timescale || null
    };
}


// --------------------------------------------------
// Apple Voice Memo UUID
// --------------------------------------------------

async function findVoiceMemoUUID(
    file,
    moovBox
) {

    const markerBytes =
        new TextEncoder().encode(
            "voice-memo-uuid"
        );

    const headEnd =
        Math.min(
            file.size,
            UUID_SCAN_HEAD_BYTES
        );

    let markerOffset =
        await findByteSequenceInFileRange(
            file,
            0,
            headEnd,
            markerBytes
        );

    if (markerOffset === -1) {
        markerOffset =
            await findByteSequenceInFileRange(
                file,
                moovBox.offset,
                moovBox.offset + moovBox.size,
                markerBytes
            );
    }

    if (markerOffset === -1) {
        return null;
    }

    const contextEnd =
        Math.min(
            file.size,
            markerOffset +
            UUID_CONTEXT_BYTES
        );

    const contextBuffer =
        await file.slice(
            markerOffset,
            contextEnd
        ).arrayBuffer();

    const searchArea =
        new TextDecoder(
            "latin1"
        ).decode(
            contextBuffer
        );

    const uuidMatch =
        searchArea.match(
            /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
        );

    return uuidMatch ?
        uuidMatch[0] :
        null;
}


async function findByteSequenceInFileRange(
    file,
    start,
    end,
    needle
) {

    let position = start;
    let carry = new Uint8Array(0);

    while (position < end) {

        const chunkEnd =
            Math.min(
                end,
                position + UUID_SCAN_CHUNK_BYTES
            );

        const buffer =
            await file.slice(
                position,
                chunkEnd
            ).arrayBuffer();

        const chunk =
            new Uint8Array(buffer);

        let searchBytes = chunk;

        if (carry.length > 0) {

            searchBytes =
                new Uint8Array(
                    carry.length +
                    chunk.length
                );

            searchBytes.set(
                carry,
                0
            );

            searchBytes.set(
                chunk,
                carry.length
            );
        }

        const localIndex =
            findByteSequence(
                searchBytes,
                needle
            );

        if (localIndex !== -1) {
            return (
                position -
                carry.length +
                localIndex
            );
        }

        const carryLength =
            Math.min(
                needle.length - 1,
                searchBytes.length
            );

        carry =
            searchBytes.slice(
                searchBytes.length -
                carryLength
            );

        position =
            chunkEnd;
    }

    return -1;
}


function findByteSequence(
    bytes,
    needle
) {

    outer:
    for (
        let i = 0;
        i <= bytes.length - needle.length;
        i++
    ) {

        for (
            let j = 0;
            j < needle.length;
            j++
        ) {

            if (
                bytes[i + j] !==
                needle[j]
            ) {
                continue outer;
            }
        }

        return i;
    }

    return -1;
}


// --------------------------------------------------
// Generic browser-decodable audio
// --------------------------------------------------

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


function readUint64AsNumber(
    view,
    offset
) {

    const high =
        view.getUint32(offset);

    const low =
        view.getUint32(offset + 4);

    return (
        high * 4294967296 +
        low
    );
}
