// --------------------------------------------------
// Memora Runtime Detection
// --------------------------------------------------

function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";

    if (/Android/i.test(ua)) return "Android";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "macOS";
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return "Windows";
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";

    return "Unknown";
}

function detectBrowser() {
    const ua = navigator.userAgent || "";

    if (/Edg\//i.test(ua)) return "Microsoft Edge";
    if (/OPR\//i.test(ua)) return "Opera";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";

    return "Unknown";
}

function detectDeviceType() {
    const ua = navigator.userAgent || "";

    if (/Mobi|Android/i.test(ua)) return "Mobile";
    if (/Tablet|iPad/i.test(ua)) return "Tablet";

    return "Desktop";
}

function detectWebGPU() {
    return !!navigator.gpu;
}

export function getRuntimeInfo() {
    const platform = detectPlatform();
    const browser = detectBrowser();
    const deviceType = detectDeviceType();

    // These are the runtimes currently used by Memora.
    // Keep this description tied to the actual application architecture,
    // rather than assuming a particular operating system.
    const whisper = /iPhone|iPad|Android/i.test(navigator.userAgent || "")
        ? {
            execution: "worker",
            transformersVersion: "3.7.2",
            acceleration: "WASM"
        }
        : {
            execution: "main thread",
            transformersVersion: "4.0.0",
            acceleration: detectWebGPU() ? "WebGPU" : "WASM"
        };

    return {
        platform,
        browser,
        deviceType,
        whisper,
        webgpu: detectWebGPU()
    };
}
