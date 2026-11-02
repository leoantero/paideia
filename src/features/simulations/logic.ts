/**
 * Matemática por trás das simulações. Puro e testável: os componentes só
 * desenham e chamam isto, e os desafios da coruja são checados aqui.
 */

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** 2/4 → "1/2"; 4/4 → "a pizza inteira"; 3/8 → null (já irredutível). */
export function equivalentFraction(k: number, n: number): string | null {
  if (k === 0) return null;
  if (k === n) return "a pizza inteira";
  const g = gcd(k, n);
  return g > 1 ? `${k / g}/${n / g}` : null;
}

export function sameAmount(
  k1: number,
  n1: number,
  k2: number,
  n2: number
): boolean {
  return k1 * n2 === k2 * n1;
}

// ----------------------------------------------------------------------------
// Balança: ax + b = c, resolvida tirando o mesmo peso dos dois pratos.
// ----------------------------------------------------------------------------
export interface BalanceState {
  xs: number;
  left: number;
  right: number;
  /** -1 pende à esquerda, 0 equilíbrio, 1 pende à direita */
  tilt: -1 | 0 | 1;
}

export function balanceFor(a: number, b: number, c: number): BalanceState {
  return { xs: a, left: b, right: c, tilt: 0 };
}

/** O peso de x numa equação ax + b = c. */
export function solveLinear(a: number, b: number, c: number): number {
  return (c - b) / a;
}

export function removeFromBoth(s: BalanceState): BalanceState {
  if (s.tilt !== 0 || s.left === 0 || s.right === 0) return s;
  return { ...s, left: s.left - 1, right: s.right - 1 };
}

/** Tirar só de um lado desequilibra: é isso que a simulação quer mostrar. */
export function removeFromLeftOnly(s: BalanceState): BalanceState {
  if (s.left === 0) return s;
  return { ...s, left: s.left - 1, tilt: 1 };
}

/** Com só x de um lado, reparte o outro lado em grupos iguais. */
export function splitIntoGroups(s: BalanceState): BalanceState {
  if (s.tilt !== 0 || s.left !== 0 || s.xs <= 1 || s.right % s.xs !== 0)
    return s;
  return { ...s, right: s.right / s.xs, xs: 1 };
}

export function isSolved(s: BalanceState): boolean {
  return s.tilt === 0 && s.xs === 1 && s.left === 0;
}

// ----------------------------------------------------------------------------
// Receita: proporção direta a partir da receita-base.
// ----------------------------------------------------------------------------
export function scaleAmount(
  base: number,
  basePeople: number,
  people: number
): number {
  return (base * people) / basePeople;
}

export function percentOf(people: number, basePeople: number): number {
  return Math.round((people / basePeople) * 100);
}

/** 2.5 → "2 e 1/2"; 0.75 → "3/4"; 1.333… → "1 e 1/3"; senão 1 casa decimal. */
export function friendlyAmount(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const frac = value - whole;
  const known: Array<[number, string]> = [
    [0, ""],
    [1 / 4, "1/4"],
    [1 / 3, "1/3"],
    [1 / 2, "1/2"],
    [2 / 3, "2/3"],
    [3 / 4, "3/4"],
  ];
  const hit = known.find(([v]) => Math.abs(frac - v) < 0.01);
  if (!hit) return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (!hit[1]) return String(whole);
  return whole === 0 ? hit[1] : `${whole} e ${hit[1]}`;
}

// ----------------------------------------------------------------------------
// Cercado: perímetro fixo, área variável.
// ----------------------------------------------------------------------------
export function fenceArea(perimeter: number, width: number): number {
  const height = perimeter / 2 - width;
  return Math.max(0, width * height);
}

export function bestFenceWidth(perimeter: number): number {
  return perimeter / 4;
}

// ----------------------------------------------------------------------------
// Números negativos: andares e temperatura.
// ----------------------------------------------------------------------------
export interface Move {
  from: number;
  to: number;
}

export function moveDelta(m: Move): number {
  return m.to - m.from;
}

/** "−3 + 5 = 2", com o sinal de menos tipográfico. */
export function moveExpression(m: Move): string {
  const fmt = (v: number) => (v < 0 ? `−${Math.abs(v)}` : String(v));
  const d = moveDelta(m);
  const op = d >= 0 ? `+ ${d}` : `− ${Math.abs(d)}`;
  return `${fmt(m.from)} ${op} = ${fmt(m.to)}`;
}
