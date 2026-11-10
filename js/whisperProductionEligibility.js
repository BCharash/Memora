import { selectWhisperConfigurationDefinition, listWhisperConfigurations } from "./whisperConfigurations.js";
import { runtimeIdentity } from "./runtime.js";
import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "./whisperEligibilityEvidence.js";

// Injected dependencies let isolated fixtures exercise the actual selection gate.
export function createWhisperProductionGate({ bridge = createWhisperEvidenceBridge(), contextFor = getWhisperEligibilityContext, environment = runtimeIdentity } = {}) {
    function definitionFor(request) {
        const selected = selectWhisperConfigurationDefinition(request, environment);
        if (!selected.ok) throw new Error(selected.reason);
        return selected.configuration;
    }
    async function refreshEvidence() {
        if (bridge.productionEvidenceRevision !== 1) throw new Error("Model eligibility support is out of date. Reload Memora before transcribing.");
        await bridge.sync();
    }
    async function requireEligible(request) {
        const definition = definitionFor(request);
        await refreshEvidence();
        const evidence = bridge.get(await contextFor(definition));
        if (evidence.status !== "eligible") throw new Error(`${definition.label} is not qualified for transcription on this browser. Open Settings and test this configuration. ${evidence.reason}`);
        return definition;
    }
    async function list() {
        await refreshEvidence();
        const definitions = listWhisperConfigurations(environment, { purpose: "production" }).filter(item => item.production.familyDefault);
        const choices = await Promise.all(definitions.map(async definition => ({ definition, evidence: bridge.get(await contextFor(definition)) })));
        return choices.filter(item => item.evidence.status === "eligible").map(item => item.definition);
    }
    return { definitionFor, requireEligible, list };
}
export const requireWhisperProductionEligibility = request => createWhisperProductionGate().requireEligible(request);
export const listQualifiedWhisperProductionModels = () => createWhisperProductionGate().list();
