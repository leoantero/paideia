import { createHash } from "node:crypto";
import { admin } from "./lib/admin";

/**
 * Grava no banco o hash de PAIDEIA_MONITOR_TOKEN (.env.local) — o mesmo valor
 * do secret MONITOR_TOKEN do GitHub. O token em si nunca vai para o banco.
 * Rode de novo se trocar o token.
 */
async function main() {
  const token = process.env.PAIDEIA_MONITOR_TOKEN;
  if (!token || token.length < 32) {
    throw new Error(
      "Defina PAIDEIA_MONITOR_TOKEN (32+ caracteres) no .env.local."
    );
  }
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const { error } = await admin
    .from("ai_usage_limits")
    .update({ monitor_token_hash: `\\x${hash}` })
    .eq("id", true);
  if (error) throw error;
  console.log("Hash do token do monitor gravado.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
