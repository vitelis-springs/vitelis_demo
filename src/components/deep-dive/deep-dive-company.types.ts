import type { DatapointEditTarget } from "./datapoint-edit-modal.types";

export type DataRecord = Record<string, unknown>;
export type SourceRecord = Record<string, unknown>;

export type CategoryRow = {
	key: number;
	dataPointId: string;
	category: string;
	score: number | null;
	scoreLabel: string;
	reasoning: string | null;
	editTarget: DatapointEditTarget;
};

export type DriverRow = {
	key: number;
	dataPointId: string;
	category: string;
	kpi: string;
	driver: string;
	score: number | null;
	scoreLabel: string;
	reasoning: string | null;
	sources: string[];
	editTarget: DatapointEditTarget;
};

export type RawDataPointRow = {
	key: number;
	question: string;
	answer: string;
	explanation: string | null;
	sources: string[];
	dataPointId: string;
	editTarget: DatapointEditTarget;
};

export type RadarDataPoint = {
	category: string;
	company: number;
	top5Average: number;
	reportAverage: number;
};
