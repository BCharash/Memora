const SAVE_TIME_TOLERANCE_MS = 120000;
const numberedSuffix = /(?:\s*\(\d+\)| \d+|-\d+)$/;

function siblingName(name) {
    const dot = name.lastIndexOf(".");
    const stem = dot < 0 ? name : name.slice(0, dot);
    return stem.replace(numberedSuffix, "") + (dot < 0 ? "" : name.slice(dot));
}

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

export async function checkFileSave(selection, receipt) {
    const { source, file, startedAt, returnedAt } = receipt;
    const files = candidateFiles(selection, source);
    const expected = await file.text();
    const exact = files.find(candidate => candidate.name === file.name);
    const exactMatch = exact && await exact.text() === expected;
    let duplicate;
    if (!exactMatch) {
        for (const candidate of files) {
            if (candidate !== exact && siblingName(candidate.name) === siblingName(file.name) &&
                await candidate.text() === expected) {
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

export function attachSaveVerification(container, receipt) {
    if (!container || !receipt) return;
    const button = document.createElement("button");
    const status = document.createElement("span");
    button.type = "button";
    button.className = "verify-files-button";
    button.textContent = "Verify in Files";
    status.className = "file-verification-status";
    status.setAttribute("role", "status");
    container.append(button, status);
    button.onclick = async () => {
        button.disabled = true;
        try {
            const selection = await receipt.selectFolder();
            if (selection.kind !== "file-input") throw new Error("Choose the transcript folder through Files.");
            const result = await checkFileSave(selection, receipt);
            const time = result.modifiedAt ? new Date(result.modifiedAt).toLocaleString() : null;
            const timestamp = time
                ? ` Modified ${time} (${result.recent ? "around the save attempt" : "outside the save window"}).`
                : "";
            if (result.exact) {
                status.textContent = `Verified “${receipt.file.name}” has the saved contents.${timestamp}`;
                await receipt.onVerified?.(result.exact);
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
