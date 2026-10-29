import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PHASES = {
  start: "poc_kickoff --preflight",
  review: "poc_review --reviewers security,perf,ux",
  triage: "poc_analyze_feedback --auto-classify",
  decide: "poc_decide_next",
  apply: "poc_implement_approved --dry-run",
  iterate: "poc_iterate",
} as const;

const READ_ONLY_TOOLS = [
  "read",
  "grep",
  "glob",
  "find",
  "ls",
  "bash",
  "mem_search",
  "mem_get_observation",
  "mem_context",
];

const VALID_PHASES = [
  "start",
  "review",
  "triage",
  "decide",
  "apply",
  "iterate",
  "full",
] as const;

type ValidPhase = (typeof VALID_PHASES)[number];

const piNpmDir = path.join(homedir(), ".pi", "agent", "npm");
const piRequire = createRequire(path.join(piNpmDir, "package.json"));

let subagentsModules:
  | {
      registerWorkflowResource: any;
      registerSubagentCapabilityCeiling: any;
    }
  | undefined;

async function loadSubagentsModules() {
  if (subagentsModules) return subagentsModules;

  const workflowResourcesPath = piRequire.resolve(
    "pi-subagents/workflow-resources",
  );

  const capabilityCeilingPath = piRequire.resolve(
    "pi-subagents/capability-ceiling",
  );

  const [workflowResources, capabilityCeiling] = await Promise.all([
    import(pathToFileURL(workflowResourcesPath).href),
    import(pathToFileURL(capabilityCeilingPath).href),
  ]);

  if (typeof workflowResources.registerWorkflowResource !== "function") {
    throw new Error(
      "pi-subagents/workflow-resources does not export registerWorkflowResource",
    );
  }

  if (
    typeof capabilityCeiling.registerSubagentCapabilityCeiling !== "function"
  ) {
    throw new Error(
      "pi-subagents/capability-ceiling does not export registerSubagentCapabilityCeiling",
    );
  }

  subagentsModules = {
    registerWorkflowResource: workflowResources.registerWorkflowResource,
    registerSubagentCapabilityCeiling:
      capabilityCeiling.registerSubagentCapabilityCeiling,
  };

  return subagentsModules;
}

function printHelp(ctx: ExtensionContext) {
  ctx.ui.notify(
    `PoC Workflow Commands:
  /poc start <slug> [--preflight]       Start a new PoC (maps to poc_kickoff)
  /poc review <slug> [--reviewers ...]  Run parallel review (poc_review)
  /poc triage <slug> [--auto-classify]  Analyze feedback (poc_analyze_feedback)
  /poc decide <slug>                    Decide next step (poc_decide_next)
  /poc apply <slug> [--dry-run]         Implement approved fixes (poc_implement_approved)
  /poc iterate <slug>                   Re-review after corrections (poc_iterate)
  /poc status <slug>                    Show PoC status from Engram (native)
  /poc handoff <slug>                   Generate handoff summary (native)
  /poc workflow <slug> <phase>          Run composed workflow (poc.workflow resource)
  /poc ceiling <on|off>                 Toggle read-only capability ceiling
  /poc help                             Show this help`,
    "info",
  );
}

function parseArgs(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === " " && !inQuotes) {
      if (current) {
        result.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) result.push(current);
  return result;
}

function validateSlug(slug: string, ctx: ExtensionContext): slug is string {
  if (!slug || slug === ".") {
    ctx.ui.notify(
      "Error: slug is required (e.g., /poc start my-poc)",
      "error",
    );
    return false;
  }
  return true;
}

function isPhase(value: string): value is ValidPhase {
  return (VALID_PHASES as readonly string[]).includes(value);
}

function agentForPhase(phase: ValidPhase): string {
  if (phase === "review") return "reviewer";
  if (phase === "triage") return "analyst";
  return "implementer";
}

async function handleStatus(slug: string, ctx: ExtensionContext) {
  const project = ctx.cwd.split("/").pop() || "unknown";

  const memories = await ctx.memory.search({
    query: `poc/${slug}`,
    project,
    match_mode: "all",
    limit: 50,
  });

  if (!memories.length) {
    ctx.ui.notify(`No PoC memories found for slug: ${slug}`, "warn");
    return;
  }

  let output = `PoC Status: ${slug}\n${"=".repeat(40)}\n`;

  for (const memory of memories) {
    output += `\n[${memory.type}] ${memory.title} (id: ${memory.id})\n`;
    output += `${memory.content.slice(0, 200)}${
      memory.content.length > 200 ? "..." : ""
    }\n`;
  }

  ctx.ui.notify(output, "info");
}

async function handleHandoff(slug: string, ctx: ExtensionContext) {
  const project = ctx.cwd.split("/").pop() || "unknown";

  const memories = await ctx.memory.search({
    query: `poc/${slug}`,
    project,
    match_mode: "all",
    limit: 100,
  });

  if (!memories.length) {
    ctx.ui.notify(`No PoC memories found for slug: ${slug}`, "warn");
    return;
  }

  const byKey = new Map<string, typeof memories>();

  for (const memory of memories) {
    const key = memory.topic_key || memory.title;
    const existing = byKey.get(key) ?? [];
    existing.push(memory);
    byKey.set(key, existing);
  }

  let output = `PoC Handoff Summary: ${slug}\n${"=".repeat(50)}\n\n`;

  for (const [key, items] of byKey.entries()) {
    const latest = items[items.length - 1];
    output += `## ${key}\n${latest.content}\n\n`;
  }

  ctx.ui.notify(output, "info");
}

async function spawnWorkflow(
  slug: string,
  phase: ValidPhase,
  pi: ExtensionAPI,
  ctx: ExtensionContext,
) {
  const requestId = crypto.randomUUID();
  const eventName = `subagents:rpc:v1:reply:${requestId}`;

  const reply = await new Promise<any>((resolve, reject) => {
    const off = pi.events.on(eventName, (payload: any) => {
      off();

      if (payload?.success) {
        resolve(payload.data);
        return;
      }

      reject(
        new Error(
          payload?.error?.message ??
            payload?.error ??
            "pi-subagents RPC request failed",
        ),
      );
    });

    pi.events.emit("subagents:rpc:v1:request", {
      version: 1,
      requestId,
      method: "spawn",
      params: {
        workflow: "poc.workflow",
        args: {
          slug,
          phase,
        },
      },
    });
  });

  const runId =
    reply?.runId ??
    reply?.data?.runId ??
    reply?.result?.runId ??
    "unknown";

  ctx.ui.notify(
    `PoC workflow queued: ${slug} / ${phase}\nRun ID: ${runId}`,
    "info",
  );
}

async function handleWorkflow(
  slug: string,
  phase: string,
  pi: ExtensionAPI,
  ctx: ExtensionContext,
) {
  if (!isPhase(phase)) {
    ctx.ui.notify(
      `Invalid phase: ${phase}. Valid phases: ${VALID_PHASES.join(", ")}`,
      "error",
    );
    return;
  }

  try {
    await spawnWorkflow(slug, phase, pi, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.notify(`Failed to spawn PoC workflow: ${message}`, "error");
  }
}

export default function (pi: ExtensionAPI) {
  let workflowReg: { dispose(): void } | undefined;
  let ceilingReg: { dispose(): void } | undefined;

  pi.on("session_start", async (_event, ctx) => {
    const {
      registerWorkflowResource,
      registerSubagentCapabilityCeiling,
    } = await loadSubagentsModules();

    workflowReg?.dispose();

    workflowReg = registerWorkflowResource({
      sessionId: ctx.sessionManager.getSessionId(),
      definition: {
        name: "poc.workflow",
        version: 1,
        resolve(args) {
          const allowedKeys = new Set(["slug", "phase"]);

          for (const key of Object.keys(args ?? {})) {
            if (!allowedKeys.has(key)) {
              return { error: `Unsupported workflow argument: ${key}` };
            }
          }

          const slug = args?.slug;
          const phase = args?.phase;

          if (typeof slug !== "string" || !slug.trim()) {
            return {
              error: "slug is required and must be a non-empty string",
            };
          }

          if (typeof phase !== "string" || !isPhase(phase)) {
            return {
              error: `phase must be one of: ${VALID_PHASES.join(", ")}`,
            };
          }

          const phases: ValidPhase[] =
            phase === "full"
              ? [
                  "start",
                  "review",
                  "triage",
                  "decide",
                  "apply",
                  "iterate",
                ]
              : [phase];

          const script = phases
            .map((currentPhase, index) => {
              const agent = agentForPhase(currentPhase);
              const task = `Execute ${currentPhase} phase for PoC: ${slug}. Follow the ${currentPhase} skill exactly.`;

              return `
const result${index} = await runs.run(
  ${JSON.stringify(currentPhase)},
  {
    agent: ${JSON.stringify(agent)},
    task: ${JSON.stringify(task)},
  },
);

if (!result${index}.ok) {
  throw new Error(
    ${JSON.stringify(`${currentPhase} phase failed`)} +
      ": " +
      result${index}.error,
  );
}
`;
            })
            .join("\n");

          return {
            script: `
${script}
return {
  completed: ${phases.length},
  phases: ${JSON.stringify(phases)},
  slug: ${JSON.stringify(slug)},
};
`,
          };
        },
      },
    });

    // Guardamos el loader para poder registrar el ceiling bajo demanda.
    (pi as any).__pocRegisterSubagentCapabilityCeiling =
      registerSubagentCapabilityCeiling;
  });

  pi.on("session_shutdown", () => {
    workflowReg?.dispose();
    ceilingReg?.dispose();
    workflowReg = undefined;
    ceilingReg = undefined;
  });

  pi.registerCommand("poc", {
    description:
      "PoC workflow: start|review|triage|decide|apply|iterate|status|handoff|workflow|ceiling|help",
    handler: async (args: string, ctx: ExtensionContext) => {
      const parts = parseArgs(args.trim());
      const [cmd, ...rest] = parts;
      const slug = rest[0];

      if (!cmd || cmd === "help") {
        printHelp(ctx);
        return;
      }

      if (cmd === "status") {
        if (!validateSlug(slug || "", ctx)) return;
        await handleStatus(slug, ctx);
        return;
      }

      if (cmd === "handoff") {
        if (!validateSlug(slug || "", ctx)) return;
        await handleHandoff(slug, ctx);
        return;
      }

      if (cmd === "workflow") {
        const phase = rest[1] || "full";
        if (!validateSlug(slug || "", ctx)) return;
        await handleWorkflow(slug, phase, pi, ctx);
        return;
      }

      if (cmd === "ceiling") {
        const action = rest[0] || "";
        const registerFn = (pi as any)
          .__pocRegisterSubagentCapabilityCeiling as
          | ((options: any) => { dispose(): void })
          | undefined;

        if (!registerFn) {
          ctx.ui.notify(
            "pi-subagents modules are not loaded yet. Restart the session or run another /poc command.",
            "error",
          );
          return;
        }

        if (action === "on") {
          ceilingReg?.dispose();

          ceilingReg = registerFn({
            sessionId: pi.sessionManager.getSessionId(),
            source: "poc-read-only",
            ceiling: {
              allowedAgents: ["reviewer", "analyst", "implementer"],
              allowedTools: READ_ONLY_TOOLS,
              denyExtensions: true,
            },
          });

          ctx.ui.notify(
            "Read-only capability ceiling enabled for PoC child agents",
            "info",
          );
          return;
        }

        if (action === "off") {
          ceilingReg?.dispose();
          ceilingReg = undefined;
          ctx.ui.notify("Capability ceiling removed", "info");
          return;
        }

        ctx.ui.notify("Usage: /poc ceiling <on|off>", "warn");
        return;
      }

      if (cmd === "review" || cmd === "triage") {
        if (!validateSlug(slug || "", ctx)) return;
        await handleWorkflow(slug, cmd, pi, ctx);
        return;
      }

      const phase = PHASES[cmd as keyof typeof PHASES];

      if (!phase) {
        ctx.ui.notify(`Unknown command: ${cmd}. Use /poc help`, "error");
        return;
      }

      if (!validateSlug(slug || "", ctx)) return;

      const skillCommand = `${phase} ${rest.slice(1).join(" ")}`.trim();

      await pi.sendUserMessage(`/skill:${skillCommand}`, {
        deliverAs: "followUp",
      });
    },
  });
}
