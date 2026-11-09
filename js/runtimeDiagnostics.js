import { APP_BUILD } from "./build-info.js";
const PREFIX = "memora.runtime-diagnostics.v1.";
const MAX_PAGES = 6;
const MAX_EVENTS = 100;

// No storage access or listeners on import. Diagnostics are best-effort and
// must never stop inference, alter navigation or claim memory reclamation.
export function createRuntimeDiagnostics({ storage, pageId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, now = () => new Date().toISOString(), monotonic = () => globalThis.performance?.now() ?? null, navigation = {} } = {}) {
    let error = null, sequence = 0;
    if (storage === undefined) { try { storage = globalThis.localStorage; } catch (failure) { error = failure.message; } }
    const page = { schemaVersion: 1, pageId, build: APP_BUILD, startedAt: now(), navigation, events: [] };
    function record(type, details = {}) {
        try {
            // Callers supply only small identifiers/statuses, never audio/text.
            const safeDetails = Object.fromEntries(Object.entries(details).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 400) : value]));
            page.events.push({ sequence: ++sequence, at: now(), elapsedMs: monotonic(), type, ...safeDetails });
            page.events = page.events.slice(-MAX_EVENTS);
            if (!storage) throw new Error("Diagnostic storage unavailable.");
            storage.setItem(PREFIX + pageId, JSON.stringify(page));
            error = null;
        } catch (failure) { error = failure.message || String(failure); }
    }
    function snapshot(originPageId = null) {
        const pages = [], unavailablePages = [];
        try {
            if (storage) for (let i=0; i<storage.length; i++) {
                const key = storage.key(i);
                if (!key?.startsWith(PREFIX) || key === PREFIX + pageId) continue;
                try { const value = JSON.parse(storage.getItem(key)); if (value?.schemaVersion === 1 && Array.isArray(value.events)) pages.push(value); else unavailablePages.push(key.slice(PREFIX.length)); }
                catch { unavailablePages.push(key.slice(PREFIX.length)); }
            }
        } catch (failure) { error = failure.message || String(failure); }
        pages.push(structuredClone(page));
        pages.sort((a,b) => a.pageId === pageId ? -1 : b.pageId === pageId ? 1 : b.startedAt.localeCompare(a.startedAt));
        const retained = pages.slice(0, MAX_PAGES);
        return { schemaVersion: 1, capturedAt: now(), currentPageId: pageId, attemptPageId: originPageId, attemptPageAvailable: originPageId ? retained.some(item => item.pageId === originPageId) : null,
            persistenceError: error, unavailablePages, limits: { pages: MAX_PAGES, eventsPerPage: MAX_EVENTS },
            note: "Export-time observations; missing lifecycle events do not establish a crash cause. Worker termination does not prove memory reclamation. Older pages/events may be pruned.", pages: retained };
    }
    record("page-start", navigation);
    // Separate page keys avoid competing tabs overwriting one shared event log.
    try {
        const entries = snapshot().pages;
        const keys = [];
        if (storage) for (let i=0; i<storage.length; i++) { const key=storage.key(i); if (key?.startsWith(PREFIX)) keys.push(key); }
        const keep = new Set(entries.map(item => PREFIX + item.pageId));
        for (const key of keys) if (!keep.has(key)) storage.removeItem(key);
    } catch (failure) { error = failure.message || String(failure); }
    return { pageId, record, snapshot };
}

let logger = null, listening = false;
export function startRuntimeDiagnostics() {
    if (!logger) {
        const entry = globalThis.performance?.getEntriesByType?.("navigation")?.[0];
        logger = createRuntimeDiagnostics({ navigation: { type: entry?.type || "unknown", timeOrigin: globalThis.performance?.timeOrigin ?? null, wasDiscarded: typeof document?.wasDiscarded === "boolean" ? document.wasDiscarded : "unavailable" } });
    }
    if (!listening && typeof window !== "undefined") {
        listening = true;
        window.addEventListener("pagehide", event => logger.record("pagehide", { persisted: event.persisted }));
        window.addEventListener("pageshow", event => logger.record("pageshow", { persisted: event.persisted }));
        document.addEventListener("visibilitychange", () => logger.record("visibility-change", { visibility: document.visibilityState }));
        window.addEventListener("error", event => logger.record("page-error", { message: event.message || "Resource or script error", line: event.lineno ?? null }));
        window.addEventListener("unhandledrejection", event => logger.record("unhandled-rejection", { message: event.reason?.message || String(event.reason) }));
    }
    return logger;
}
export function recordRuntimeDiagnostic(type, details) {
    try { startRuntimeDiagnostics().record(type, details); } catch { /* Diagnostics cannot interrupt navigation or cleanup. */ }
}
export function getRuntimeDiagnosticReport(pageId) {
    try { return startRuntimeDiagnostics().snapshot(pageId); }
    catch (error) { return { schemaVersion: 1, persistenceError: error.message || String(error), pages: [], note: "Runtime diagnostic capture unavailable; test result is independent." }; }
}
