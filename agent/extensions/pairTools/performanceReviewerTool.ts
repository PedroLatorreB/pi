import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REVIEWER_SYSTEM_PROMPT = "You are a senior engeneer performance reviewer. Return only valid JSON. Read tool as fallback if only file path is provided. Max 5 findings.";

interface PerformanceFinding {
  severity: string;
  file: string;
  line: string;
  issue: string;
  fix?: string;
}

interface PerformanceReview {
  findings: PerformanceFinding[];
  summary: string;
}

interface PerformanceParams {
  file: string,
  startLine: number,
  endLine: number
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("El subagente no devolvio JSON");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function isValidReview(value: unknown): value is PerformanceReview {
  const review = value as PerformanceReview;

  return (
    Array.isArray(review.findings) && typeof review.summary === "string"
  );
}

async function runPiHeadless(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pi",
      [
        "-p",
        "--no-session",
        "--tools", "read,bash",
        "--model", "llama.cpp/Qwen2.5-Coder-3B",
        "--system-prompt", REVIEWER_SYSTEM_PROMPT,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));

    child.on("error", reject);

    child.on("close", (code: number) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `pi salió con código ${code}`));
      }
    });

    child.stdin.end(prompt);
  });
}

async function exctractLinesWithSed(file: string, startLine: number, endLine: number): Promise<string> {
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
    throw new Error("startLine y endLine deben ser enteros");
  }
  if (startLine < 1 || endLine < startLine) {
    throw new Error("Rango inválido: se espera 1 <= startLine <= endLine");
  }

  const { stdout } = await execFileAsync("sed", [
    "-n",
    `${startLine},${endLine}p`,
    file,
  ]);

  if (!stdout.trim()) {
    throw new Error(
      `El rango ${startLine}-${endLine} no produjo contenido para ${file}`,
    );
  }

  return stdout;
}

async function reviewPerformance (file: string, startLine: number, endLine: number): Promise<PerformanceReview> {
  const code = await exctractLinesWithSed(file, startLine, endLine);
  const numbered = code
  .split("\n")
  .map((line, index) => `${startLine + index}: ${line}`)
  .join("\n");

  const prompt = `Review the following code for performance issues.
      FILE: ${file}
      CODE:
      \`\`\`
      ${numbered}
      \`\`\`

      Return JSON exactly in this shape, max 5 findings:
        {"findings":[{"severity":"low|medium|high","file":"${file}","line":0,"issue":"...","fix":"..."}],"summary":"..."}
      `;

  const raw = await runPiHeadless(prompt);
  const parsed = extractJson(raw);

  if (!isValidReview(parsed)) {
    throw new Error("Respuesta JSON invalida del reviewer performance")
  }
  return parsed;
}

export function registerPerformanceReviewerTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "review_perf",
    label: "Review Performance",
    description: "Run a headless performance review on a code scope and return structured JSON findings.",
    promptSnippet: "review_perf: performance review of supplied code scope.",
    promptGuidelines: "For performance review with file and line range, call review_perf first.\nPass file, startLine, endLine directly. Do not read the file first",
      parameters: Type.Object({
        file: Type.String({ description: "Absolute o workspace-relative file path" }),
        startLine: Type.Number({ minimum:1, description: "Fist line to review (1-based)"}),
        endLine: Type.Number({ minimum:1, description: "Last line to review (1-based, inclusive)"}),
      }),
      outputSchema: Type.Object({
        findings: Type.Array(
          Type.Object({
            severity: Type.String(),
            file: Type.String(),
            line: Type.Number(),
            issue: Type.String(),
            fix: Type.Optional(Type.String()),
          }),
        ),
        summary: Type.String(),
      }),
      async execute(_toolCallId: any, params: PerformanceParams) {
        try {
          const review = await reviewPerformance(
            params.file,
            params.startLine,
            params.endLine
          );

          const json = JSON.stringify(review, null, 2)

          return {
            content: [
              {
                type: "text",
                text: `Performance review completed:\n\n${json}`
              }
            ],
            details: review,
            structuredContent: review,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Performance review failed: ${message}`,
              }
            ],
            details: undefined,
          }
        }
      },
  })
}
