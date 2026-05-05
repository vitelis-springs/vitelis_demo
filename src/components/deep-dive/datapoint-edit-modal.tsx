"use client";

import { Alert, Input, Modal, Select, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import {
	KPI_SCORE_TIERS,
	KPI_SCORE_VALUES,
	type KpiScoreTier,
	type KpiScoreValue,
} from "../../shared/kpi-score";
import type { UpdateCompanyDataPointPayload } from "../../types/deep-dive.types";
import JsonEditor from "./json-editor";
import type { DatapointEditModalProps } from "./datapoint-edit-modal.types";

const { Text } = Typography;

function normalizeOptional(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export default function DatapointEditModal({
	open,
	loading,
	target,
	onClose,
	onSubmit,
}: DatapointEditModalProps) {
	const [reasoning, setReasoning] = useState("");
	const [sources, setSources] = useState("");
	const [sourcesJson, setSourcesJson] = useState("");
	const [score, setScore] = useState("");
	const [scoreValue, setScoreValue] = useState<KpiScoreValue | null>(null);
	const [scoreTier, setScoreTier] = useState<KpiScoreTier | null>(null);
	const [status, setStatus] = useState(true);

	useEffect(() => {
		if (!target) return;
		setReasoning(target.reasoning);
		setSources(target.sources);
		setSourcesJson(target.sourcesJson ?? "[]");
		setScore(target.score);
		setScoreValue(target.scoreValue);
		setScoreTier(target.scoreTier);
		setStatus(target.status);
	}, [target]);

	const targetScore = target?.score ?? "";
	const targetScoreValue = target?.scoreValue ?? null;
	const targetScoreTier = target?.scoreTier ?? null;
	const isRaw =
		target?.type === "raw_data_point" ||
		(target?.dataPointId
			? target.dataPointId.startsWith("raw_data_point")
			: false);
	const isKpiScoreType =
		target?.type === "kpi_category" ||
		target?.type === "kpi_driver" ||
		(target?.dataPointId
			? target.dataPointId.startsWith("kpi_category")
			: false) ||
		(target?.dataPointId ? target.dataPointId.startsWith("kpi_driver") : false);

	const scoreChanged =
		scoreValue !== targetScoreValue || scoreTier !== targetScoreTier;
	const hasPartialKpiScore = (scoreValue === null) !== (scoreTier === null);
	const useJsonSourcesEditor = target?.sourcesMode === "json";

	const parsedSourcesJson = useJsonSourcesEditor
		? (() => {
				const trimmed = sourcesJson.trim();
				if (!trimmed) {
					return {
						ok: true as const,
						supported: true as const,
						value: null as null,
					};
				}
				try {
					const parsed = JSON.parse(trimmed) as unknown;
					const supported =
						parsed === null ||
						typeof parsed === "string" ||
						Array.isArray(parsed) ||
						(typeof parsed === "object" && parsed !== null);
					return {
						ok: true as const,
						supported,
						value: parsed,
					};
				} catch {
					return {
						ok: false as const,
						supported: false as const,
						value: null as null,
					};
				}
			})()
		: { ok: true as const, supported: true as const, value: null as null };

	const isSaveDisabled =
		(isKpiScoreType && scoreChanged && hasPartialKpiScore) ||
		!parsedSourcesJson.ok ||
		!parsedSourcesJson.supported;

	const handleSubmit = () => {
		if (!parsedSourcesJson.ok) {
			return;
		}

		const payload: UpdateCompanyDataPointPayload = {
			reasoning: normalizeOptional(reasoning),
			sources: useJsonSourcesEditor
				? (parsedSourcesJson.value as
						| string
						| Record<string, unknown>
						| unknown[]
						| null)
				: normalizeOptional(sources),
			status,
		};

		if (isRaw) {
			const normalizedScore = normalizeOptional(score);
			const normalizedTargetScore = normalizeOptional(targetScore);
			if (normalizedScore !== normalizedTargetScore) {
				payload.score = normalizedScore;
			}
		} else if (isKpiScoreType && scoreChanged) {
			payload.scoreValue = scoreValue;
			payload.scoreTier = scoreTier;
		}

		onSubmit(payload);
	};

	return (
		<Modal
			title="Edit Data Point"
			open={open}
			onCancel={onClose}
			onOk={handleSubmit}
			okText="Save"
			confirmLoading={loading}
			okButtonProps={{
				disabled: isSaveDisabled,
			}}
			width={760}
			destroyOnHidden
		>
			<Space orientation="vertical" style={{ width: "100%" }} size={12}>
				<div>
					<Space size="small" wrap>
						<Tag color="blue" style={{ fontFamily: "monospace" }}>
							{target?.dataPointId || "—"}
						</Tag>
						<Tag color="purple">{target?.type || "unknown"}</Tag>
					</Space>
					<Text style={{ display: "block", marginTop: 8, color: "#d9d9d9" }}>
						{target?.label || "—"}
					</Text>
				</div>

				<Input.TextArea
					value={reasoning}
					onChange={(event) => setReasoning(event.target.value)}
					placeholder="Reasoning"
					autoSize={{ minRows: 4, maxRows: 12 }}
				/>

				{useJsonSourcesEditor ? (
					<JsonEditor
						value={sourcesJson}
						onChange={setSourcesJson}
						height="calc(80vh - 460px)"
					/>
				) : (
					<Input.TextArea
						value={sources}
						onChange={(event) => setSources(event.target.value)}
						placeholder="Sources (URLs or comma/newline separated values)"
						autoSize={{ minRows: 3, maxRows: 10 }}
					/>
				)}

				{isRaw ? (
					<Input
						value={score}
						onChange={(event) => setScore(event.target.value)}
						placeholder="Score / Answer"
					/>
				) : isKpiScoreType ? (
					<Space size={12} wrap>
						<Select<KpiScoreValue>
							allowClear
							value={scoreValue ?? undefined}
							onChange={(value) =>
								setScoreValue((value ?? null) as KpiScoreValue | null)
							}
							placeholder="Score Value (1-5)"
							style={{ width: 180 }}
							options={KPI_SCORE_VALUES.map((value) => ({
								value,
								label: String(value),
							}))}
						/>
						<Select<KpiScoreTier>
							allowClear
							value={scoreTier ?? undefined}
							onChange={(value) =>
								setScoreTier((value ?? null) as KpiScoreTier | null)
							}
							placeholder="Score Tier"
							style={{ width: 240 }}
							options={KPI_SCORE_TIERS.map((value) => ({
								value,
								label: value,
							}))}
						/>
					</Space>
				) : (
					<Input
						value={score}
						onChange={(event) => setScore(event.target.value)}
						placeholder="Score"
					/>
				)}

				<Select
					value={status}
					onChange={(value) => setStatus(value)}
					options={[
						{ value: true, label: "Approved" },
						{ value: false, label: "Not approved" },
					]}
					style={{ width: 220 }}
				/>

				<Alert
					type="info"
					showIcon
					title="Setting status to Not approved marks datapoint for future rerun flow."
				/>

				{isKpiScoreType && scoreChanged && hasPartialKpiScore && (
					<Alert
						type="warning"
						showIcon
						title="Set both Score Value and Score Tier, or clear both."
					/>
				)}

				{useJsonSourcesEditor &&
					(!parsedSourcesJson.ok || !parsedSourcesJson.supported) && (
						<Alert
							type="warning"
							showIcon
							title={
								!parsedSourcesJson.ok
									? "Sources JSON is invalid"
									: "Sources JSON must be string, object, array, or null"
							}
						/>
					)}
			</Space>
		</Modal>
	);
}
