import type { KpiScoreTier, KpiScoreValue } from "../../shared/kpi-score";
import type { UpdateCompanyDataPointPayload } from "../../types/deep-dive.types";

export interface DatapointEditTarget {
	resultId: number;
	dataPointId: string;
	type: string;
	label: string;
	reasoning: string;
	sources: string;
	sourcesMode?: "text" | "json";
	sourcesJson?: string;
	score: string;
	scoreValue: KpiScoreValue | null;
	scoreTier: KpiScoreTier | null;
	status: boolean;
}

export interface DatapointEditModalProps {
	open: boolean;
	loading: boolean;
	target: DatapointEditTarget | null;
	onClose: () => void;
	onSubmit: (payload: UpdateCompanyDataPointPayload) => void;
}
