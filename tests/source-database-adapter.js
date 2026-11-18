// Import-map boundary: never open the real Memora database from this harness.
import { createDatabaseManager } from '../js/database.js?isolated-source-test';
export { createDatabaseManager, DATABASE_VERSION } from '../js/database.js?isolated-source-test';
export const testRecoveryDatabaseName=`Memora-source-integration-test-${crypto.randomUUID()}`;
const manager=createDatabaseManager({name:testRecoveryDatabaseName});
export const openMemoraDatabase=()=>manager.open();
