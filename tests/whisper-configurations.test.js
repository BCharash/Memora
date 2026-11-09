import { getWhisperConfigurationDefinitions, listWhisperConfigurations, resolveWhisperConfiguration, fingerprintWhisperConfiguration } from "../js/whisperConfigurations.js";
import { getModelRegistryBaseline } from "../js/modelManager.js";
import { getWhisperSelfTestOptions } from "../js/whisperSelfTest.js";
import { runtimeIdentity } from "../js/runtime.js";

const lines = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function test(label, action) { await action(); lines.push(`PASS ${label}`); }
const canonical = value => value && typeof value === "object" && !Array.isArray(value)
    ? JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]))) : JSON.stringify(value);
const definitions = getWhisperConfigurationDefinitions();
const mac = { operatingSystem: "macos", deviceClass: "desktop" };
const ios = { operatingSystem: "ios", deviceClass: "mobile", deviceType: "tablet" };

try {
    await test("All 13 legacy IDs, repositories, labels and dtype semantics preserved", () => {
        const old = getModelRegistryBaseline();
        assert(definitions.length === 13 && new Set(definitions.map(x => x.id)).size === 13, "unique catalogue");
        assert(definitions.length === old.length, "same count");
        for (const previous of old) {
            const current = definitions.find(x => x.id === previous.id);
            assert(current, previous.id);
            for (const key of ["family", "label", "repository", "runtime", "platform"]) assert(current[key] === previous[key], `${previous.id} ${key}`);
            assert(canonical(current.loader.dtype) === canonical(previous.configuration.dtype), `${previous.id} dtype`);
        }
    });
    await test("Nested catalogue and component dtype maps cannot be mutated", () => {
        assert(Object.isFrozen(definitions), "array frozen");
        for (const d of definitions) {
            assert(Object.isFrozen(d) && Object.isFrozen(d.loader) && Object.isFrozen(d.worker) && Object.isFrozen(d.operatingSystems), "nested frozen");
            if (d.loader.dtype && typeof d.loader.dtype === "object") assert(Object.isFrozen(d.loader.dtype), "dtype frozen");
        }
        try { definitions[0].loader.device = "wasm"; } catch { /* expected in modules */ }
        assert(definitions[0].loader.device === "webgpu", "not mutated");
    });
    await test("Desktop family defaults retain Medium q4 and Large mixed precision", async () => {
        const defaults = { tiny: "tiny-webgpu-default", base: "base-webgpu-default", small: "small-webgpu-default", medium: "medium-webgpu-q4", large: "large-webgpu-fp16-q4" };
        for (const os of ["macos", "windows", "linux"]) {
            for (const [family, id] of Object.entries(defaults)) {
                const result = await resolveWhisperConfiguration(family, { operatingSystem: os });
                assert(result.ok && result.configuration.id === id, `${os} ${family}`);
                assert(result.configuration.runtimeLibrary.version === "4.0.0" && result.configuration.loader.device === "webgpu", "desktop loader");
            }
        }
    });
    await test("iOS family defaults preserve omitted device/dtype and 3.7.2", async () => {
        for (const family of ["tiny", "base", "small", "medium", "large"]) {
            const r = await resolveWhisperConfiguration(family, ios);
            assert(r.ok && r.configuration.id === `${family}-iphone-default`, family);
            assert(r.configuration.loader.device === null && r.configuration.loader.dtype === null && r.configuration.runtimeLibrary.version === "3.7.2", "iOS defaults omitted");
            assert(r.validation === "unknown" && r.configuration.repositoryRevision === null, "no support/revision claims");
        }
    });
    await test("Self-test lists match legacy option order and exclusions", () => {
        const desktop = ["tiny-webgpu-default", "base-webgpu-default", "small-webgpu-default", "medium-webgpu-fp16-q4", "medium-webgpu-q4f16", "medium-webgpu-q4", "large-webgpu-fp16-q4"];
        const mobile = ["tiny-iphone-default", "base-iphone-default", "small-iphone-default", "medium-iphone-default"];
        assert(JSON.stringify(listWhisperConfigurations(mac).map(x => x.id)) === JSON.stringify(desktop), "desktop order");
        assert(JSON.stringify(listWhisperConfigurations(ios).map(x => x.id)) === JSON.stringify(mobile), "iOS order");
        assert(JSON.stringify(listWhisperConfigurations(runtimeIdentity).map(x => x.id)) === JSON.stringify(getWhisperSelfTestOptions().map(x => x.id)), "real current environment parity");
    });
    await test("Every exact definition resolves and test exclusions remain explicit", async () => {
        for (const d of definitions) {
            const environment = d.platform === "ios" ? ios : mac;
            const r = await resolveWhisperConfiguration(d.id, environment);
            assert(r.ok && r.configuration.id === d.id && /^sha256:[a-f0-9]{64}$/.test(r.configuration.fingerprint), d.id);
            const trial = await resolveWhisperConfiguration(d.id, environment, { purpose: "self-test" });
            assert(d.test.allowed ? trial.ok : !trial.ok && trial.code === "not-testable", "manual-test policy");
        }
    });
    await test("Wrong-platform exact ID never becomes another configuration", async () => {
        assert((await resolveWhisperConfiguration("medium-webgpu-q4", ios)).code === "incompatible-environment", "desktop medium rejected on iOS");
        assert((await resolveWhisperConfiguration("tiny-iphone-default", mac)).code === "incompatible-environment", "iOS rejected on desktop");
        for (const operatingSystem of ["android", "unknown", "other"]) {
            assert(!(await resolveWhisperConfiguration("tiny", { operatingSystem })).ok, "no generic mobile/desktop inference");
        }
    });
    await test("Invalid requests/purpose/environment never silently select Tiny", async () => {
        for (const request of ["", null, undefined, 42, {}, "typo", "constructor", "__proto__"]) assert(!(await resolveWhisperConfiguration(request, mac)).ok, "bad request");
        assert(!(await resolveWhisperConfiguration("tiny", undefined)).ok, "unknown environment");
        assert((await resolveWhisperConfiguration("tiny", mac, { purpose: "typo" })).code === "invalid-purpose", "invalid purpose");
    });
    await test("Missing explicit API capabilities reject without backend substitution", async () => {
        for (const capabilities of [{ webgpu: false }, { workers: false }]) {
            assert((await resolveWhisperConfiguration("tiny", mac, { capabilities })).code === "missing-capability", "capability gate");
        }
        assert((await resolveWhisperConfiguration("tiny", ios, { capabilities: { webgpu: false, workers: true } })).ok, "iOS default does not require WebGPU");
        const r = await resolveWhisperConfiguration("tiny", mac);
        assert(r.ok && r.capabilityAssessment.includes("not verified"), "omission not capability proof");
    });
    await test("Fingerprint deterministic, key-order independent and excludes presentation/evidence", async () => {
        const d = definitions.find(x => x.id === "large-webgpu-fp16-q4");
        const base = await fingerprintWhisperConfiguration(d);
        const changed = structuredClone(d);
        changed.loader.dtype = { decoder_model_merged: "q4", encoder_model: "fp16" };
        Object.assign(changed, { label: "Renamed", updatedAt: "later", validation: { status: "passed" } });
        changed.test.allowed = !changed.test.allowed;
        assert(await fingerprintWhisperConfiguration(changed) === base, "descriptive changes excluded");
        assert(await fingerprintWhisperConfiguration(d) === base, "stable");
    });
    await test("All material execution changes produce different fingerprints", async () => {
        const d = definitions[0]; const base = await fingerprintWhisperConfiguration(d);
        const edits = [
            c => c.repository = "different/repository", c => c.repositoryRevision = "immutable-revision",
            c => c.loader.dtype = "q8", c => c.loader.device = "wasm", c => c.loader.options = { different: true },
            c => c.runtimeLibrary.version = "different", c => c.worker.script = "different-worker.js",
            c => c.worker.protocolRevision++, c => c.worker.implementationRevision++
        ];
        for (const edit of edits) { const c = structuredClone(d); edit(c); assert(await fingerprintWhisperConfiguration(c) !== base, "execution identity changed"); }
        const omitted = structuredClone(d); delete omitted.loader.dtype;
        assert(await fingerprintWhisperConfiguration(omitted) === base, "omitted/default null canonicalized");
    });
    await test("Resolved configuration is immutable and never inherits test evidence", async () => {
        const r = await resolveWhisperConfiguration("medium", mac);
        assert(Object.isFrozen(r) && Object.isFrozen(r.configuration) && Object.isFrozen(r.configuration.loader), "resolved frozen");
        assert(r.validation === "unknown" && r.provenance.includes("unpinned"), "truthful evidence/provenance");
        const repeat = await resolveWhisperConfiguration("medium", mac);
        assert(repeat.configuration.fingerprint === r.configuration.fingerprint, "repeat stable");
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`); }
document.getElementById("results").textContent = lines.join("\n");
