import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas.
 *
 * Sem CSP completa de propósito: o Next injeta scripts inline e uma CSP mal
 * calibrada quebra a hidratação em produção sem aviso. O que importa aqui é
 * coberto pelos cabeçalhos abaixo — ninguém embute o app num iframe para
 * capturar a senha do aluno (clickjacking), o navegador não "adivinha" tipo
 * de arquivo, e a URL não vaza para outros sites pelo Referer.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
