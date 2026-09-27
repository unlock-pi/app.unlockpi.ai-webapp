/** Shared arithmetic for "tokens x per-1M-token rate" cost estimates. */
export function sumTokenCost(categories: { tokens: number; rate: number }[]): number {
  let total = 0;
  for (const category of categories) {
    if (category.tokens <= 0) continue;
    total += (category.tokens / 1_000_000) * category.rate;
  }
  return total;
}
