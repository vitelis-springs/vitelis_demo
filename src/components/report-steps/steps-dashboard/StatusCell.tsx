"use client";

import type { StepStatus } from "../../../hooks/api/useReportStepsService";
import styles from "./steps-board.module.css";

export const STATUS_META: Record<
	StepStatus,
	{ label: string; token: string; dot: string; mini: string }
> = {
	DONE: {
		label: "Done",
		token: styles.done ?? "",
		dot: styles.done ?? "",
		mini: styles.done ?? "",
	},
	PROCESSING: {
		label: "Processing",
		token: styles.processing ?? "",
		dot: styles.processing ?? "",
		mini: styles.processing ?? "",
	},
	ERROR: {
		label: "Error",
		token: styles.error ?? "",
		dot: styles.error ?? "",
		mini: styles.error ?? "",
	},
	PENDING: {
		label: "Pending",
		token: styles.pending ?? "",
		dot: styles.pending ?? "",
		mini: styles.pending ?? "",
	},
};

/**
 * A single status tile. Clicking toggles the cell's selection; changing the
 * status happens in bulk from the context bar once cells are selected. As a
 * grid cell (variant "cell") the tile fills its cell and shows a check when
 * picked; as a card chip (variant "chip") it shows the step order number.
 */
export default function StatusCell({
	status,
	stepOrder,
	variant,
	selected = false,
	loading = false,
	ariaLabel,
	onToggle,
}: {
	status: StepStatus;
	stepOrder: number;
	variant: "cell" | "chip";
	selected?: boolean;
	loading?: boolean;
	ariaLabel: string;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			className={`${styles.token} ${
				variant === "chip" ? (styles.sizeChip ?? "") : (styles.sizeCell ?? "")
			} ${STATUS_META[status].token} ${selected ? (styles.selected ?? "") : ""} ${
				loading ? (styles.busy ?? "") : ""
			}`}
			aria-pressed={selected}
			aria-label={ariaLabel}
			onClick={onToggle}
		>
			{variant === "chip" ? stepOrder : selected ? "✓" : ""}
		</button>
	);
}
