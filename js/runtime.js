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

function detectBrowser() {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";

    if (/Edg\//i.test(ua)) return "Microsoft Edge";
    if (/OPR\//i.test(ua)) return "Opera";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";

    return "Unknown";
}

// Compatibility report: identity comes from the shared startup snapshot.
// Capabilities are live observations; model execution belongs to its own run.
export function getRuntimeInfo() {
    const platformLabels = {
        ios: "iOS / iPadOS", android: "Android", windows: "Windows",
        macos: "macOS", linux: "Linux", unknown: "Unknown"
    };
    const deviceLabels = {
        phone: "Phone", tablet: "Tablet", desktop: "Desktop", unknown: "Unknown"
    };

    return {
        ...runtimeIdentity,
        platform: platformLabels[runtimeIdentity.operatingSystem],
        browser: detectBrowser(),
        deviceType: deviceLabels[runtimeIdentity.deviceType],
        webgpu: getRuntimeCapabilities().webgpu
    };
}
