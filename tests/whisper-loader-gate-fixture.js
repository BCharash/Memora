import { getWhisperConfigurationDefinitions } from "../js/whisperConfigurations.js";
export let allowed = false;
export function setAllowed(value) { allowed = value; }
export async function requireWhisperProductionEligibility(request) {
    if (!allowed) throw new Error("fixture not qualified");
    return getWhisperConfigurationDefinitions().find(item => item.id === request || item.family === request && item.production.familyDefault && item.platform === "desktop");
}
