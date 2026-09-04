import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The ONLY place ANTHROPIC_API_KEY is read. Importing this module from any
 * client component would fail the build (thanks to "server-only"), which is
 * an intentional guardrail against ever shipping the key to the browser.
 */
let client: Anthropic | null = null;

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

/**
 * Calls Claude with a Socratic-tutor system prompt and bounded conversation
 * history. Model choice and token limits are deliberately conservative for
 * an MVP: this is a chat turn, not a long-form generation.
 */
export async function generateTutorResponse(
  systemPrompt: string,
  history: TutorMessage[]
): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: systemPrompt,
    messages: history,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
