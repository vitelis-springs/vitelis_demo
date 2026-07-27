/**
 * Pure, dependency-free helpers for step-preset (report_step_template_steps)
 * derivation. Kept isolated from Prisma so they can be unit-tested directly.
 */

export interface SourceReportStep {
	step_id: number;
	step_order: number;
}

export interface NormalizedPresetStep {
	step_id: number;
	step_order: number;
}

/**
 * Snapshot the report's configured steps into a preset-ready shape.
 *
 * `report_steps` has no unique (report_id, step_order), so the source may
 * contain duplicate orders. The target table `report_step_template_steps`
 * DOES enforce unique (template_id, step_order), so we must renumber to a
 * clean 1..N sequence while preserving the intended ordering.
 *
 * Ordering rule (matches the brief): sort by (step_order ASC, step_id ASC),
 * then assign order = index + 1. Every source step is kept.
 */
export function normalizePresetSteps(
	steps: SourceReportStep[],
): NormalizedPresetStep[] {
	return [...steps]
		.sort((a, b) => a.step_order - b.step_order || a.step_id - b.step_id)
		.map((step, index) => ({ step_id: step.step_id, step_order: index + 1 }));
}
