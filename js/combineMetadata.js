export const defaultCombineMetadata = {
    title: true,
    recordingDate: true,
    duration: false,
    whisperModel: false,
    audioRelativePath: false,
    recordingId: false,
    editedInMemora: false,
    separator: true
};

export function getCombinedMetadataFields(record) {
    return [
        ["recordingDate", "Recording date", record.recordingDate || "Date unknown"],
        ["duration", "Duration", record.duration || "Duration unknown"],
        ["whisperModel", "Whisper model", record.whisperModel || "Unknown"],
        ["audioRelativePath", "Audio Relative Path", record.audioRelativePath || "Unknown"],
        ["recordingId", "Recording ID", record.recordingId || record.voiceMemoId || "Unknown"],
        ...(record.memoraEdit?.confirmed ? [["editedInMemora", "Edited in Memora", record.memoraEdit.at.slice(0, 10)]] : [])
    ];
}
