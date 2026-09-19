const sourceButton = document.getElementById("sourceButton");
const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");

sourceButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        recordings.innerHTML = `
            <p class="empty-message">
                No recordings selected.
            </p>
        `;
        return;
    }

    recordings.innerHTML = "";

    files.forEach(file => {
        const item = document.createElement("div");

        item.className = "recording-item";
        item.textContent = file.name;

        recordings.appendChild(item);
    });
});