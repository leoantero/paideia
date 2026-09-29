import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The ONLY place ANTHROPIC_API_KEY is read. Importing this module from any
 * client component would fail the build (thanks to "server-only"), which is
 * an intentional guardrail against ever shipping the key to the browser.
 */
let client: Anthropic | null = null;

// Student-facing traffic runs on the cheapest current model.
const STUDENT_MODEL = "claude-haiku-4-5";

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and fill it in."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateTutorResponse(
  systemPrompt: string,
  history: TutorMessage[]
): Promise<string> {
  const response = await getClient().messages.create({
    model: STUDENT_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: history,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

/**
 * Forces the model to answer through `tool`, returning the tool input
 * unvalidated — callers must parse it against their own schema.
 */
export async function generateStructured(
  systemPrompt: string,
  messages: TutorMessage[],
  tool: Anthropic.Tool
): Promise<unknown> {
  const response = await getClient().messages.create({
    model: STUDENT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Model returned no ${tool.name} call (stop_reason: ${response.stop_reason}).`);
  }
  return toolUse.input;
}
