export const KPI_SCORE_VALUES = [1, 2, 3, 4, 5] as const;
export type KpiScoreValue = (typeof KPI_SCORE_VALUES)[number];

export const KPI_SCORE_TIERS = [
  "Low",
  "Low-Medium",
  "Medium",
  "Medium-High",
  "High",
] as const;
export type KpiScoreTier = (typeof KPI_SCORE_TIERS)[number];

export const KPI_SCORE_TIER_BY_VALUE: Record<KpiScoreValue, KpiScoreTier> = {
  1: "Low",
  2: "Low-Medium",
  3: "Medium",
  4: "Medium-High",
  5: "High",
};

export function isKpiScoreValue(value: unknown): value is KpiScoreValue {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function isKpiScoreTier(value: unknown): value is KpiScoreTier {
  return typeof value === "string" && KPI_SCORE_TIERS.includes(value as KpiScoreTier);
}

export function parseKpiScoreSelection(value: unknown): {
  scoreValue: KpiScoreValue | null;
  scoreTier: KpiScoreTier | null;
} {
  if (isKpiScoreValue(value)) {
    return { scoreValue: value, scoreTier: KPI_SCORE_TIER_BY_VALUE[value] };
  }

  if (typeof value !== "string") {
    return { scoreValue: null, scoreTier: null };
  }

  const normalized = value.trim();
  if (!normalized) return { scoreValue: null, scoreTier: null };

  const concatMatch = normalized.match(/^([1-5])\s+(.+)$/);
  if (concatMatch?.[1] && concatMatch[2]) {
    const scoreValue = Number(concatMatch[1]);
    const scoreTier = concatMatch[2].trim();
    if (isKpiScoreValue(scoreValue) && isKpiScoreTier(scoreTier)) {
      return { scoreValue, scoreTier };
    }
  }

  const asNumber = Number(normalized);
  if (isKpiScoreValue(asNumber)) {
    return { scoreValue: asNumber, scoreTier: KPI_SCORE_TIER_BY_VALUE[asNumber] };
  }

  return { scoreValue: null, scoreTier: null };
}

export function buildKpiScoreValue(
  scoreValue: KpiScoreValue,
  scoreTier: KpiScoreTier,
): string {
  return `${scoreValue} ${scoreTier}`;
}
