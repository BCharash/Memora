// Canonical schema owner. Importing this module never opens a database.
// All application database opens go through this owner.
export const DATABASE_VERSION = 5;

const schema = [
    { name: "transcripts", keyPath: "filename", indexes: [] },
    { name: "semanticEntries", keyPath: "id", indexes: ["representationKey", "sourceKey"] },
    { name: "semanticMetadata", keyPath: "key", indexes: [] },
    { name: "modelRegistry", keyPath: "id", indexes: [] }
];

function schemaError(message) {
    const error = new Error(`Memora database schema: ${message}`);
    error.name = "SchemaError";
    return error;
}

function checkSchema(database, transaction, repair) {
    for (const definition of schema) {
        let store;
        if (!database.objectStoreNames.contains(definition.name)) {
            if (!repair) throw schemaError(`missing store ${definition.name}`);
            store = database.createObjectStore(definition.name, { keyPath: definition.keyPath });
        } else {
            store = transaction.objectStore(definition.name);
        }
        if (store.keyPath !== definition.keyPath || store.autoIncrement) {
            throw schemaError(`incompatible key definition for ${definition.name}; no data was reset`);
        }
        for (const name of definition.indexes) {
            if (!store.indexNames.contains(name)) {
                if (!repair) throw schemaError(`missing index ${definition.name}.${name}`);
                store.createIndex(name, name, { unique: false });
            }
            const index = store.index(name);
            if (index.keyPath !== name || index.unique || index.multiEntry) {
                throw schemaError(`incompatible index ${definition.name}.${name}; no data was reset`);
            }
        }
    }
}

// Name injection supports isolated browser fixtures; the version is fixed.
// Each returned connection belongs to the caller and must be closed by it.
export function createDatabaseManager({ name = "Memora", indexedDB: factory = globalThis.indexedDB } = {}) {
    let initialization = null;

    function openValidated() {
        return new Promise((resolve, reject) => {
            if (!factory) {
                const error = new Error("IndexedDB is unavailable; Memora data could not be opened.");
                error.name = "StorageUnavailableError";
                reject(error);
                return;
            }
            let request;
            let failure = null;
            let abandoned = false;
            try {
                request = factory.open(name, DATABASE_VERSION);
            } catch (error) {
                reject(error);
                return;
            }
            request.onblocked = () => {
                abandoned = true;
                const error = new Error("Memora database upgrade is blocked. Close other Memora tabs, then retry.");
                error.name = "DatabaseBlockedError";
                reject(error);
            };
            request.onupgradeneeded = () => {
                // A previously rejected blocked request must not later upgrade
                // the database behind the caller's back.
                if (abandoned) {
                    request.transaction.abort();
                    return;
                }
                try {
                    checkSchema(request.result, request.transaction, true);
                } catch (error) {
                    failure = error;
                    request.transaction.abort();
                }
            };
            request.onerror = () => reject(failure || request.error);
            request.onsuccess = () => {
                const database = request.result;
                if (abandoned) {
                    database.close();
                    return;
                }
                database.onversionchange = () => {
                    initialization = null;
                    database.close();
                };
                try {
                    const stores = schema.map(definition => definition.name);
                    // Validate names before constructing a transaction so a
                    // partial schema produces a useful error rather than NotFoundError.
                    for (const store of stores) {
                        if (!database.objectStoreNames.contains(store)) throw schemaError(`missing store ${store}`);
                    }
                    const transaction = database.transaction(stores, "readonly");
                    transaction.oncomplete = () => resolve(database);
                    transaction.onerror = () => {
                        database.close();
                        reject(transaction.error);
                    };
                    transaction.onabort = () => {
                        database.close();
                        reject(transaction.error || schemaError("validation transaction aborted"));
                    };
                    checkSchema(database, transaction, false);
                } catch (error) {
                    database.close();
                    reject(error);
                }
            };
        });
    }

    async function initialize() {
        if (!initialization) {
            initialization = openValidated().then(database => database.close()).catch(error => {
                initialization = null;
                throw error;
            });
        }
        await initialization;
    }

    async function open() {
        await initialize();
        try {
            return await openValidated();
        } catch (error) {
            initialization = null;
            throw error;
        }
    }

    return Object.freeze({ open });
}

const manager = createDatabaseManager();
export const openMemoraDatabase = () => manager.open();
