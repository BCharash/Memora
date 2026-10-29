// --------------------------------------------------
// Memora Runtime Detection
// --------------------------------------------------

// Device identity is independent of file access and model execution policy.
// Accept explicit signals so classification can be checked without a browser.
export function classifyRuntime({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
    const ua = String(userAgent || "");
    const hostPlatform = String(platform || "");
    const ipad = /iPad/i.test(ua) ||
        (hostPlatform === "MacIntel" && Number(maxTouchPoints) > 1);
    let operatingSystem = "unknown";

    if (/Android/i.test(ua)) operatingSystem = "android";
    else if (/iPhone|iPad|iPod/i.test(ua) || ipad) operatingSystem = "ios";
    else if (/Windows/i.test(ua) || /Win/i.test(hostPlatform)) operatingSystem = "windows";
    else if (/Macintosh/i.test(ua) || /Mac/i.test(hostPlatform)) operatingSystem = "macos";
    else if (/Linux/i.test(ua) || /Linux/i.test(hostPlatform)) operatingSystem = "linux";

    let deviceType = "unknown";
    if (/Tablet/i.test(ua) || (operatingSystem === "ios" && ipad)) deviceType = "tablet";
    else if (/iPhone|iPod/i.test(ua)) deviceType = "phone";
    // Android's usual phone marker is Mobile; its absence is a tablet heuristic.
    else if (operatingSystem === "android") deviceType = /Mobile/i.test(ua) ? "phone" : "tablet";
    else if (/Mobile|Mobi/i.test(ua)) deviceType = "phone";
    else if (["windows", "macos", "linux"].includes(operatingSystem)) deviceType = "desktop";

    const deviceClass = ["phone", "tablet"].includes(deviceType)
        ? "mobile"
        : deviceType === "desktop" ? "desktop" : "unknown";

    return Object.freeze({ operatingSystem, deviceType, deviceClass });
}

function readRuntimeIdentity() {
    try {
        if (typeof navigator === "undefined") return classifyRuntime();
        return classifyRuntime({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            maxTouchPoints: navigator.maxTouchPoints
        });
    } catch {
        return classifyRuntime();
    }
}

export const runtimeIdentity = readRuntimeIdentity();
export const isIOS = runtimeIdentity.operatingSystem === "ios";
export const isMobile = runtimeIdentity.deviceClass === "mobile";
export const isDesktop = runtimeIdentity.deviceClass === "desktop";

// Live API-presence queries: these do not establish permission, payload support,
// successful GPU initialization, or successful model execution.
export function getRuntimeCapabilities() {
    return Object.freeze({
        webgpu: typeof navigator !== "undefined" && !!navigator.gpu,
        directoryPicker: typeof window !== "undefined" && typeof window.showDirectoryPicker === "function",
        fileSharing: typeof navigator !== "undefined" && typeof navigator.share === "function",
        workers: typeof Worker !== "undefined"
    });
}

// Legacy reporting remains unchanged until consumers are migrated individually.
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
