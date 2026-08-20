import assert from "node:assert/strict";
import type { GenerationRequest, GenerationResult } from "../src/contracts/gateway";
import type { OrchestrationConfig, WorkflowCheckpoint } from "../src/contracts/workflow";
import { getProfile } from "../src/config/profiles";
import { generate as realGenerate } from "../src/gateway";
import { ProviderError } from "../src/gateway/errors";
import { runWorkflow } from "../src/orchestrator";

const base = getProfile("economical");
const mock = <T extends { provider: string }>(spec: T) => ({ ...spec, provider: "mock" as const });
const config: OrchestrationConfig = {
  ...base,
  orchestrator: mock(base.orchestrator),
  analysts: base.analysts.map(mock),
  consensus: mock(base.consensus),
  synthesis: mock(base.synthesis),
};

function systemOf(req: GenerationRequest): string {
  return req.messages.find((m) => m.role === "system")?.content ?? "";
}

function stepErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isStepA(system: string): boolean {
  return /ORCHESTRATOR[\s\S]*ANALYSE A/.test(system);
}

async function main() {
  // 1) Échec de A → abandon immédiat, aucun appel downstream
  {
    let calls = 0;
    let checkpoint: WorkflowCheckpoint | undefined;
    const generate = async (req: GenerationRequest): Promise<GenerationResult> => {
      calls += 1;
      if (isStepA(systemOf(req))) {
        throw new ProviderError("empty_response", "Le fournisseur a renvoyé une réponse vide.");
      }
      return realGenerate(req);
    };
    let abortedMsg = "";
    try {
      await runWorkflow("Faut-il adopter l'IA générative dans une PME ?", config, {
        generate,
        onCheckpoint: (c) => {
          checkpoint = c;
        },
      });
      assert.fail("runWorkflow aurait dû rejeter sur l'échec de A");
    } catch (err) {
      abortedMsg = stepErrorMessage(err);
      assert.ok(abortedMsg.startsWith("Étape A"), `message attendu 'Étape A', reçu : ${abortedMsg}`);
    }
    assert.equal(calls, 1, "A en échec doit stopper avant tout appel downstream");
    assert.equal(checkpoint?.analysisA, undefined, "aucun checkpoint A attendu");
    console.log(`OK échec A : abandon immédiat (1 appel), message = ${abortedMsg}`);
  }

  // 2) Échec de AB → reprise depuis AB, A/B/C/D non rejoués
  {
    let failAB = true;
    let checkpoint: WorkflowCheckpoint | undefined;
    let analystCalls = 0;
    let aCalls = 0;
    let consolidationCalls = 0;
    const generate = async (req: GenerationRequest): Promise<GenerationResult> => {
      const system = systemOf(req);
      if (isStepA(system)) aCalls += 1;
      if (system.includes("INDEPENDENT ANALYST")) analystCalls += 1;
      if (system.includes("combined analysis")) consolidationCalls += 1;
      if (failAB && system.includes("combined analysis AB from")) {
        throw new ProviderError("network", "Connection terminated unexpectedly");
      }
      return realGenerate(req);
    };

    await assert.rejects(
      () =>
        runWorkflow("Faut-il externaliser le support client ?", config, {
          generate,
          onCheckpoint: (c) => {
            checkpoint = c;
          },
        }),
      (err) => {
        assert.ok(stepErrorMessage(err).startsWith("Étape AB"), `message attendu 'Étape AB', reçu : ${stepErrorMessage(err)}`);
        return true;
      }
    );
    assert.ok(checkpoint?.analysisA, "A doit être checkpointé");
    assert.equal(
      checkpoint?.analystAnalyses?.filter(Boolean).length,
      config.analysts.length,
      "tous les analystes doivent être checkpointés"
    );
    assert.equal(checkpoint?.consolidations?.length ?? 0, 0, "aucune consolidation réussie attendue au 1er essai");

    failAB = false;
    analystCalls = 0;
    aCalls = 0;
    consolidationCalls = 0;
    const result = await runWorkflow(
      "Faut-il externaliser le support client ?",
      config,
      { generate, onCheckpoint: (c) => { checkpoint = c; } },
      checkpoint
    );

    assert.equal(aCalls, 0, "A ne doit pas être rejoué à la reprise");
    assert.equal(analystCalls, 0, "les analyses analystes ne doivent pas être rejouées à la reprise");
    assert.equal(consolidationCalls, config.analysts.length, "les consolidations manquantes doivent être rejouées");
    assert.equal(result.consolidations.length, config.analysts.length, "toutes les consolidations présentes");
    assert.ok(result.timeline.every((t) => t.status !== "error"), "aucune entrée timeline en erreur");
    assert.ok(result.consensus.text.trim().length > 0, "consensus non vide");
    assert.ok(result.finalSynthesis.text.trim().length > 0, "synthèse finale non vide");
    console.log("OK reprise AB :", result.consolidations.map((c) => c.label).join(","), "| timeline", result.timeline.length, "entrées sans erreur");
  }

  // 3) Échec de S → reprise depuis S, révisions conservées, F rejoué une fois
  {
    let failS = true;
    let checkpoint: WorkflowCheckpoint | undefined;
    let synthesisCalls = 0;
    const generate = async (req: GenerationRequest): Promise<GenerationResult> => {
      const system = systemOf(req);
      if (system.includes("final editor of a multi-LLM consensus workflow")) synthesisCalls += 1;
      if (failS && system.includes("final arbitrator of a multi-LLM consensus workflow")) {
        throw new ProviderError("empty_response", "Le fournisseur a renvoyé une réponse vide.");
      }
      return realGenerate(req);
    };

    await assert.rejects(
      () =>
        runWorkflow("Quel CRM choisir pour une équipe de 20 personnes ?", config, {
          generate,
          onCheckpoint: (c) => {
            checkpoint = c;
          },
        }),
      (err) => {
        assert.ok(stepErrorMessage(err).startsWith("Étape S"), `message attendu 'Étape S', reçu : ${stepErrorMessage(err)}`);
        return true;
      }
    );
    assert.ok(checkpoint?.revisions && checkpoint.revisions.length > 0, "révisions checkpointées avant l'échec S");

    failS = false;
    synthesisCalls = 0;
    const result = await runWorkflow(
      "Quel CRM choisir pour une équipe de 20 personnes ?",
      config,
      { generate, onCheckpoint: (c) => { checkpoint = c; } },
      checkpoint
    );
    assert.equal(synthesisCalls, 1, "F doit être rejoué une seule fois à la reprise");
    assert.ok(result.timeline.every((t) => t.status !== "error"), "aucune entrée timeline en erreur");
    console.log("OK reprise S : révisions conservées, F rejoué une fois, timeline sans erreur");
  }

  console.log("Tous les scénarios de reprise passent.");
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});