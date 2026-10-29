// Import map substitution isolates production data-access modules in the test page.
import { createDatabaseManager } from "../js/database.js?isolated-test";
export const testDatabaseName = `Memora-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const manager = createDatabaseManager({ name: testDatabaseName });
export const openMemoraDatabase = () => manager.open();
