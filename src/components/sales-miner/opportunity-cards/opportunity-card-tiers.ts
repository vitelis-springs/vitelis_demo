import type { OpportunityCardTier } from "../../../types/deep-dive.types";

export const OPPORTUNITY_CARD_TIER_META: Record<
	OpportunityCardTier,
	{ label: string; tagColor: string; swatch: string }
> = {
	gold: {
		label: "Gold",
		tagColor: "gold",
		swatch: "linear-gradient(135deg, #fdf3b0, #cfa233)",
	},
	silver: {
		label: "Silver",
		tagColor: "default",
		swatch: "linear-gradient(135deg, #f8f9fb, #b2b8c1)",
	},
	bronze: {
		label: "Bronze",
		tagColor: "volcano",
		swatch: "linear-gradient(135deg, #efc79b, #a86730)",
	},
};
