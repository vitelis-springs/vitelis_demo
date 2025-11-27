export enum BizminerUseCaseEnum {
  LEADERSHIP = "Leadership",
  AI_MATURITY = "AI Maturity",
  INSURANCE_CX = "Insurance CX",
  EFFICIENCY = "Efficiency",
  SALES_AND_GROWTH = "Sales & Growth",
  HOSPITALITY_PROVISION = "Hospitality | Provision Partners",
  INSURANCE_CX_ALLIANZ = "Insurance CX | Allianz",
}

export enum SalesminerUseCaseEnum {
  QUALTRICS = "Qualtrics",
  ON24 = "ON24",
  EQUINIX = "Equinix",
}

export const SALES_MINER_USE_CASES = Object.values(SalesminerUseCaseEnum);

const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/gi;

export const normalizeUseCase = (value: string): string => {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const formatUseCaseLabel = (value: string): string => {
  if (!value) {
    return "";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export const USE_CASE_SUGGESTIONS = Object.values(BizminerUseCaseEnum).map(
  (label) => ({
    label,
    value: normalizeUseCase(label),
  })
);
