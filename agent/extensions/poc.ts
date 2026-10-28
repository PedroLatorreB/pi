import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const PHASES = {
  start:    "poc_kickoff --preflight",
  review:   "poc_review --reviewers security,perf,ux",
  triage:   "poc_analyze_feedback --auto-classify",
  decide:   "poc_decide_next",
  apply:    "poc_implement_approved --dry-run",
  iterate:  "poc_iterate",
  status:   (slug: string) => `poc_memory status ${slug}`,
  handoff:  (slug: string) => `poc_memory handoff ${slug}`,
} as const;

export default function (pi: ExtensionAPI) {
  pi.registerCommand("poc", {
    description: "PoC workflow: start|review|triage|decide|apply|iterate|status|handoff",
    handler: async (args: string, ctx: ExtensionContext) => {
      const [cmd, ...rest] = args.split(' ') as string[];
      const slug = rest[0] || ".";
      const phase = PHASES[cmd as keyof typeof PHASES];
      ctx.ui.notify(`Phase is: ${phase}, and to boolean: ${!!phase}`, "warn")
      if (!phase) {
        ctx.ui.notify(`Usage: /poc ${Object.keys(PHASES).join("|")}`, "warn");
        return;
      }
      const skillCmd = typeof phase === "function" ? phase(slug) : `${phase} ${rest.join(" ")}`;
      await pi.sendUserMessage(`/skill:${skillCmd}`, {
        deliverAs: "followUp",
      });
    },
  });
}
