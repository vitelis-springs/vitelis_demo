/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanasadtion> */
import { report_status_enum } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";
import {
	buildKpiScoreValue,
	isKpiScoreTier,
	isKpiScoreValue,
	KPI_SCORE_TIER_BY_VALUE,
	type KpiScoreTier,
	type KpiScoreValue,
} from "../../../../shared/kpi-score";
import {
	type CompanyDataPointResultUpdateData,
	type DeepDiveListParams,
	DeepDiveRepository,
	type ReportDataPointSourcesRow,
	type ReportModelUpdateRow,
	type ScrapeCandidatesParams,
	type SourceCountingContext,
	type SourceFilterParams,
	type SourcesAnalyticsParams,
} from "./deep-dive.repository";

const DEFAULT_STATUS_COUNTS = {
	PENDING: 0,
	PROCESSING: 0,
	DONE: 0,
	ERROR: 0,
};

export interface UpdateDeepDiveSettingsPayload {
	reportInfo: {
		name: string;
		description?: string | null;
		useCaseId?: number | null;
	};
	reportSettings: {
		name?: string;
		masterFileId?: string;
		prefix?: number | null;
		settings: Record<string, unknown>;
	};
	validatorSettings: {
		name?: string;
		settings: Record<string, unknown>;
	};
}

export interface UpdateCompanyDataPointPayload {
	reasoning?: string | null;
	sources?: string | null;
	score?: string | number | null;
	scoreValue?: KpiScoreValue | null;
	scoreTier?: KpiScoreTier | null;
	status?: boolean;
}

export type DeepDiveMetricKey =
	| "companies-count"
	| "orchestrator-status"
	| "total-sources"
	| "used-sources"
	| "total-scrape-candidates"
	| "total-queries";

export interface ReportModelImportRow {
	dataPointId: string;
	includeToReport?: boolean;
}

function asSettingsRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, unknown>;
}

type ReportWithRelations = NonNullable<
	Awaited<ReturnType<typeof DeepDiveRepository.getReportById>>
>;

export class DeepDiveService {
	private static isJsonObject(
		value: unknown,
	): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	private static extractSourcesFromValue(value: unknown): string[] {
		if (typeof value === "string") {
			return value
				.split(/\r?\n|,/)
				.map((entry) => entry.trim())
				.map((entry) => entry.replace(/^\d+\.\s*/, ""))
				.filter(Boolean);
		}

		if (Array.isArray(value)) {
			return value.flatMap((entry) =>
				DeepDiveService.extractSourcesFromValue(entry),
			);
		}

		if (DeepDiveService.isJsonObject(value)) {
			const url = value.url;
			if (typeof url === "string" && url.trim()) {
				return [url.trim()];
			}
		}

		return [];
	}

	private static normalizeSourceKey(value: string): string {
		return value
			.trim()
			.replace(/^\d+\.\s*/, "")
			.replace(/\/+$/, "")
			.toLowerCase();
	}

	private static buildSourcesCountByCompany(
		rows: ReportDataPointSourcesRow[],
	): Map<number, number> {
		const counts = new Map<number, Set<string>>();

		rows.forEach((row) => {
			if (typeof row.company_id !== "number") return;
			if (!DeepDiveService.isJsonObject(row.data)) return;

			const rawSources = row.data.sources ?? row.data.Sources;
			const normalized = DeepDiveService.extractSourcesFromValue(rawSources)
				.map((entry) => DeepDiveService.normalizeSourceKey(entry))
				.filter(Boolean);

			if (!normalized.length) return;

			const current = counts.get(row.company_id) ?? new Set<string>();
			normalized.forEach((entry) => {
				current.add(entry);
			});
			counts.set(row.company_id, current);
		});

		return new Map(
			Array.from(counts.entries()).map(([companyId, sources]) => [
				companyId,
				sources.size,
			]),
		);
	}

	private static async buildSourceCountingContext(
		reportId: number,
	): Promise<SourceCountingContext> {
		return DeepDiveRepository.getSourceCountingContext(reportId);
	}

	private static normalizeTextInput(value: string | null): string | null {
		if (value === null) return null;
		const normalized = value.trim();
		return normalized ? normalized : null;
	}

	private static normalizeRawScoreInput(value: string | number | null): {
		textValue: string | null;
		numericValue: number | null;
	} | null {
		if (value === null) {
			return { textValue: null, numericValue: null };
		}

		if (typeof value === "number") {
			if (!Number.isFinite(value)) return null;
			return { textValue: String(value), numericValue: value };
		}

		const normalized = value.trim();
		if (!normalized) {
			return { textValue: null, numericValue: null };
		}

		const parsedNumber = Number(normalized);
		return {
			textValue: normalized,
			numericValue: Number.isFinite(parsedNumber) ? parsedNumber : null,
		};
	}

	private static normalizeKpiScoreInput(
		payload: UpdateCompanyDataPointPayload,
	): {
		provided: boolean;
		success: boolean;
		error?: string;
		concatenatedValue?: string | null;
		scoreValue?: KpiScoreValue | null;
		scoreTier?: KpiScoreTier | null;
	} {
		const hasScoreValue = payload.scoreValue !== undefined;
		const hasScoreTier = payload.scoreTier !== undefined;
		const hasLegacyScore = payload.score !== undefined;
		const provided = hasScoreValue || hasScoreTier || hasLegacyScore;

		if (!provided) return { provided: false, success: true };

		if (hasLegacyScore) {
			return {
				provided: true,
				success: false,
				error: "Use scoreValue and scoreTier for KPI category/driver updates",
			};
		}

		if (!hasScoreValue || !hasScoreTier) {
			return {
				provided: true,
				success: false,
				error: "scoreValue and scoreTier must be provided together",
			};
		}

		const scoreValue = payload.scoreValue ?? null;
		const scoreTier = payload.scoreTier ?? null;

		if (scoreValue === null && scoreTier === null) {
			return {
				provided: true,
				success: true,
				concatenatedValue: null,
				scoreValue: null,
				scoreTier: null,
			};
		}

		if (!isKpiScoreValue(scoreValue) || !isKpiScoreTier(scoreTier)) {
			return {
				provided: true,
				success: false,
				error: "scoreValue must be 1-5 and scoreTier must be a valid tier",
			};
		}

		const expectedTier = KPI_SCORE_TIER_BY_VALUE[scoreValue];
		if (scoreTier !== expectedTier) {
			return {
				provided: true,
				success: false,
				error: `scoreTier must be ${expectedTier} for scoreValue ${scoreValue}`,
			};
		}

		return {
			provided: true,
			success: true,
			concatenatedValue: buildKpiScoreValue(scoreValue, scoreTier),
			scoreValue,
			scoreTier,
		};
	}

	static async updateCompanyDataPoint(
		reportId: number,
		companyId: number,
		resultId: number,
		payload: UpdateCompanyDataPointPayload,
	) {
		const existing = await DeepDiveRepository.getCompanyDataPointResultById(
			reportId,
			companyId,
			resultId,
		);
		if (!existing) return null;

		const dataPointType = existing.data_points?.type ?? "";
		const dataPointId = existing.data_point_id ?? "";
		const isCategory =
			dataPointType === "kpi_category" ||
			dataPointId.startsWith("kpi_category");
		const isDriver =
			dataPointType === "kpi_driver" || dataPointId.startsWith("kpi_driver");
		const isRaw =
			dataPointType === "raw_data_point" ||
			dataPointId.startsWith("raw_data_point");

		const mutableData: Record<string, unknown> = DeepDiveService.isJsonObject(
			existing.data,
		)
			? { ...existing.data }
			: {};

		const patch: CompanyDataPointResultUpdateData = {};
		let dataChanged = false;

		if (payload.reasoning !== undefined) {
			const reasoning =
				payload.reasoning === null
					? null
					: DeepDiveService.normalizeTextInput(payload.reasoning);

			if (isRaw) {
				mutableData.explanation = reasoning;
			}
			mutableData.Reasoning = reasoning;
			dataChanged = true;
		}

		if (payload.sources !== undefined) {
			const sources =
				payload.sources === null
					? null
					: DeepDiveService.normalizeTextInput(payload.sources);

			mutableData.Sources = sources;
			mutableData.sources = sources;
			dataChanged = true;
		}

		if (isCategory || isDriver) {
			const normalizedKpiScore =
				DeepDiveService.normalizeKpiScoreInput(payload);
			if (!normalizedKpiScore.success) {
				return {
					success: false,
					error: normalizedKpiScore.error || "Invalid KPI score payload",
				} as const;
			}
			if (normalizedKpiScore.provided) {
				patch.value = normalizedKpiScore.concatenatedValue ?? null;
				if (isCategory) {
					mutableData["KPI Score"] =
						normalizedKpiScore.concatenatedValue ?? null;
				} else {
					mutableData.Score = normalizedKpiScore.concatenatedValue ?? null;
				}
				dataChanged = true;
			}
		} else if (payload.score !== undefined) {
			const normalizedScore = DeepDiveService.normalizeRawScoreInput(
				payload.score,
			);
			if (!normalizedScore) {
				return {
					success: false,
					error: "score must be a finite number, string, or null",
				} as const;
			}

			if (isRaw) {
				patch.manualValue = normalizedScore.textValue;
				mutableData.answer =
					normalizedScore.numericValue ?? normalizedScore.textValue;
				dataChanged = true;
			} else {
				patch.value = normalizedScore.textValue;
				mutableData.Score =
					normalizedScore.numericValue ?? normalizedScore.textValue;
				dataChanged = true;
			}
		}

		if (payload.status !== undefined) {
			patch.status = payload.status;
		}

		if (dataChanged) {
			patch.data =
				mutableData as unknown as CompanyDataPointResultUpdateData["data"];
		}

		if (Object.keys(patch).length === 0) {
			return { success: false, error: "No fields to update" } as const;
		}

		const updated = await DeepDiveRepository.updateCompanyDataPointResult(
			resultId,
			patch,
		);

		return {
			success: true as const,
			data: {
				id: updated.id,
				reportId: updated.report_id,
				companyId: updated.company_id,
				dataPointId: updated.data_point_id,
				type: updated.data_points?.type ?? null,
				value: updated.value,
				manualValue: updated.manualValue,
				status: updated.status,
				data: updated.data,
				updatedAt: updated.updates_at,
			},
		};
	}

	static async getSettings(reportId: number) {
		const [snapshot, allUseCases] = await Promise.all([
			DeepDiveRepository.getReportSettingsSnapshot(reportId),
			DeepDiveRepository.listAllUseCases(),
		]);

		if (!snapshot) return null;

		return {
			success: true,
			data: {
				report: {
					id: snapshot.reportId,
					name: snapshot.reportName,
					description: snapshot.reportDescription,
					useCaseId: snapshot.reportUseCaseId,
					useCaseName: snapshot.reportUseCaseName,
				},
				current: {
					reportSettings: snapshot.reportSettings,
					validatorSettings: snapshot.validatorSettings,
				},
				options: {
					useCases: allUseCases,
				},
			},
		};
	}

	static async updateSettings(
		reportId: number,
		payload: UpdateDeepDiveSettingsPayload,
	) {
		const snapshot =
			await DeepDiveRepository.getReportSettingsSnapshot(reportId);
		if (!snapshot) {
			return { success: false, error: "Deep dive not found" };
		}

		const name = payload.reportInfo.name.trim();
		if (!name) {
			return { success: false, error: "Report name is required" };
		}

		await DeepDiveRepository.updateReportBasicInfo(reportId, {
			name,
			description: payload.reportInfo.description,
			useCaseId: payload.reportInfo.useCaseId,
		});

		let { reportSettingsId, sourceValidationSettingsId } = snapshot;

		if (reportSettingsId) {
			await DeepDiveRepository.updateReportSettingsData(reportSettingsId, {
				name: payload.reportSettings.name?.trim() || undefined,
				masterFileId: payload.reportSettings.masterFileId?.trim() || undefined,
				prefix: payload.reportSettings.prefix,
				settings: payload.reportSettings.settings,
			});
		} else {
			const created = await DeepDiveRepository.createReportSettings({
				name: payload.reportSettings.name?.trim() || name,
				masterFileId: payload.reportSettings.masterFileId?.trim() ?? "",
				prefix: payload.reportSettings.prefix ?? null,
				settings: payload.reportSettings.settings,
			});
			reportSettingsId = created.id;
		}

		if (sourceValidationSettingsId) {
			await DeepDiveRepository.updateValidatorSettingsData(
				sourceValidationSettingsId,
				{
					name: payload.validatorSettings.name?.trim() || undefined,
					settings: payload.validatorSettings.settings,
				},
			);
		} else {
			const created = await DeepDiveRepository.createValidatorSettings({
				name: payload.validatorSettings.name?.trim() || name,
				settings: payload.validatorSettings.settings,
			});
			sourceValidationSettingsId = created.id;
		}

		if (!snapshot.reportSettingsId || !snapshot.sourceValidationSettingsId) {
			await DeepDiveRepository.updateReportSettingsReferences(
				reportId,
				reportSettingsId,
				sourceValidationSettingsId,
			);
		}

		const result = await DeepDiveService.getSettings(reportId);
		if (!result) {
			return { success: false, error: "Deep dive not found" };
		}

		return result;
	}

	static async getReportModel(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		if (report.report_type !== "biz_miner") {
			return {
				success: false as const,
				error: "Model page is available only for biz_miner reports",
			};
		}

		const rows = await DeepDiveRepository.getReportModel(reportId);
		const items = rows
			.map((row) => ({
				id: row.id,
				dataPointId: row.data_point_id ?? "",
				includeToReport: row.include_to_report ?? true,
				name: row.data_points?.name ?? null,
				type: row.data_points?.type ?? null,
				manualMethod: row.data_points?.manual_method ?? null,
				settings: asSettingsRecord(row.data_points?.settings),
			}))
			.filter((row) => row.dataPointId)
			.sort((a, b) => {
				const typeCompare = (a.type ?? "").localeCompare(b.type ?? "");
				if (typeCompare !== 0) return typeCompare;
				return a.dataPointId.localeCompare(b.dataPointId);
			});

		const byTypeMap = new Map<string, number>();
		items.forEach((item) => {
			const type = item.type ?? "unknown";
			byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + 1);
		});

		return {
			success: true as const,
			data: {
				report: {
					id: report.id,
					name: report.name ?? null,
					reportType: report.report_type ?? null,
					useCase: report.use_cases
						? {
								id: report.use_cases.id,
								name: report.use_cases.name,
							}
						: null,
				},
				items,
				summary: {
					total: items.length,
					included: items.filter((item) => item.includeToReport).length,
					excluded: items.filter((item) => !item.includeToReport).length,
					byType: Array.from(byTypeMap.entries())
						.map(([type, count]) => ({ type, count }))
						.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
				},
			},
		};
	}

	static async replaceReportModel(
		reportId: number,
		rows: ReportModelImportRow[],
	) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) {
			return { success: false as const, error: "Deep dive not found" };
		}

		if (report.report_type !== "biz_miner") {
			return {
				success: false as const,
				error: "Model page is available only for biz_miner reports",
			};
		}

		const normalizedRows = new Map<string, boolean>();
		rows.forEach((row) => {
			const dataPointId = row.dataPointId.trim();
			if (!dataPointId) return;
			normalizedRows.set(dataPointId, row.includeToReport ?? true);
		});

		if (!normalizedRows.size) {
			return {
				success: false as const,
				error: "At least one valid data_point_id is required",
			};
		}

		const dataPointIds = Array.from(normalizedRows.keys());
		const existingDataPoints =
			await DeepDiveRepository.getDataPointsByIds(dataPointIds);
		const existingIdSet = new Set(existingDataPoints.map((row) => row.id));
		const missingDataPointIds = dataPointIds.filter(
			(id) => !existingIdSet.has(id),
		);

		if (missingDataPointIds.length) {
			return {
				success: false as const,
				error: "Some data_point_id values were not found",
				details: {
					missingDataPointIds,
				},
			};
		}

		const payload: ReportModelUpdateRow[] = dataPointIds.map((dataPointId) => ({
			dataPointId,
			includeToReport: normalizedRows.get(dataPointId) ?? true,
		}));

		await DeepDiveRepository.replaceReportModel(reportId, payload);

		return DeepDiveService.getReportModel(reportId);
	}

	private static mapOverviewReport(report: ReportWithRelations) {
		return {
			id: report.id,
			name: report.name,
			description: report.description,
			createdAt: report.created_at,
			updatedAt: report.updates_at,
			status: report.report_orhestrator?.status ?? report_status_enum.PENDING,
			reportType: report.report_type ?? null,
			useCase: report.use_cases
				? { id: report.use_cases.id, name: report.use_cases.name }
				: null,
			settings: report.report_settings
				? { id: report.report_settings.id, name: report.report_settings.name }
				: null,
		};
	}

	private static buildKpiChart(
		kpiRaw: Array<{
			company_id: number;
			company_name: string;
			category: string;
			avg_score: number;
		}>,
	) {
		const categoriesSet = new Set<string>();
		const chartMap = new Map<number, Record<string, unknown>>();

		for (const row of kpiRaw) {
			categoriesSet.add(row.category);

			if (!chartMap.has(row.company_id)) {
				chartMap.set(row.company_id, {
					company: row.company_name,
					companyId: row.company_id,
				});
			}

			const entry = chartMap.get(row.company_id ?? 0);

			if (entry) {
				entry[row.category] = Math.round(row.avg_score * 10) / 10;
			}
		}

		return {
			categories: Array.from(categoriesSet).sort(),
			kpiChart: Array.from(chartMap.values()),
		};
	}

	private static deriveDominantStatus(
		counts: Record<report_status_enum, number>,
		totalStepsCount: number,
	): report_status_enum {
		const total =
			counts.PENDING + counts.PROCESSING + counts.DONE + counts.ERROR;
		if (counts.ERROR > 0) return report_status_enum.ERROR;
		if (counts.PROCESSING > 0) return report_status_enum.PROCESSING;
		if (counts.PENDING > 0) return report_status_enum.PENDING;
		if (total === 0 || total < totalStepsCount)
			return report_status_enum.PENDING;
		return report_status_enum.DONE;
	}

	static async getReportCloneData(reportId: number) {
		const report = await prisma.reports.findUnique({
			where: { id: reportId },
			include: {
				report_settings: true,
				source_validation_settings: true,
				use_cases: true,
			},
		});
		if (!report) return null;

		return {
			name: report.name ?? "",
			description: report.description ?? "",
			reportType: report.report_type ?? "",
			useCaseId: report.use_case_id ?? null,
			useCaseName: report.use_cases?.name ?? null,
			reportSettings: report.report_settings
				? {
						name: report.report_settings.name,
						masterFileId: report.report_settings.master_file_id,
						prefix: report.report_settings.prefix ?? null,
						settings: report.report_settings.settings,
					}
				: null,
			sourceValidationSettings: report.source_validation_settings
				? {
						name: report.source_validation_settings.name,
						settings: report.source_validation_settings.settings,
					}
				: null,
		};
	}

	static async createReport(payload: {
		name: string;
		description?: string;
		useCaseId?: number;
		reportType: string;
		reportSettings?: {
			name: string;
			masterFileId?: string;
			prefix?: number;
			settings: object;
		};
		sourceValidationSettings?: {
			name: string;
			settings: object;
		};
		cloneFromId?: number;
		cloneOptions?: {
			orchestrator: boolean;
			kpiModel: boolean;
			companies: boolean;
		};
	}) {
		const report = await DeepDiveRepository.createReport({
			name: payload.name,
			description: payload.description,
			useCaseId: payload.useCaseId,
			reportType: payload.reportType,
			reportSettings: {
				name: payload.reportSettings?.name || payload.name,
				masterFileId: payload.reportSettings?.masterFileId ?? "",
				prefix: payload.reportSettings?.prefix ?? null,
				settings: payload.reportSettings?.settings ?? {},
			},
			sourceValidationSettings: {
				name: payload.sourceValidationSettings?.name || payload.name,
				settings: payload.sourceValidationSettings?.settings ?? {},
			},
		});

		if (payload.cloneFromId && payload.cloneOptions) {
			await DeepDiveRepository.cloneReportRelatedData(
				payload.cloneFromId,
				report.id,
				payload.cloneOptions,
			);
		}

		return { id: report.id, name: report.name };
	}

	static async listDeepDives(params: DeepDiveListParams) {
		const [{ items, total }, useCases, industries] = await Promise.all([
			DeepDiveRepository.listReports(params),
			DeepDiveRepository.getDistinctUseCasesForReports(),
			DeepDiveRepository.getDistinctIndustriesForReports(),
		]);

		return {
			success: true,
			data: {
				total,
				items: items.map((report) => {
					const firstCompany = report.report_companies[0]?.companies;
					return {
						id: report.id,
						name: report.name,
						description: report.description,
						createdAt: report.created_at,
						updatedAt: report.updates_at,
						status:
							report.report_orhestrator?.status ?? report_status_enum.PENDING,
						settings: report.report_settings
							? {
									id: report.report_settings.id,
									name: report.report_settings.name,
									masterFileId: report.report_settings.master_file_id,
									prefix: report.report_settings.prefix,
									settings: report.report_settings.settings,
								}
							: null,
						useCase: report.use_cases
							? {
									id: report.use_cases.id,
									name: report.use_cases.name,
								}
							: null,
						industryName: firstCompany?.industries?.name ?? null,
						reportType: report.report_type ?? null,
						counts: {
							companies: report._count.report_companies,
							steps: report._count.report_steps,
						},
					};
				}),
				filters: {
					useCases,
					industries,
				},
			},
		};
	}

	static async getDeepDiveOverview(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		return {
			success: true,
			data: {
				report: DeepDiveService.mapOverviewReport(report),
			},
		};
	}

	static async getDeepDiveMetric(reportId: number, metric: DeepDiveMetricKey) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		let value: number | report_status_enum;

		switch (metric) {
			case "companies-count":
				value = await DeepDiveRepository.getReportCompaniesCount(reportId);
				break;
			case "orchestrator-status":
				value = report.report_orhestrator?.status ?? report_status_enum.PENDING;
				break;
			case "total-sources": {
				const sourceCountingContext =
					await DeepDiveService.buildSourceCountingContext(reportId);
				value = await DeepDiveRepository.getReportSourcesCount(
					reportId,
					sourceCountingContext,
				);
				break;
			}
			case "used-sources": {
				const sourceCountingContext =
					await DeepDiveService.buildSourceCountingContext(reportId);
				value = await DeepDiveRepository.getReportUsedSourcesCount(
					reportId,
					sourceCountingContext,
				);
				break;
			}
			case "total-scrape-candidates": {
				const sourceCountingContext =
					await DeepDiveService.buildSourceCountingContext(reportId);
				value = await DeepDiveRepository.getReportScrapeCandidatesCount(
					reportId,
					sourceCountingContext,
				);
				break;
			}
			case "total-queries":
				value = await DeepDiveRepository.getReportQueriesCount(reportId);
				break;
		}

		return {
			success: true,
			data: {
				reportId,
				metric,
				value,
			},
		};
	}

	static async getDeepDiveKpiChart(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		const kpiRaw =
			await DeepDiveRepository.getKpiCategoryScoresByCompany(reportId);
		const { categories, kpiChart } = DeepDiveService.buildKpiChart(kpiRaw);

		return {
			success: true,
			data: {
				reportId,
				categories,
				kpiChart,
			},
		};
	}

	static async getDeepDiveCompaniesTable(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		const companies = await DeepDiveRepository.getReportCompanies(reportId);
		const companyIds = companies
			.map((row) => row.company_id)
			.filter((id): id is number => typeof id === "number");

		const [companyStatusRaw, reportDataPointSources, totalStepsCount] =
			await Promise.all([
				DeepDiveRepository.getCompanyStepStatusSummary(reportId, companyIds),
				DeepDiveRepository.getReportDataPointSources(reportId),
				DeepDiveRepository.getReportStepsCount(reportId),
			]);

		const statusByCompany = new Map<
			number,
			Record<report_status_enum, number>
		>();
		companyStatusRaw.forEach((row) => {
			const current = statusByCompany.get(row.company_id) ?? {
				...DEFAULT_STATUS_COUNTS,
			};
			current[row.status] = row._count._all;
			statusByCompany.set(row.company_id, current);
		});

		const sourcesMap = DeepDiveService.buildSourcesCountByCompany(
			reportDataPointSources,
		);

		return {
			success: true,
			data: {
				reportId,
				companies: companies
					.filter((row) => row.companies !== null)
					.map((row) => {
						const company = row.companies!;
						const counts = statusByCompany.get(company.id) ?? {
							...DEFAULT_STATUS_COUNTS,
						};
						const doneSteps = counts.DONE;

						return {
							id: company.id,
							name: company.name,
							countryCode: company.country_code,
							url: company.url,
							status: DeepDiveService.deriveDominantStatus(
								counts,
								totalStepsCount,
							),
							sourcesCount: sourcesMap.get(company.id) ?? 0,
							stepsDone: doneSteps,
							stepsTotal: totalStepsCount,
						};
					}),
			},
		};
	}

	static async getDeepDiveById(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		const companies = await DeepDiveRepository.getReportCompanies(reportId);
		const companyIds = companies
			.map((row) => row.company_id)
			.filter((id): id is number => typeof id === "number");

		const sourceCountingContext =
			await DeepDiveService.buildSourceCountingContext(reportId);

		const [
			kpiRaw,
			totalSources,
			totalUsedSources,
			totalScrapeCandidates,
			totalQueries,
			companyStatusRaw,
			perCompanySources,
			perCompanyUsedSources,
		] = await Promise.all([
			DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
			DeepDiveRepository.getReportSourcesCount(reportId, sourceCountingContext),
			DeepDiveRepository.getReportUsedSourcesCount(
				reportId,
				sourceCountingContext,
			),
			DeepDiveRepository.getReportScrapeCandidatesCount(
				reportId,
				sourceCountingContext,
			),
			DeepDiveRepository.getReportQueriesCount(reportId),
			DeepDiveRepository.getCompanyStepStatusSummary(reportId, companyIds),
			DeepDiveRepository.getPerCompanySourcesCount(
				reportId,
				sourceCountingContext,
			),
			DeepDiveRepository.getPerCompanyUsedSourcesCount(
				reportId,
				sourceCountingContext,
			),
		]);

		// Build KPI chart — categories are dynamic, derived from data
		const categoriesSet = new Set<string>();
		const chartMap = new Map<number, Record<string, unknown>>();

		for (const row of kpiRaw) {
			categoriesSet.add(row.category);

			if (!chartMap.has(row.company_id)) {
				chartMap.set(row.company_id, {
					company: row.company_name,
					companyId: row.company_id,
				});
			}
			const entry = chartMap.get(row.company_id)!;
			entry[row.category] = Math.round(row.avg_score * 10) / 10;
		}

		const categories = Array.from(categoriesSet).sort();
		const kpiChart = Array.from(chartMap.values());

		// Derive per-company dominant status
		const statusByCompany = new Map<
			number,
			Record<report_status_enum, number>
		>();
		companyStatusRaw.forEach((row) => {
			const current = statusByCompany.get(row.company_id) ?? {
				...DEFAULT_STATUS_COUNTS,
			};
			current[row.status] = row._count._all;
			statusByCompany.set(row.company_id, current);
		});

		const totalSteps = await DeepDiveRepository.getReportSteps(reportId);
		const totalStepsCount = totalSteps.length;

		// Per-company sources & candidates maps
		const sourcesMap = new Map<number, number>();
		const validSourcesMap = new Map<number, number>();
		for (const row of perCompanySources) {
			sourcesMap.set(row.company_id, row.total);
			validSourcesMap.set(row.company_id, row.valid_count);
		}
		const usedSourcesMap = new Map<number, number>();
		for (const row of perCompanyUsedSources) {
			usedSourcesMap.set(row.company_id, row.total);
		}

		function deriveDominantStatus(
			counts: Record<report_status_enum, number>,
		): report_status_enum {
			const total =
				counts.PENDING + counts.PROCESSING + counts.DONE + counts.ERROR;
			if (counts.ERROR > 0) return report_status_enum.ERROR;
			if (counts.PROCESSING > 0) return report_status_enum.PROCESSING;
			if (counts.PENDING > 0) return report_status_enum.PENDING;
			// No statuses recorded or fewer than total steps (without active processing/error) -> PENDING
			if (total === 0 || total < totalStepsCount)
				return report_status_enum.PENDING;
			return report_status_enum.DONE;
		}

		return {
			success: true,
			data: {
				report: {
					id: report.id,
					name: report.name,
					description: report.description,
					createdAt: report.created_at,
					updatedAt: report.updates_at,
					status:
						report.report_orhestrator?.status ?? report_status_enum.PENDING,
					useCase: report.use_cases
						? { id: report.use_cases.id, name: report.use_cases.name }
						: null,
					settings: report.report_settings
						? {
								id: report.report_settings.id,
								name: report.report_settings.name,
							}
						: null,
				},
				summary: {
					companiesCount: companies.length,
					orchestratorStatus:
						report.report_orhestrator?.status ?? report_status_enum.PENDING,
					totalSources,
					usedSources: totalUsedSources,
					totalScrapeCandidates,
					totalQueries,
				},
				categories,
				kpiChart,
				companies: companies
					.filter((row) => row.companies !== null)
					.map((row) => {
						const company = row.companies!;
						const counts = statusByCompany.get(company.id) ?? {
							...DEFAULT_STATUS_COUNTS,
						};
						const doneSteps = counts.DONE;
						return {
							id: company.id,
							name: company.name,
							countryCode: company.country_code,
							url: company.url,
							status: deriveDominantStatus(counts),
							sourcesCount: sourcesMap.get(company.id) ?? 0,
							validSourcesCount: validSourcesMap.get(company.id) ?? 0,
							usedSourcesCount: usedSourcesMap.get(company.id) ?? 0,
							stepsDone: doneSteps,
							stepsTotal: totalStepsCount,
						};
					}),
			},
		};
	}

	static async getReportCompanyIds(reportId: number): Promise<number[] | null> {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		const companies = await DeepDiveRepository.getReportCompanies(reportId);
		return companies
			.map((row) => row.company_id)
			.filter((id): id is number => typeof id === "number");
	}

	static async getReportQueries(
		reportId: number,
		params?: {
			sortBy?: string;
			sortOrder?: import("../../../../types/sorting").SortOrder;
		},
	) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report) return null;

		const sourceCountingContext =
			await DeepDiveService.buildSourceCountingContext(reportId);
		const rows = await DeepDiveRepository.getReportQueriesWithStats(
			reportId,
			params?.sortBy,
			params?.sortOrder,
			sourceCountingContext,
		);

		return {
			success: true,
			data: {
				reportName: report.name,
				queries: rows.map((row) => {
					const total = Number(row.total_companies);
					const completed = Number(row.completed_companies);
					return {
						id: Number(row.id),
						goal: row.goal ?? "",
						searchQueries: Array.isArray(row.search_queries)
							? row.search_queries
							: [],
						sourcesCount: row.sources_count,
						candidatesCount: row.candidates_count,
						completedCompanies: completed,
						totalCompanies: total,
						completionPercent:
							total > 0 ? Math.round((completed / total) * 100) : 0,
						dataPoints: (row.data_points ?? []).map((dp) => ({
							id: dp.id,
							name: dp.name ?? "",
							type: dp.type ?? "",
						})),
					};
				}),
			},
		};
	}

	static async updateQuery(
		reportId: number,
		queryId: number,
		payload: { goal: string; searchQueries: string[] },
	) {
		const bigId = BigInt(queryId);

		const link = await DeepDiveRepository.verifyQueryBelongsToReport(
			reportId,
			bigId,
		);
		if (!link) return null;

		if (!payload.goal.trim()) {
			return { success: false, error: "Goal cannot be empty" };
		}

		await DeepDiveRepository.updateQueryContent(bigId, {
			goal: payload.goal.trim(),
			search_queries: payload.searchQueries.filter((q) => q.trim() !== ""),
		});

		return { success: true };
	}

	static async getCompanyDeepDive(
		reportId: number,
		companyId: number,
		filters: SourceFilterParams,
	) {
		const [company, report] = await Promise.all([
			DeepDiveRepository.getCompany(reportId, companyId),
			DeepDiveRepository.getReportById(reportId),
		]);
		if (!company) return null;

		const reportSettings = report?.report_settings?.settings;
		const typeLevel =
			typeof reportSettings === "object" &&
			reportSettings !== null &&
			!Array.isArray(reportSettings) &&
			"type_level" in reportSettings &&
			typeof (reportSettings as Record<string, unknown>).type_level === "string"
				? ((reportSettings as Record<string, unknown>).type_level as string)
				: null;

		const steps = await DeepDiveRepository.getReportSteps(reportId);

		const [
			stepStatuses,
			kpiResults,
			scrapCandidates,
			scrapCandidatesTotal,
			sources,
			kpiAllScores,
		] = await Promise.all([
			DeepDiveRepository.getCompanyStepStatuses(reportId, companyId),
			DeepDiveRepository.getCompanyKpiResults(reportId, companyId),
			DeepDiveRepository.getCompanyScrapCandidates(reportId, companyId, 200),
			DeepDiveRepository.getCompanyScrapCandidatesCount(reportId, companyId),
			DeepDiveRepository.getCompanySources(reportId, companyId, filters),
			DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
		]);

		const statusByStepId = new Map<number, (typeof stepStatuses)[number]>();
		stepStatuses.forEach((row) => {
			statusByStepId.set(row.step_id, row);
		});

		const orderedSteps = steps.map((step) => {
			const status = statusByStepId.get(step.step_id);

			return {
				stepId: step.step_id,
				order: step.step_order,
				status: status?.status ?? report_status_enum.PENDING,
				updatedAt: status?.updated_at ?? null,
				metadata: status?.metadata ?? null,
				definition: {
					id: step.report_generation_steps.id,
					name: step.report_generation_steps.name,
					url: step.report_generation_steps.url,
					dependency: step.report_generation_steps.dependency,
					settings: step.report_generation_steps.settings,
				},
			};
		});

		// Build KPI averages for radar chart: report average + top-5 average
		const companyScores = new Map<
			number,
			{ name: string; totals: Map<string, number> }
		>();
		const categoryScoreSums = new Map<string, { sum: number; count: number }>();

		for (const row of kpiAllScores) {
			// Accumulate per-company
			if (!companyScores.has(row.company_id)) {
				companyScores.set(row.company_id, {
					name: row.company_name,
					totals: new Map(),
				});
			}
			companyScores
				.get(row.company_id)!
				.totals.set(row.category, row.avg_score);

			// Accumulate report-wide per category
			const cat = categoryScoreSums.get(row.category) ?? { sum: 0, count: 0 };
			cat.sum += row.avg_score;
			cat.count += 1;
			categoryScoreSums.set(row.category, cat);
		}

		// Report average per category
		const reportAverage: Record<string, number> = {};
		categoryScoreSums.forEach(({ sum, count }, cat) => {
			reportAverage[cat] = Math.round((sum / count) * 10) / 10;
		});

		// Top-5 companies by total score, then average per category
		const companyTotals = Array.from(companyScores.entries()).map(
			([id, { name, totals }]) => {
				let total = 0;
				totals.forEach((score) => {
					total += score;
				});
				return { id, name, total, totals };
			},
		);
		companyTotals.sort((a, b) => b.total - a.total);
		const top5 = companyTotals.slice(0, 5);

		const top5Average: Record<string, number> = {};
		if (top5.length > 0) {
			const top5Sums = new Map<string, { sum: number; count: number }>();
			for (const c of top5) {
				c.totals.forEach((score, cat) => {
					const entry = top5Sums.get(cat) ?? { sum: 0, count: 0 };
					entry.sum += score;
					entry.count += 1;
					top5Sums.set(cat, entry);
				});
			}
			top5Sums.forEach(({ sum, count }, cat) => {
				top5Average[cat] = Math.round((sum / count) * 10) / 10;
			});
		}

		return {
			success: true,
			data: {
				reportId,
				reportType: report?.report_type ?? null,
				typeLevel,
				company: {
					id: company.id,
					name: company.name,
					countryCode: company.country_code,
					url: company.url,
					industryId: company.industry_id,
					slug: company.slug,
					investPortal: company.invest_portal,
					careerPortal: company.career_portal,
					reportRole: company.report_role,
					additionalData: company.additional_data,
				},
				kpiAverages: {
					reportAverage,
					top5Average,
					top5Companies: top5.map((c) => ({
						id: c.id,
						name: c.name,
						total: Math.round(c.total * 10) / 10,
					})),
				},
				steps: orderedSteps,
				kpiResults: kpiResults.map((result) => ({
					id: result.id,
					dataPointId: result.data_point_id,
					name: result.data_points?.name,
					type: result.data_points?.type,
					value: result.value,
					manualValue: result.manualValue,
					data: result.data,
					status: result.status,
					updatedAt: result.updates_at,
				})),
				scrapCandidates: scrapCandidates.map((candidate) => ({
					id: candidate.id,
					title: candidate.title,
					description: candidate.description,
					url: candidate.url,
					status: candidate.status,
					metadata: candidate.metadata,
					createdAt: candidate.created_at,
					updatedAt: candidate.updated_at,
				})),
				scrapCandidatesTotal,
				sources: {
					total: sources.total,
					byTier: sources.byTier.map((row) => ({
						tier: row.tier,
						count: (row._count as { _all: number })._all,
					})),
					byVectorized: sources.byVectorized.map((row) => ({
						isVectorized: row.isVectorized,
						count: (row._count as { _all: number })._all,
					})),
					metadataGroups: sources.metadataGroups,
					items: sources.items,
				},
			},
		};
	}

	static async getSourcesAnalytics(
		reportId: number,
		companyId: number,
		filters: SourcesAnalyticsParams,
	) {
		const company = await DeepDiveRepository.getCompany(reportId, companyId);
		if (!company) return null;

		const result = await DeepDiveRepository.getSourcesAnalytics(
			reportId,
			companyId,
			filters,
		);

		return {
			success: true,
			data: {
				reportId,
				company: {
					id: company.id,
					name: company.name,
					countryCode: company.country_code,
					url: company.url,
				},
				totalUnfiltered: result.totalUnfiltered,
				totalFiltered: result.totalFiltered,
				vectorizedCount: result.vectorizedCount,
				aggregations: result.aggregations,
				items: result.items,
			},
		};
	}

	static async getScrapeCandidates(
		reportId: number,
		companyId: number,
		filters: ScrapeCandidatesParams,
	) {
		const company = await DeepDiveRepository.getCompany(reportId, companyId);
		if (!company) return null;

		const result = await DeepDiveRepository.getScrapeCandidatesList(
			reportId,
			companyId,
			filters,
		);

		return {
			success: true,
			data: {
				reportId,
				company: {
					id: company.id,
					name: company.name,
					countryCode: company.country_code,
					url: company.url,
				},
				total: result.total,
				totalFiltered: result.totalFiltered,
				aggregations: result.aggregations,
				items: result.items,
			},
		};
	}

	static async getSalesMinerCompanyData(reportId: number, companyId: number) {
		const [company, report] = await Promise.all([
			DeepDiveRepository.getCompany(reportId, companyId),
			DeepDiveRepository.getReportById(reportId),
		]);

		if (!company || !report) return null;
		if (report.report_type !== "sales_miner") return null;

		const settings = report.report_settings?.settings;
		const isRecord = (v: unknown): v is Record<string, unknown> =>
			typeof v === "object" && v !== null && !Array.isArray(v);

		const typeLevel =
			isRecord(settings) && typeof settings.type_level === "string"
				? settings.type_level
				: null;

		if (typeLevel === "account") {
			const relatedReportId =
				isRecord(settings) && typeof settings.related_report_id === "number"
					? settings.related_report_id
					: null;

			const [stepResults, topOpportunities] = await Promise.all([
				DeepDiveRepository.getSalesMinerStepResults(reportId, companyId),
				relatedReportId
					? DeepDiveRepository.getAccountTopOpportunities(
							relatedReportId,
							company.name,
							10,
						)
					: Promise.resolve([]),
			]);

			const stepMap = new Map(stepResults.map((r) => [r.step_key, r.payload]));

			return {
				success: true,
				data: {
					level: "account" as const,
					reportId,
					company: { id: company.id, name: company.name, url: company.url },
					accountSnapshot: stepMap.get("sclr.account-snapshot") ?? null,
					accountAssessment: stepMap.get("sclr.account-assessment") ?? null,
					sellerBrief: stepMap.get("sclr.seller-brief") ?? null,
					validation: stepMap.get("sclr.validation") ?? null,
					topOpportunities: topOpportunities.map((o) => ({
						id: String(o.id),
						entityName: o.entity_name,
						title: o.title,
						score: o.score ? parseFloat(o.score) : null,
						portfolioPriorityScore: o.portfolio_priority_score
							? parseFloat(o.portfolio_priority_score)
							: null,
						portfolioPriorityReason: o.portfolio_priority_reason,
						track: o.org_unit,
						horizon: o.horizon,
						dealSize: o.deal_size_general,
						whyNow: o.why_now,
						businessProblem: o.primary_business_problem,
						valueProposition: o.primary_value_proposition,
					})),
				},
			};
		}

		// entity level
		const [signals, opportunities, stakeholders] = await Promise.all([
			DeepDiveRepository.getEntitySignals(companyId, reportId),
			DeepDiveRepository.getEntityOpportunities(companyId, reportId),
			DeepDiveRepository.getEntityStakeholders(companyId, reportId),
		]);

		return {
			success: true,
			data: {
				level: "entity" as const,
				reportId,
				company: { id: company.id, name: company.name, url: company.url },
				signals: signals.map((s) => ({
					id: String(s.id),
					themeCode: s.theme_code,
					strengthScore: s.strength_score ? parseFloat(s.strength_score) : null,
					confidenceScore: s.confidence_score
						? parseFloat(s.confidence_score)
						: null,
					freshnessScore: s.freshness_score
						? parseFloat(s.freshness_score)
						: null,
					summaryText: s.summary_text,
					signalName: s.signal_name,
					signalDescription: s.signal_description,
				})),
				opportunities: opportunities.map((o) => ({
					id: String(o.id),
					title: o.title,
					score: o.score ? parseFloat(o.score) : null,
					portfolioPriorityScore: o.portfolio_priority_score
						? parseFloat(o.portfolio_priority_score)
						: null,
					rankPosition: o.rank_position,
					isTop10: o.is_top_10,
					track: o.org_unit,
					horizon: o.horizon,
					dealSize: o.deal_size_general,
					whyNow: o.why_now,
					businessProblem: o.primary_business_problem,
					valueProposition: o.primary_value_proposition,
					solutionCenter: o.solution_center,
				})),
				stakeholders: stakeholders.map((s) => ({
					id: String(s.id),
					fullName: s.full_name,
					linkedinUrl: s.linkedin_url,
					gateRole: s.gate_role,
					gateRoleType: s.gate_role_type,
					roleTitle: s.role_title,
					entityName: s.entity_name,
					entityLevel: s.entity_level,
					rationale: s.rationale,
					opportunityId: s.opportunity_id ? String(s.opportunity_id) : null,
				})),
			},
		};
	}

	static async getSalesMinerReportOverview(reportId: number) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report || report.report_type !== "sales_miner") return null;

		const settings = report.report_settings?.settings;
		const isRecord = (v: unknown): v is Record<string, unknown> =>
			typeof v === "object" && v !== null && !Array.isArray(v);

		const typeLevel =
			isRecord(settings) && typeof settings.type_level === "string"
				? settings.type_level
				: null;

		const relatedReportId =
			isRecord(settings) && typeof settings.related_report_id === "number"
				? settings.related_report_id
				: null;

		const entityReportId =
			typeLevel === "account" ? (relatedReportId ?? reportId) : reportId;

		if (typeLevel === "account") {
			const [oppSummary, accountCompanies] = await Promise.all([
				DeepDiveRepository.getSalesMinerReportOpportunitySummary(
					entityReportId,
				),
				relatedReportId
					? DeepDiveRepository.getSalesMinerAccountCompanies(
							reportId,
							relatedReportId,
						)
					: Promise.resolve([]),
			]);

			return {
				success: true,
				data: {
					level: "account" as const,
					reportId,
					relatedReportId,
					oppSummary: oppSummary.map((r) => ({
						motionFamily: r.motion_family,
						horizon: r.horizon,
						count: Number(r.count),
						avgPriority: r.avg_priority ? Number(r.avg_priority) : null,
						companiesCount: Number(r.companies_count),
					})),
					companies: accountCompanies.map((c) => ({
						id: c.id,
						name: c.name,
						oppCount: Number(c.opp_count),
						avgPriority: c.avg_priority ? Number(c.avg_priority) : null,
						signalCount: Number(c.signal_count),
						stepsDone: Number(c.steps_done),
					})),
				},
			};
		}

		// entity level
		const [signalSummary, oppSummary, topCompanies] = await Promise.all([
			DeepDiveRepository.getSalesMinerReportSignalSummary(reportId),
			DeepDiveRepository.getSalesMinerReportOpportunitySummary(reportId),
			DeepDiveRepository.getSalesMinerEntityTopCompanies(reportId),
		]);

		return {
			success: true,
			data: {
				level: "entity" as const,
				reportId,
				signalSummary: signalSummary.map((r) => ({
					themeCode: r.theme_code,
					signalCount: Number(r.signal_count),
					avgStrength: r.avg_strength ? Number(r.avg_strength) : null,
					companiesCount: Number(r.companies_count),
				})),
				oppSummary: oppSummary.map((r) => ({
					motionFamily: r.motion_family,
					horizon: r.horizon,
					count: Number(r.count),
					avgPriority: r.avg_priority ? Number(r.avg_priority) : null,
					companiesCount: Number(r.companies_count),
				})),
				topCompanies: topCompanies.map((c) => ({
					id: c.id,
					name: c.name,
					oppCount: Number(c.opp_count),
					avgPriority: c.avg_priority ? Number(c.avg_priority) : null,
					signalCount: Number(c.signal_count),
					isAnalyzed: c.is_analyzed,
				})),
			},
		};
	}

	static async addCompanyToReport(
		reportId: number,
		payload:
			| { mode: "existing"; companyId: number }
			| {
					mode: "new";
					name: string;
					url?: string | null;
					countryCode?: string | null;
					industryId?: number | null;
					investPortal?: string | null;
					careerPortal?: string | null;
					slug?: string | null;
					reportRole?: string | null;
					additionalData?: unknown;
			  },
	) {
		if (payload.mode === "existing") {
			await DeepDiveRepository.linkCompanyToReport(reportId, payload.companyId);
			return { success: true };
		}

		const company = await DeepDiveRepository.createCompanyAndLink(reportId, {
			name: payload.name,
			url: payload.url,
			countryCode: payload.countryCode,
			industryId: payload.industryId,
			investPortal: payload.investPortal,
			careerPortal: payload.careerPortal,
			slug: payload.slug,
			reportRole: payload.reportRole,
			additionalData: payload.additionalData,
		});

		return { success: true, data: { companyId: company.id } };
	}

	static async updateCompany(
		reportId: number,
		companyId: number,
		data: {
			name?: string;
			url?: string | null;
			countryCode?: string | null;
			industryId?: number | null;
			investPortal?: string | null;
			careerPortal?: string | null;
			slug?: string | null;
			reportRole?: string | null;
			additionalData?: unknown;
		},
	) {
		const company = await DeepDiveRepository.getCompany(reportId, companyId);
		if (!company)
			return { success: false, error: "Company not found in this report" };

		await DeepDiveRepository.updateCompany(companyId, data);
		return { success: true };
	}

	static async searchCompanies(query: string) {
		const companies = await DeepDiveRepository.searchCompaniesByName(query, 30);
		return {
			success: true,
			data: companies.map((c) => ({
				id: c.id,
				name: c.name,
				countryCode: c.country_code,
				url: c.url,
			})),
		};
	}
}
