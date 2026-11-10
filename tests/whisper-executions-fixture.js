// Import a distinct URL to bypass the import-map substitution for the fixture owner.
import { createWhisperExecutionJournal as createJournal } from "../js/whisperExecutions.js?fixture-owner";
const data = new Map();
const storage = { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
export const createWhisperExecutionJournal = () => createJournal({ storage });
