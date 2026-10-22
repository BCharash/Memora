// --------------------------------------------------
// Read-only, on-demand DOM diagnostics for Memora.
// This module takes a snapshot only when requested; it
// does not poll, observe mutations, or alter the DOM.
// --------------------------------------------------

function count(selector, root = document) {
    try {
        return root.querySelectorAll(selector).length;
    } catch {
        return 0;
    }
}

function maxDepth(root) {
    let maximum = 0;
    const stack = [{ node: root, depth: 0 }];

    while (stack.length) {
        const current = stack.pop();
        maximum = Math.max(maximum, current.depth);
        for (let child = current.node.lastElementChild; child; child = child.previousElementSibling) {
            stack.push({ node: child, depth: current.depth + 1 });
        }
    }

    return maximum;
}

function isVisible(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest('[hidden], [aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
}

function countVisible(root = document) {
    return Array.from(root.querySelectorAll("*")).filter(isVisible).length;
}

// Evaluate visibility inside a panel without treating the panel's own hidden
// state as if every descendant were individually hidden. This lets reports
// distinguish an inactive tab from hidden content within that tab.
function isVisibleWithinPanel(element, panel) {
    if (!(element instanceof Element)) return false;

    for (let current = element; current && current !== panel; current = current.parentElement) {
        if (current.hasAttribute("hidden") || current.getAttribute("aria-hidden") === "true") return false;
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") return false;
    }

    return true;
}

function panelIsActive(panel) {
    if (panel.hasAttribute("hidden") || panel.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(panel);
    return style.display !== "none" && style.visibility !== "hidden";
}

function browserMemory() {
    // Non-standard Chromium-only API. Safari and Firefox generally do not expose it.
    const memory = performance?.memory;
    if (!memory) return "Not exposed by this browser";

    const mb = bytes => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `Used JS heap ${mb(memory.usedJSHeapSize)} · total heap ${mb(memory.totalJSHeapSize)} · limit ${mb(memory.jsHeapSizeLimit)}`;
}

function countBreakdown(root, selector) {
    const elements = Array.from(root.querySelectorAll(selector));
    const visible = elements.filter(element => isVisibleWithinPanel(element, root)).length;
    return { total: elements.length, visible, hidden: elements.length - visible };
}

function panelDiagnostics(label, selector) {
    const panel = document.querySelector(selector);
    if (!panel) {
        return { label, selector, found: false, descendants: 0, visibleDescendants: 0, counts: [] };
    }

    const selectors = [
        ["Transcript containers", ".search-transcript-text"],
        ["Transcript paragraphs", ".search-full-transcript-paragraph"],
        ["Search result files", ".search-result-file"],
        ["Search result passages", ".search-result-passage"],
        ["Transcript editors/panels", ".search-transcript-editor, .search-transcript-editor-panel"],
        ["Textareas", "textarea"],
        ["Highlights", "mark, .search-highlight, .search-result-highlight"],
        ["Audio elements", "audio"],
        ["Buttons", "button"]
    ];

    return {
        label,
        selector,
        found: true,
        active: panelIsActive(panel),
        descendants: panel.querySelectorAll("*").length,
        visibleDescendants: Array.from(panel.querySelectorAll("*")).filter(element => isVisibleWithinPanel(element, panel)).length,
        counts: selectors.map(([name, itemSelector]) => ({
            label: name,
            ...countBreakdown(panel, itemSelector)
        }))
    };
}

export function collectDomDiagnostics() {
    const allElements = document.querySelectorAll("*");
    const byTag = {};
    for (const element of allElements) {
        const tag = element.tagName.toLowerCase();
        byTag[tag] = (byTag[tag] || 0) + 1;
    }

    const sortedTags = Object.entries(byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([tag, total]) => `${tag}: ${total}`);

    // These IDs were verified in index.html; counts are scoped to each panel.
    const panels = [
        ["Transcription panel", "#transcriptionPanel"],
        ["Combine panel", "#combinePanel"],
        ["Search panel", "#searchPanel"],
        ["Settings panel", "#settingsPanel"]
    ].map(([label, selector]) => ({ label, selector, count: count(selector) }));

    const appRoot = document.querySelector(".app-main") || document.body;
    const report = {
        timestamp: new Date().toLocaleString(),
        url: location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        document: {
            totalElements: allElements.length,
            visibleElements: countVisible(),
            maximumElementDepth: maxDepth(document.documentElement),
            bodyDescendantElements: document.body.querySelectorAll("*").length,
            appMainElements: appRoot.querySelectorAll("*").length,
            topTagCounts: sortedTags
        },
        appPanels: panels,
        panelDetails: [
            panelDiagnostics("Combine", "#combinePanel"),
            panelDiagnostics("Search", "#searchPanel")
        ],
        javascriptMemory: browserMemory(),
        notes: [
            "Panel counts are scoped to the verified #combinePanel and #searchPanel boundaries; missing panels are reported rather than guessed.",
            "Panel state identifies whether Search or Combine is currently active. Panel-level visible counts ignore the panel's own inactive state but respect hidden descendants and CSS visibility within the panel.",
            "Transcript container and paragraph counts show total, visible within the panel, and hidden within the panel.",
            "Visible DOM elements and panel visible descendants are snapshots, not proof that content was removed from memory.",
            "JavaScript heap information is browser-specific and is not a measurement of total process or GPU memory.",
            "DOM counts alone cannot establish a memory leak; compare snapshots after opening, hiding, clearing, and repeating the same workflow."
        ]
    };

    return report;
}

export function formatDomDiagnostics(report) {
    const lines = [
        "MEMORA DOM DIAGNOSTICS",
        `Captured: ${report.timestamp}`,
        `URL: ${report.url}`,
        `User agent: ${report.userAgent}`,
        `Viewport: ${report.viewport}`,
        "",
        "DOCUMENT",
        `Total DOM elements: ${report.document.totalElements}`,
        `Visible DOM elements: ${report.document.visibleElements}`,
        `Maximum element depth: ${report.document.maximumElementDepth}`,
        `Body descendants: ${report.document.bodyDescendantElements}`,
        `App main descendants: ${report.document.appMainElements}`,
        `Most common tags: ${report.document.topTagCounts.join(" · ")}`,
        "",
        "APP PANEL COUNTS",
        ...report.appPanels.map(item => `${item.label}: ${item.count} (selector: ${item.selector})`),
        "",
        "SEARCH AND COMBINE PANEL DETAILS",
        ...report.panelDetails.flatMap(panel => {
            if (!panel.found) return [`${panel.label}: PANEL NOT FOUND (${panel.selector})`, ""];
            return [
                `${panel.label} (${panel.selector})`,
                `  Panel state: ${panel.active ? "active/visible" : "inactive/hidden"}`,
                `  DOM descendants: ${panel.descendants}`,
                `  Visible within panel (ignoring whether the panel itself is active): ${panel.visibleDescendants}`,
                ...panel.counts.map(item =>
                    `  ${item.label}: total ${item.total} · visible ${item.visible} · hidden ${item.hidden}`
                ),
                ""
            ];
        }),
        `JavaScript memory: ${report.javascriptMemory}`,
        "",
        "INTERPRETATION NOTES",
        ...report.notes.map(note => `- ${note}`)
    ];
    return lines.join("\n");
}
