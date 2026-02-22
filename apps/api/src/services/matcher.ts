import type { Food, ParsedInput } from '../types';

interface MatchResult {
  type: 'exact' | 'fuzzy' | 'multiple' | 'none';
  food?: Food;
  candidates?: Food[];
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fuzzyScore(needle: string, haystack: string): number {
  const a = normalise(needle);
  const b = normalise(haystack);
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;

  // simple bigram similarity
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const aBi = bigrams(a);
  const bBi = bigrams(b);
  if (aBi.size === 0 || bBi.size === 0) return 0;
  let overlap = 0;
  for (const bi of aBi) if (bBi.has(bi)) overlap++;
  return (2 * overlap) / (aBi.size + bBi.size);
}

export function matchFood(parsed: ParsedInput, foods: Food[]): MatchResult {
  if (foods.length === 0) return { type: 'none' };

  const scores: { food: Food; score: number }[] = [];

  for (const food of foods) {
    let bestScore = 0;

    // check aliases
    const aliases: string[] = food.aliases ? JSON.parse(food.aliases) : [];
    const searchTerms = [food.canonical_name, food.brand, food.variant, ...aliases]
      .filter((s): s is string => s != null);

    const needles = [parsed.brand_guess, parsed.variant_guess]
      .filter((s): s is string => s != null);

    if (needles.length === 0) continue;

    for (const needle of needles) {
      for (const term of searchTerms) {
        const s = fuzzyScore(needle, term);
        if (s > bestScore) bestScore = s;
      }
    }

    if (bestScore > 0.3) {
      scores.push({ food, score: bestScore });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) return { type: 'none' };
  if (scores.length === 1 || (scores[0].score >= 0.7 && scores[0].score - (scores[1]?.score ?? 0) > 0.2)) {
    return { type: scores[0].score >= 0.8 ? 'exact' : 'fuzzy', food: scores[0].food };
  }
  return { type: 'multiple', candidates: scores.slice(0, 3).map((s) => s.food) };
}
