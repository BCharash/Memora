import { createDatabaseManager } from "../js/database.js";

const output = document.getElementById("results");
const prefix = `Memora-schema-test-${Date.now()}-${Math.random().toString(36).slice(2)}-`;
const names = [];
const connections = new Set();
const lines = [];
let result = "failed";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error("aborted"));
    });
}
function nameFor(label) { const name = prefix + label; names.push(name); return name; }
async function rawOpen(name, version, upgrade) {
    assert(name.startsWith(prefix), "Fixture name required");
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => upgrade?.(request.result, request.transaction);
    const db = await requestResult(request);
    connections.add(db);
    return db;
}
async function managedOpen(manager) { const db = await manager.open(); connections.add(db); return db; }
function fixture(db, { registry = true, indexes = true, incompatible = false } = {}) {
    db.createObjectStore("transcripts", { keyPath: incompatible ? "wrong" : "filename" }).put(
        incompatible ? { wrong: "original", text: "retain" } : { filename: "original.txt", transcript: "retain" }
    );
    const entries = db.createObjectStore("semanticEntries", { keyPath: "id" });
    if (indexes) {
        entries.createIndex("representationKey", "representationKey");
        entries.createIndex("sourceKey", "sourceKey");
    }
    entries.put({ id: "embedding", representationKey: "r", sourceKey: "s", embedding: new Float32Array([1, 2, 3]).buffer });
    db.createObjectStore("semanticMetadata", { keyPath: "key" }).put({ key: "keep", value: 42 });
    if (registry) db.createObjectStore("modelRegistry", { keyPath: "id" }).put({ id: "tiny", validation: { status: "passed" } });
    db.createObjectStore("extra", { keyPath: "id" }).put({ id: "unknown", value: "preserve" });
}
async function records(db, store) {
    const tx = db.transaction(store);
    const done = transactionDone(tx);
    const values = await requestResult(tx.objectStore(store).getAll());
    await done;
    return values;
}
async function preserved(db, registry) {
    assert((await records(db, "transcripts"))[0].transcript === "retain", "transcript preserved");
    const embedding = (await records(db, "semanticEntries"))[0].embedding;
    assert(JSON.stringify([...new Float32Array(embedding)]) === "[1,2,3]", "binary embedding preserved");
    assert((await records(db, "semanticMetadata"))[0].value === 42, "metadata preserved");
    assert((await records(db, "extra"))[0].value === "preserve", "unknown store preserved");
    const results = await records(db, "modelRegistry");
    assert(registry ? results[0].validation.status === "passed" : results.length === 0, "registry evidence or empty new store");
}
async function rejects(action, expected) {
    try { await action(); } catch (error) { assert(error.name === expected, `${error.name}, expected ${expected}`); return; }
    throw new Error(`Expected ${expected}`);
}
async function test(label, action) {
    await action(); lines.push(`PASS ${label}`); output.textContent = lines.join("\n");
}

try {
    await test("Fresh database and independent concurrent connections", async () => {
        const manager = createDatabaseManager({ name: nameFor("fresh") });
        const [a, b] = await Promise.all([managedOpen(manager), managedOpen(manager)]);
        assert(a !== b && a.version === 5 && a.objectStoreNames.length === 4, "fresh schema and separate connections");
        a.close();
        assert((await records(b, "transcripts")).length === 0, "closing one connection leaves another usable");
        b.close();
    });
    await test("Empty version 1 upgraded", async () => {
        const name = nameFor("empty"); (await rawOpen(name, 1)).close();
        const db = await managedOpen(createDatabaseManager({ name }));
        assert(db.version === 5 && db.objectStoreNames.length === 4, "empty schema repaired"); db.close();
    });
    for (const [label, options] of [["healthy", {}], ["missing-registry", { registry: false }], ["missing-indexes", { indexes: false }]]) {
        await test(`Version 4 ${label}: schema and exact fixture preservation`, async () => {
            const name = nameFor(label); (await rawOpen(name, 4, db => fixture(db, options))).close();
            const db = await managedOpen(createDatabaseManager({ name }));
            assert(db.version === 5, "version upgraded");
            const tx = db.transaction("semanticEntries"); const done = transactionDone(tx);
            assert(tx.objectStore("semanticEntries").indexNames.length === 2, "indexes present"); await done;
            await preserved(db, options.registry !== false); db.close();
        });
    }
    await test("Incompatible schema aborts upgrade and preserves version/data", async () => {
        const name = nameFor("incompatible");
        (await rawOpen(name, 4, db => fixture(db, { registry: false, incompatible: true }))).close();
        await rejects(() => createDatabaseManager({ name }).open(), "SchemaError");
        const db = await rawOpen(name, 4);
        assert(db.version === 4 && !db.objectStoreNames.contains("modelRegistry"), "upgrade rolled back");
        assert((await records(db, "transcripts"))[0].text === "retain", "original incompatible data preserved"); db.close();
    });
    await test("Current version missing a store reports SchemaError", async () => {
        const name = nameFor("partial-current"); (await rawOpen(name, 5, db => fixture(db, { registry: false }))).close();
        await rejects(() => createDatabaseManager({ name }).open(), "SchemaError");
    });
    await test("Future version is refused without downgrade", async () => {
        const name = nameFor("future"); (await rawOpen(name, 6, db => fixture(db))).close();
        await rejects(() => createDatabaseManager({ name }).open(), "VersionError");
        const db = await rawOpen(name, 6); await preserved(db, true); db.close();
    });
    await test("Blocked upgrade rejects, late request aborts, retry succeeds", async () => {
        const name = nameFor("blocked"); const legacy = await rawOpen(name, 4, db => fixture(db));
        const manager = createDatabaseManager({ name });
        await rejects(() => manager.open(), "DatabaseBlockedError");
        legacy.close();
        // The queued read waits for the abandoned upgrade request to abort.
        const unchanged = await rawOpen(name, 4);
        assert(unchanged.version === 4, "abandoned request did not upgrade"); unchanged.close();
        const db = await managedOpen(manager); await preserved(db, true); db.close();
    });
    await test("Versionchange closes connections; future opens refuse newer version", async () => {
        const name = nameFor("versionchange"); const manager = createDatabaseManager({ name });
        await managedOpen(manager);
        const db = await rawOpen(name, 6); db.close();
        await rejects(() => manager.open(), "VersionError");
    });
    await test("Unavailable storage and retry after an injected open failure", async () => {
        await rejects(() => createDatabaseManager({ indexedDB: null }).open(), "StorageUnavailableError");
        const name = nameFor("retry"); let first = true;
        const manager = createDatabaseManager({ name, indexedDB: { open(...args) {
            if (first) { first = false; throw new DOMException("Injected denial", "SecurityError"); }
            return indexedDB.open(...args);
        } } });
        await rejects(() => manager.open(), "SecurityError");
        const db = await managedOpen(manager); db.close();
    });
    result = "passed";
    lines.push("ALL TESTS PASSED");
} catch (error) {
    lines.push(`FAIL ${error.stack || error}`);
} finally {
    for (const db of connections) db.close();
    for (const name of names) {
        // Never delete the user's database, even if fixture code changes.
        if (!name.startsWith(prefix)) throw new Error("Unsafe test cleanup");
        await requestResult(indexedDB.deleteDatabase(name));
    }
    output.textContent = lines.join("\n");
    document.body.dataset.result = result;
}
