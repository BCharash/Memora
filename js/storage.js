// --------------------------------------------------
// Storage
// --------------------------------------------------
//
// Platform-specific file and folder access lives here.
//

export async function selectFolder() {

    if (!window.showDirectoryPicker) {
        throw new Error(
            "Folder selection is not supported by this browser."
        );
    }

    return window.showDirectoryPicker({
        mode: "readwrite"
    });
}


export async function listM4AFiles(directoryHandle) {

    const files = [];

    for await (
        const [name, handle]
        of directoryHandle.entries()
    ) {

        if (
            handle.kind === "file" &&
            /\.m4a$/i.test(name)
        ) {
            files.push(
                await handle.getFile()
            );
        }
    }

    return files;
}


export async function listTextFiles(directoryHandle) {

    const files = [];

    for await (
        const [name, handle]
        of directoryHandle.entries()
    ) {

        if (
            handle.kind === "file" &&
            /\.txt$/i.test(name)
        ) {
            files.push(
                await handle.getFile()
            );
        }
    }

    return files;
}


export async function getSubfolder(
    directoryHandle,
    name,
    create = false
) {

    return directoryHandle.getDirectoryHandle(
        name,
        { create }
    );
}


export async function writeTextFile(
    directoryHandle,
    filename,
    text
) {

    const fileHandle =
        await directoryHandle.getFileHandle(
            filename,
            { create: true }
        );

    const writable =
        await fileHandle.createWritable();

    try {
        await writable.write(text);
    } finally {
        await writable.close();
    }

    return fileHandle;
}


export async function writeBinaryFile(
    directoryHandle,
    filename,
    data
) {

    const fileHandle =
        await directoryHandle.getFileHandle(
            filename,
            { create: true }
        );

    const writable =
        await fileHandle.createWritable();

    try {
        await writable.write(data);
    } finally {
        await writable.close();
    }

    return fileHandle;
}


export async function fileExists(
    directoryHandle,
    filename
) {

    try {

        await directoryHandle.getFileHandle(
            filename,
            { create: false }
        );

        return true;

    } catch (error) {

        if (error.name === "NotFoundError") {
            return false;
        }

        throw error;
    }
}
