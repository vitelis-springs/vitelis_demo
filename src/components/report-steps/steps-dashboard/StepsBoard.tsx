"use client";

import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { App, Button, Grid, Input, Popconfirm, Select } from "antd";
import { type ReactNode, useMemo, useState } from "react";
import {
	type StepStatus,
	type StepsMatrixResponse,
	type StepsMatrixStep,
	useBulkUpdateReportStepStatuses,
} from "../../../hooks/api/useReportStepsService";
import { useStepsMatrixFilters } from "../use-steps-matrix-filters";
import CellDetails from "./CellDetails";
import { deriveProgressSummary, STATUS_ORDER } from "./progress";
import StatusCell, { STATUS_META } from "./StatusCell";
import styles from "./steps-board.module.css";

type MatrixData = StepsMatrixResponse["data"];
type Row = { companyId: number; companyName: string } & {
	statuses: Array<{ stepId: number; status: StepStatus }>;
};

const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({
	value: s,
	label: STATUS_META[s].label,
}));

const cellKey = (companyId: number, stepId: number) => `${companyId}:${stepId}`;

function settingsKeys(settings: unknown): string[] {
	if (settings && typeof settings === "object" && !Array.isArray(settings)) {
		return Object.keys(settings as Record<string, unknown>);
	}
	return [];
}

/** Desktop step column header: a label with a completion meter; hover spotlights it. */
function StepHeader({
	order,
	name,
	completionPercent,
	onHover,
}: {
	order: number;
	name: string;
	completionPercent: number;
	onHover: () => void;
}) {
	return (
		<div className={styles.headCell} title={name} onMouseEnter={onHover}>
			<span className={styles.headNum}>{order}</span>
			<span className={styles.headMeter}>
				<span
					className={styles.headMeterFill}
					style={{ width: `${completionPercent}%` }}
				/>
			</span>
		</div>
	);
}

export default function StepsBoard({
	reportId,
	matrix,
}: {
	reportId: number;
	matrix: MatrixData;
}) {
	const { message } = App.useApp();
	const screens = Grid.useBreakpoint();
	const isMobile = screens.md === false;

	const bulkUpdate = useBulkUpdateReportStepStatuses(reportId);

	const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
	const [lastClicked, setLastClicked] = useState<{
		companyId: number;
		stepId: number;
	} | null>(null);
	const [hoveredStep, setHoveredStep] = useState<number | null>(null);
	const [bulkStatus, setBulkStatus] = useState<StepStatus>("DONE");

	const {
		searchCompany,
		setSearchCompany,
		selectedStatuses,
		setSelectedStatuses,
		selectedStepIds,
		setSelectedStepIds,
		filteredData,
		visibleSteps,
		stepOptions,
		statusOptions,
		resetFilters,
	} = useStepsMatrixFilters(
		reportId,
		matrix.companies,
		matrix.steps,
		matrix.matrix,
	);

	const summary = useMemo(() => deriveProgressSummary(matrix), [matrix]);
	const stepCompletion = useMemo(() => {
		const map = new Map<number, number>();
		for (const s of summary.perStep) map.set(s.stepId, s.completionPercent);
		return map;
	}, [summary]);
	const stepById = useMemo(() => {
		const map = new Map<number, StepsMatrixStep>();
		for (const s of matrix.steps) map.set(s.id, s);
		return map;
	}, [matrix.steps]);

	const rows = filteredData as Row[];
	const hasFilters =
		searchCompany.trim() !== "" ||
		selectedStatuses.length > 0 ||
		selectedStepIds.length > 0;

	const statusOf = (row: Row, stepId: number): StepStatus =>
		row.statuses.find((s) => s.stepId === stepId)?.status ?? "PENDING";

	const clickCell = (companyId: number, stepId: number) => {
		setLastClicked({ companyId, stepId });
		setSelectedCells((prev) => {
			const key = cellKey(companyId, stepId);
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const applySelected = () => {
		if (selectedCells.size === 0) return;
		// One atomic request with the exact selected cells — no partial state.
		const cells = Array.from(selectedCells, (key) => {
			const [companyId, stepId] = key.split(":");
			return { company_id: Number(companyId), step_id: Number(stepId) };
		});
		bulkUpdate.mutate(
			{ cells, status: bulkStatus },
			{
				onSuccess: (res) => {
					if (res.success) {
						message.success(
							`Set ${cells.length} cells to ${STATUS_META[bulkStatus].label}`,
						);
						setSelectedCells(new Set());
					} else {
						message.error(res.error ?? "Bulk update failed");
					}
				},
				onError: () => message.error("Bulk update failed"),
			},
		);
	};

	const toolbar = (
		<div className={styles.toolbar}>
			<div className={styles.progress}>
				<span className={styles.pct}>{summary.completionPercent}%</span>
				<span className={styles.pctLabel}>
					done
					<br />
					across {summary.totalCells}
				</span>
				<div className={styles.tallies}>
					{STATUS_ORDER.map((s) => (
						<span className={styles.tally} key={s}>
							<span className={`${styles.dot} ${STATUS_META[s].dot}`} />
							{summary.counts[s]}
						</span>
					))}
				</div>
			</div>

			<div className={styles.filters}>
				<Input
					prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
					placeholder="Find company"
					value={searchCompany}
					onChange={(e) => setSearchCompany(e.target.value)}
					allowClear
					style={{ width: isMobile ? undefined : 200 }}
				/>
				<Select
					mode="multiple"
					placeholder="Status"
					value={selectedStatuses}
					onChange={setSelectedStatuses}
					options={statusOptions}
					maxTagCount={1}
					allowClear
					style={{ minWidth: 130 }}
				/>
				<Select
					mode="multiple"
					placeholder="Steps"
					value={selectedStepIds}
					onChange={setSelectedStepIds}
					options={stepOptions}
					maxTagCount={1}
					allowClear
					style={{ minWidth: 130 }}
				/>
				{hasFilters && (
					<Button icon={<CloseOutlined />} onClick={resetFilters}>
						Clear
					</Button>
				)}
			</div>
		</div>
	);

	// Context bar: selection bulk takes priority, then hovered-step metadata.
	const hovered = hoveredStep != null ? stepById.get(hoveredStep) : undefined;
	let context: ReactNode;
	if (selectedCells.size > 0) {
		context = (
			<div className={styles.context}>
				<span className={styles.ctxSel}>
					{selectedCells.size} cell{selectedCells.size === 1 ? "" : "s"}{" "}
					selected
				</span>
				<span className={styles.ctxSpacer} />
				<Select
					value={bulkStatus}
					onChange={setBulkStatus}
					options={STATUS_OPTIONS}
					size="small"
					style={{ width: 140 }}
				/>
				<Popconfirm
					title={`Set ${selectedCells.size} cells to ${STATUS_META[bulkStatus].label}?`}
					description="Each selected cell takes the chosen status."
					okText="Apply"
					cancelText="Cancel"
					onConfirm={applySelected}
				>
					<Button type="primary" size="small" loading={bulkUpdate.isPending}>
						Apply to selected
					</Button>
				</Popconfirm>
				<Button size="small" onClick={() => setSelectedCells(new Set())}>
					Clear
				</Button>
			</div>
		);
	} else if (hovered) {
		const keys = settingsKeys(hovered.settings);
		context = (
			<div className={styles.context}>
				<span className={styles.ctxName}>
					{hovered.order}. {hovered.name}
				</span>
				{hovered.dependency && (
					<span className={styles.ctxTag}>needs {hovered.dependency}</span>
				)}
				{keys.length > 0 && (
					<span className={styles.ctxTag}>{keys.length} settings</span>
				)}
				{hovered.url && <span className={styles.ctxCode}>{hovered.url}</span>}
			</div>
		);
	} else {
		context = (
			<div className={styles.context}>
				<span className={styles.ctxHint}>
					Click tiles to select cells, then set their status together.
					{!isMobile && " Hover a step to inspect its metadata."}
				</span>
			</div>
		);
	}

	let body: ReactNode;

	if (rows.length === 0) {
		body = (
			<div className={styles.empty}>
				No companies match these filters. Clear them to see the full board.
			</div>
		);
	} else if (isMobile) {
		body = (
			<div className={styles.cards}>
				{rows.map((row) => {
					const counts = { DONE: 0, PROCESSING: 0, ERROR: 0, PENDING: 0 };
					for (const step of visibleSteps) counts[statusOf(row, step.id)] += 1;
					const total = visibleSteps.length || 1;
					const pct = Math.round((counts.DONE / total) * 100);
					return (
						<div className={styles.card} key={row.companyId}>
							<div className={styles.cardHead}>
								<span className={styles.cardName}>{row.companyName}</span>
								<span className={styles.cardPct}>{pct}%</span>
							</div>
							<div className={styles.miniBar}>
								{STATUS_ORDER.map((s) =>
									counts[s] > 0 ? (
										<span
											key={s}
											className={`${styles.miniSeg} ${STATUS_META[s].mini}`}
											style={{ flexBasis: `${(counts[s] / total) * 100}%` }}
										/>
									) : null,
								)}
							</div>
							<div className={styles.tokens}>
								{visibleSteps.map((step) => {
									const st = statusOf(row, step.id);
									return (
										<StatusCell
											key={step.id}
											variant="chip"
											stepOrder={step.order}
											ariaLabel={`${row.companyName} · ${step.order}. ${step.name}: ${STATUS_META[st].label}`}
											status={st}
											selected={selectedCells.has(
												cellKey(row.companyId, step.id),
											)}
											loading={bulkUpdate.isPending}
											onToggle={() => clickCell(row.companyId, step.id)}
										/>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		);
	} else {
		body = (
			<div className={styles.board} onMouseLeave={() => setHoveredStep(null)}>
				<div
					className={styles.grid}
					style={{
						gridTemplateColumns: `minmax(150px, 220px) repeat(${visibleSteps.length}, 44px)`,
					}}
				>
					<div className={styles.corner}>Company</div>
					{visibleSteps.map((step) => (
						<StepHeader
							key={step.id}
							order={step.order}
							name={step.name}
							completionPercent={stepCompletion.get(step.id) ?? 0}
							onHover={() => setHoveredStep(step.id)}
						/>
					))}

					{rows.map((row, rowIndex) => {
						const odd = rowIndex % 2 === 1;
						return (
							<div key={row.companyId} className={styles.headRow}>
								<div
									className={`${styles.rowHead} ${odd ? (styles.odd ?? "") : ""}`}
								>
									<span className={styles.rowName} title={row.companyName}>
										{row.companyName}
									</span>
									<span className={styles.rowId}>#{row.companyId}</span>
								</div>
								{visibleSteps.map((step) => {
									const active = hoveredStep === step.id;
									const st = statusOf(row, step.id);
									return (
										<div
											key={step.id}
											className={`${styles.cell} ${active ? (styles.colActive ?? "") : ""}`}
											onMouseEnter={() => setHoveredStep(step.id)}
										>
											<StatusCell
												variant="cell"
												stepOrder={step.order}
												ariaLabel={`${row.companyName} · ${step.order}. ${step.name}: ${STATUS_META[st].label}`}
												status={st}
												selected={selectedCells.has(
													cellKey(row.companyId, step.id),
												)}
												loading={bulkUpdate.isPending}
												onToggle={() => clickCell(row.companyId, step.id)}
											/>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	const detailCompany = lastClicked
		? matrix.companies.find((c) => c.id === lastClicked.companyId)
		: undefined;
	const detailStep = lastClicked
		? matrix.steps.find((s) => s.id === lastClicked.stepId)
		: undefined;
	const detailStatus: StepStatus = lastClicked
		? (rows
				.find((r) => r.companyId === lastClicked.companyId)
				?.statuses.find((s) => s.stepId === lastClicked.stepId)?.status ??
			"PENDING")
		: "PENDING";

	return (
		<section className={styles.wrap} aria-label="Company step statuses">
			{toolbar}
			{context}
			{body}
			{lastClicked && detailStep && (
				<CellDetails
					reportId={reportId}
					companyId={lastClicked.companyId}
					companyName={detailCompany?.name ?? `#${lastClicked.companyId}`}
					stepId={lastClicked.stepId}
					stepName={detailStep.name}
					order={detailStep.order}
					cellStatus={detailStatus}
				/>
			)}
		</section>
	);
}
