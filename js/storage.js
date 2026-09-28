// --------------------------------------------------
// Storage
// --------------------------------------------------
//
// Platform-specific file and folder access lives here.
//

export async function selectFolder() {

    if (window.showDirectoryPicker) {
        return window.showDirectoryPicker({
            mode: "readwrite"
        });
    }

    if ("webkitdirectory" in document.createElement("input")) {

        const input =
            document.createElement("input");

        input.type = "file";
        input.webkitdirectory = true;
        input.multiple = true;

        const files = await new Promise((resolve, reject) => {

            input.addEventListener(
                "change",
                () => resolve(Array.from(input.files || [])),
                { once: true }
            );

            input.addEventListener(
                "cancel",
                () => reject(
                    new DOMException(
                        "The folder selection was cancelled.",
                        "AbortError"
                    )
                ),
                { once: true }
            );

            input.click();
        });

        return {
            kind: "file-input",
            name:
                files[0]?.webkitRelativePath?.split("/")[0] ||
                "Selected Folder",
            files
        };
    }

    throw new Error(
        "Folder selection is not supported by this browser."
    );
}


export async function listAudioFiles(directoryHandle) {

    const audioExtensions =
        /\.(m4a|mp3|wav|webm|mp4|aiff|flac|ogg)$/i;

    if (directoryHandle?.kind === "file-input") {
        return directoryHandle.files.filter(
            file => audioExtensions.test(file.name)
        );
    }

    const files = [];

    for await (
        const [name, handle]
        of directoryHandle.entries()
    ) {

        if (
            handle.kind === "file" &&
            audioExtensions.test(name)
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
