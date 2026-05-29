"use client";

import { Tag } from "antd";

export type CompanyListingValue = "public" | "private" | "unknown";

export const COMPANY_LISTING_FIELD_LABEL = "Listing";

export const COMPANY_LISTING_LABELS: Record<CompanyListingValue, string> = {
	public: "Public",
	private: "Private",
	unknown: "Unknown",
};

export const COMPANY_LISTING_COLORS: Record<CompanyListingValue, string> = {
	public: "green",
	private: "default",
	unknown: "gold",
};

export const COMPANY_LISTING_REQUIRED_OPTIONS = [
	{ label: COMPANY_LISTING_LABELS.public, value: "public" },
	{ label: COMPANY_LISTING_LABELS.private, value: "private" },
] satisfies Array<{
	label: string;
	value: Exclude<CompanyListingValue, "unknown">;
}>;

export const COMPANY_LISTING_OPTIONS = [
	...COMPANY_LISTING_REQUIRED_OPTIONS,
	{ label: COMPANY_LISTING_LABELS.unknown, value: "unknown" },
] satisfies Array<{ label: string; value: CompanyListingValue }>;

export function toCompanyListingValue(
	listed?: boolean | null,
): CompanyListingValue {
	if (listed === true) return "public";
	if (listed === false) return "private";
	return "unknown";
}

export function toListedBoolean(value: CompanyListingValue): boolean | null {
	if (value === "public") return true;
	if (value === "private") return false;
	return null;
}

export function getCompanyListingLabel(listed?: boolean | null): string {
	return COMPANY_LISTING_LABELS[toCompanyListingValue(listed)];
}

export default function CompanyListedTag({
	listed,
}: {
	listed?: boolean | null;
}) {
	const value = toCompanyListingValue(listed);
	return (
		<Tag color={COMPANY_LISTING_COLORS[value]}>
			{COMPANY_LISTING_LABELS[value]}
		</Tag>
	);
}
