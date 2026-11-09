import { getWhisperConfigurationDefinitions } from "./whisperConfigurations.js";
import { runtimeIdentity } from "./runtime.js";
import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "./whisperEligibilityEvidence.js";

// Injected dependencies let isolated fixtures exercise the actual selection gate.
export function createWhisperProductionGate({ bridge = createWhisperEvidenceBridge(), contextFor = getWhisperEligibilityContext, environment = runtimeIdentity } = {}) {
    function definitionFor(request) {
        const definitions = getWhisperConfigurationDefinitions();
        const definition = definitions.find(item => item.id === request) || definitions.find(item => item.family === request && item.production.familyDefault && item.platform === (environment.operatingSystem === "ios" ? "ios" : "desktop"));
        if (!definition || !definition.operatingSystems.includes(environment.operatingSystem)) throw new Error("This Whisper configuration does not support the current platform.");
        return definition;
    }
    async function requireEligible(request) {
        const definition = definitionFor(request);
        await bridge.sync();
        const evidence = bridge.get(await contextFor(definition));
        if (evidence.status !== "eligible") throw new Error(`${definition.label} is not qualified for transcription on this browser. Open Settings and test this configuration. ${evidence.reason}`);
        return definition;
    }
    async function list() {
        await bridge.sync();
        const definitions = getWhisperConfigurationDefinitions().filter(item => item.production.familyDefault && item.operatingSystems.includes(environment.operatingSystem));
        const choices = await Promise.all(definitions.map(async definition => ({ definition, evidence: bridge.get(await contextFor(definition)) })));
        return choices.filter(item => item.evidence.status === "eligible").map(item => item.definition);
    }
    return { definitionFor, requireEligible, list };
}
export const requireWhisperProductionEligibility = request => createWhisperProductionGate().requireEligible(request);
export const listQualifiedWhisperProductionModels = () => createWhisperProductionGate().list();
