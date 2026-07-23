import { Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

function stringifyPrimitive(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return "";
}

function shortValue(value: unknown): string {
	if (Array.isArray(value)) return `${value.length} items`;
	if (value && typeof value === "object") return "Structured";
	return stringifyPrimitive(value);
}

function stableValueKey(value: unknown, seen: Map<string, number>): string {
	const base =
		value && typeof value === "object"
			? JSON.stringify(value).slice(0, 96)
			: `${typeof value}:${shortValue(value)}`;
	const count = seen.get(base) ?? 0;
	seen.set(base, count + 1);
	return count === 0 ? base : `${base}:${count}`;
}

export function renderStructuredValue(value: unknown, depth = 0): ReactNode {
	if (Array.isArray(value)) {
		if (value.length === 0) return <Text type="secondary">No items</Text>;
		const seenKeys = new Map<string, number>();
		return (
			<div className={styles.structuredList}>
				{value.slice(0, 8).map((item, index) => {
					return (
						<div
							className={styles.structuredItem}
							key={stableValueKey(item, seenKeys)}
						>
							<span className={styles.sequence}>{index + 1}</span>
							{renderStructuredValue(item, depth + 1)}
						</div>
					);
				})}
				{value.length > 8 && (
					<Text type="secondary">{value.length - 8} more items</Text>
				)}
			</div>
		);
	}

	if (value && typeof value === "object") {
		if (depth >= 2) return <Text>{shortValue(value)}</Text>;
		const entries = Object.entries(value as Record<string, unknown>).filter(
			([, entryValue]) => entryValue !== null && entryValue !== undefined,
		);
		if (entries.length === 0) return <Text type="secondary">No details</Text>;
		return (
			<div className={styles.keyValueGrid}>
				{entries.slice(0, 14).map(([key, entryValue]) => (
					<div className={styles.keyValueRow} key={key}>
						<Text className={styles.keyLabel}>{key}</Text>
						<div className={styles.keyValue}>
							{typeof entryValue === "object" && entryValue !== null ? (
								renderStructuredValue(entryValue, depth + 1)
							) : (
								<Text>{stringifyPrimitive(entryValue) || "-"}</Text>
							)}
						</div>
					</div>
				))}
				{entries.length > 14 && (
					<Text type="secondary">{entries.length - 14} more fields</Text>
				)}
			</div>
		);
	}

	return <Text>{stringifyPrimitive(value) || "-"}</Text>;
}
