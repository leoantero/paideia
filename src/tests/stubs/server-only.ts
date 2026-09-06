/**
 * Stub para `server-only` nos testes. O pacote real lança ao ser importado
 * fora de um bundle de servidor; sob vitest (node) queremos que seja um no-op
 * para poder testar módulos marcados com `import "server-only"`.
 */
export {};
