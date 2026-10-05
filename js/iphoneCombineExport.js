export function initIPhoneCombineExportUI({
    getTranscriptFileCount,
    onExportRequested
}) {
    const formatSelect =
        document.getElementById("iphoneCombineFormatSelect");
    const exportButton =
        document.getElementById("iphoneCombineExportButton");
    const exportStatus =
        document.getElementById("iphoneCombineExportStatus");

    let busy = false;

    function getFormat() {
        if (!formatSelect) {
            return "text";
        }

        return formatSelect.value || "text";
    }

    function getFormatLabel() {
        const labels = {
            text: "TXT",
            docx: "DOCX",
            html: "HTML"
        };

        return labels[getFormat()] || "TXT";
    }

    function updateButton() {
        if (!exportButton) {
            return;
        }

        exportButton.textContent =
            `Save ${getFormatLabel()} to Files`;
        exportButton.disabled =
            busy || getTranscriptFileCount() === 0;
    }

    function reset() {
        updateButton();

        if (exportStatus) {
            exportStatus.textContent =
                `Ready to share ${getFormatLabel()}`;
        }
    }

    function setBusy(isBusy) {
        busy = isBusy;
        updateButton();
    }

    async function exportFile(file) {
        if (!file) {
            return;
        }

        const formatLabel = getFormatLabel();
        updateButton();

        if (!navigator.share) {
            if (exportStatus) {
                exportStatus.textContent =
                    "This iPhone browser cannot share files.";
            }
            return;
        }

        const shareData = { files: [file] };

        if (navigator.canShare && !navigator.canShare(shareData)) {
            if (exportStatus) {
                exportStatus.textContent =
                    `This browser cannot share the ${formatLabel} file.`;
            }
            return;
        }

        try {
            await navigator.share(shareData);

            if (exportStatus) {
                exportStatus.textContent = `${formatLabel} shared`;
            }

            updateButton();
        } catch (error) {
            if (error.name === "AbortError") {
                if (exportStatus) {
                    exportStatus.textContent =
                        `${formatLabel} ready to save`;
                }

                updateButton();
                return;
            }

            console.error("iPhone combined file export error:", error);

            if (exportStatus) {
                exportStatus.textContent =
                    `Unable to share the ${formatLabel} file.`;
            }

            updateButton();
        }
    }

    if (formatSelect) {
        formatSelect.addEventListener("change", reset);
    }

    if (exportButton) {
        exportButton.addEventListener("click", () => {
            onExportRequested(getFormat());
        });
    }

    reset();

    return {
        exportFile,
        getFormat,
        reset,
        setBusy,
        updateButton
    };
}
