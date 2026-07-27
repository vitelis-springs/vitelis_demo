import type {
	StepStatus,
	StepsMatrixResponse,
} from "../../../hooks/api/useReportStepsService";

/** The four terminal step states, in the order we always render them. */
export const STATUS_ORDER: StepStatus[] = [
	"DONE",
	"PROCESSING",
	"ERROR",
	"PENDING",
];

export type StatusCounts = Record<StepStatus, number>;

export interface StepProgress {
	stepId: number;
	name: string;
	order: number;
	counts: StatusCounts;
	total: number;
	completionPercent: number;
}

export interface ProgressSummary {
	companyCount: number;
	stepCount: number;
	totalCells: number;
	counts: StatusCounts;
	completionPercent: number;
	perStep: StepProgress[];
}

function emptyCounts(): StatusCounts {
	return { PENDING: 0, PROCESSING: 0, DONE: 0, ERROR: 0 };
}

function percent(done: number, total: number): number {
	return total > 0 ? Math.round((done / total) * 100) : 0;
}

type MatrixData = StepsMatrixResponse["data"];

/**
 * Derive a "Progress Summary" purely from the steps matrix — no new "health"
 * concept, just a roll-up of the statuses the matrix already carries. Every
 * (company × configured step) is one cell; a report with no companies or no
 * steps yields a well-formed, all-zero summary rather than NaN.
 */
export function deriveProgressSummary(matrix: MatrixData): ProgressSummary {
	const { companies, steps, matrix: rows } = matrix;

	const total = emptyCounts();
	const perStepCounts = new Map<number, StatusCounts>();
	for (const step of steps) {
		perStepCounts.set(step.id, emptyCounts());
	}

	for (const row of rows) {
		for (const cell of row.statuses) {
			total[cell.status] += 1;
			const stepCounts = perStepCounts.get(cell.stepId);
			if (stepCounts) stepCounts[cell.status] += 1;
		}
	}

	const totalCells = companies.length * steps.length;

	const perStep: StepProgress[] = steps.map((step) => {
		const counts = perStepCounts.get(step.id) ?? emptyCounts();
		const stepTotal =
			counts.PENDING + counts.PROCESSING + counts.DONE + counts.ERROR;
		return {
			stepId: step.id,
			name: step.name,
			order: step.order,
			counts,
			total: stepTotal,
			completionPercent: percent(counts.DONE, stepTotal),
		};
	});

	return {
		companyCount: companies.length,
		stepCount: steps.length,
		totalCells,
		counts: total,
		completionPercent: percent(total.DONE, totalCells),
		perStep,
	};
}
