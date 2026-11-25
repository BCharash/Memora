import { unnumberedFileName } from "./fileVersionName.js";

const SAVE_TIME_TOLERANCE_MS = 120000;

function candidateFiles(selection, source) {
    const parentMatches = !!source.parentAudioName && selection.name === source.parentAudioName;
    if (!parentMatches && selection.name !== source.name) {
        throw new Error(`Choose “${source.name}” to verify the save.`);
    }
    const prefix = parentMatches ? `${selection.name}/${source.name}/` : `${selection.name}/`;
    return selection.files.filter(file =>
        file.webkitRelativePath === prefix + file.name || (!parentMatches && !file.webkitRelativePath)
    );
}

async function compareFileSave({file, startedAt, returnedAt}, exactFiles, siblings, read) {
    const expected = await read(file);
    const exact = exactFiles.get(file.name);
    const exactMatch = exact && await read(exact) === expected;
    let duplicate;
    if (!exactMatch) {
        for (const candidate of siblings.get(unnumberedFileName(file.name)) || []) {
            if (candidate !== exact && await read(candidate) === expected) {
                duplicate = candidate;
                break;
            }
        }
    }
    const observed = duplicate || exact;
    const modifiedAt = observed?.lastModified;
    const recent = !!modifiedAt && modifiedAt >= startedAt - SAVE_TIME_TOLERANCE_MS &&
        modifiedAt <= returnedAt + SAVE_TIME_TOLERANCE_MS;
    return { exact: exactMatch ? exact : null, duplicate, observed, recent, modifiedAt };
}

export async function checkFileSaves(selection, source, receipts) {
    if (selection.kind && selection.kind !== "file-input") throw new Error("Choose the transcript folder through Files.");
    const exact = new Map(), siblings = new Map(), contents = new Map();
    for (const file of candidateFiles(selection, source)) {
        if (!exact.has(file.name)) exact.set(file.name, file);
        const key = unnumberedFileName(file.name);
        if (!siblings.has(key)) siblings.set(key, []);
        siblings.get(key).push(file);
    }
    function read(file) {
        if (!contents.has(file)) contents.set(file, file.text());
        return contents.get(file);
    }
    const results = [];
    for (const receipt of receipts) {
        results.push(await compareFileSave(receipt, exact, siblings, read));
    }
    return results;
}

export async function checkFileSave(selection, receipt) {
    return (await checkFileSaves(selection, receipt.source, [receipt]))[0];
}

export function fileSaveTimestamp(result) {
    return result.modifiedAt
        ? ` Modified ${new Date(result.modifiedAt).toLocaleString()} (${result.recent ? "around the save attempt" : "outside the save window"}).`
        : "";
}

export function attachSaveVerification(container, receipt, onConfirmed) {
    if (!container || !receipt) return;
    const button = document.createElement("button");
    const status = document.createElement("span");
    button.type = "button";
    button.className = "verify-files-button";
    button.textContent = "Verify in Files";
    button.setAttribute("aria-label", `Verify in Files: ${receipt.file.name}`);
    status.className = "file-verification-status";
    status.setAttribute("role", "status");
    container.append(button, status);
    button.onclick = async () => {
        button.disabled = true;
        try {
            const selection = await receipt.selectFolder();
            const result = await checkFileSave(selection, receipt);
            const timestamp = fileSaveTimestamp(result);
            if (result.exact) {
                status.textContent = `Verified “${receipt.file.name}” has the saved contents.${timestamp}`;
                button.remove();
                onConfirmed?.();
                try {
                    await receipt.onVerified?.(result.exact);
                } catch (error) {
                    status.textContent += ` Memora could not refresh this session. ${error.message}`;
                }
            } else if (result.duplicate) {
                status.textContent = `Files kept the saved contents as “${result.duplicate.name}”. The intended file was not replaced.${timestamp}`;
            } else if (result.observed) {
                status.textContent = `The contents of “${receipt.file.name}” do not match this save.${timestamp}`;
            } else {
                status.textContent = `“${receipt.file.name}” is missing from the folder you selected.`;
            }
        } catch (error) {
            if (error.name !== "AbortError") status.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    };
}
