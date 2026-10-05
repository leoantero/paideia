import {
  admin,
  DEMO_EMAIL_DOMAINS,
  demoPassword,
  loadAuthUsers,
} from "./lib/admin";

/**
 * Aplica PAIDEIA_DEMO_PASSWORD (do .env.local) a todas as contas fictícias da
 * demo. Rode depois de trocar a senha no .env.local. Só toca e-mails dos
 * domínios da demo — conta real nunca é afetada.
 */
async function main() {
  const password = demoPassword();
  const users = await loadAuthUsers();
  let changed = 0;
  for (const [email, user] of users) {
    if (!DEMO_EMAIL_DOMAINS.includes(email.split("@")[1])) continue;
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    changed += 1;
  }
  console.log(`Senha trocada em ${changed} contas da demo.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
