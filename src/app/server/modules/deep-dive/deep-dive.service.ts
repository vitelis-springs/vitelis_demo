/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service methods are grouped statically to match existing module conventions. */
/** biome-ignore-all lint/style/useDefaultSwitchClause: Switches are exhaustive over validated union inputs. */
import { type Prisma, report_status_enum } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";
import {
	buildKpiScoreValue,
	isKpiScoreTier,
	isKpiScoreValue,
	KPI_SCORE_TIER_BY_VALUE,
	type KpiScoreTier,
	type KpiScoreValue,
} from "../../../../shared/kpi-score";
import { ReportStepsRepository } from "../report-steps/report-steps.repository";
import { DeepDiveRepository } from "./deep-dive.repository";
import type {
	OpportunityCard,
	OpportunityCardStat,
	OpportunityCardTier,
	OpportunityCardsResponse,
	OpportunityDetailResponse,
	OpportunityNarrativeField,
	OpportunityNarrativeFieldSource,
	UpdateOpportunityNarrativeFieldPayload,
	UpdateOpportunityNarrativeFieldResponse,
} from "../../../../types/deep-dive.types";
import {
	type CompanyCategoryMathDetail,
	type CompanyDataPointResultUpdateData,
	type CompanyKpiResultRow,
	type CreateCompanyDataPointPayload,
	type CreateReportModelItemPayload,
	DEFAULT_STATIC_VALIDATION,
	DEFAULT_STATUS_COUNTS,
	type DeepDiveListParams,
	type DeepDiveMetricKey,
	type ImportedModelDataPoint,
	type ManualDataPointResultBuilder,
	type MissingReportDataPointsRow,
	type ReportDataPointSourcesRow,
	type ReportModelImportRow,
	type ReportModelUpdateRow,
	type ReportWithRelations,
	type ScrapeCandidatesParams,
	type SourceCountingContext,
	type SourceFilterParams,
	type SourcesAnalyticsParams,
	type StaticValidationSummary,
	type UpdateCompanyDataPointPayload,
	type UpdateDeepDiveSettingsPayload,
	type UpdateReportModelItemPayload,
} from "./deep-dive.types";

import { ValidationService } from "./validation/validation.service";
import type {
	ValidationManualUpdatePayload,
	ValidationRulePayload,
	ValidationStatus,
} from "./validation/validation.types";

function asSettingsRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, unknown>;
}

function asInputJsonObject(
	value: Record<string, unknown>,
): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

type DopExportStatsRow = {
	report_type: string | null;
	has_started: boolean;
	completed_companies_count: number;
};

type DopEligibility = { eligible: true } | { eligible: false; reason: string };

export class DeepDiveService {
	private static readonly OPPORTUNITY_BASE_TEXT_FIELDS = [
		{
			field: "title",
			label: "Title",
			key: "title",
		},
		{
			field: "primary_business_problem",
			label: "Business Problem",
			key: "primary_business_problem",
		},
		{
			field: "primary_value_proposition",
			label: "Value Proposition",
			key: "primary_value_proposition",
		},
		{ field: "why_now", label: "Why Now", key: "why_now" },
		{ field: "notes", label: "Notes", key: "notes" },
	] as const;

	private static readonly OPPORTUNITY_DEEP_DIVE_TEXT_FIELDS = [
		{ field: "primaryProblem", label: "Primary Problem" },
		{ field: "whyWeWin", label: "Why We Win" },
		{ field: "whyWeCouldLose", label: "Why We Could Lose" },
		{ field: "executiveSummary", label: "Executive Summary" },
		{ field: "competitivePositioning", label: "Competitive Positioning" },
	] as const;

	private static readonly OPPORTUNITY_STRUCTURED_LABELS: Record<
		string,
		string
	> = {
		commercialSnapshot: "Commercial Snapshot",
		whatToOffer: "What To Offer",
		whyNow: "Why Now Evidence",
		competitiveAnalysis: "Competitive Analysis",
		meddpicc: "MEDDPICC",
		meddpiccStructured: "MEDDPICC Structured",
		nextBestActions: "Next Best Actions",
		discoveryQuestions: "Discovery Questions",
		proofPoints: "Proof Points",
		bundle: "Bundle",
		productImpactChain: "Product Impact Chain",
		trialUniverse: "Trial Universe",
		evidenceUrls: "Evidence URLs",
	};

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

	private static countUniqueReportDataPointSources(
		rows: ReportDataPointSourcesRow[],
	): number {
		const sources = new Set<string>();

		rows.forEach((row) => {
			if (!DeepDiveService.isJsonObject(row.data)) return;

			const rawSources = row.data.sources ?? row.data.Sources;
			DeepDiveService.extractSourcesFromValue(rawSources)
				.map((entry) => DeepDiveService.normalizeSourceKey(entry))
				.filter(Boolean)
				.forEach((entry) => {
					sources.add(entry);
				});
		});

		return sources.size;
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

	private static parseNumericPrefix(value: unknown): number | null {
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : null;
		}

		if (typeof value !== "string") {
			return null;
		}

		const normalized = value.trim();
		if (!normalized) return null;

		const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)/);
		if (!match?.[1]) return null;

		const parsedNumber = Number(match[1]);
		return Number.isFinite(parsedNumber) ? parsedNumber : null;
	}

	private static roundToOneDecimal(value: number): number {
		return Math.round(value * 10) / 10;
	}

	private static getKpiResultCategoryName(
		result: CompanyKpiResultRow,
	): string | null {
		const data = DeepDiveService.isJsonObject(result.data) ? result.data : null;
		const dataCategory =
			typeof data?.["KPI Category"] === "string"
				? DeepDiveService.normalizeTextInput(data["KPI Category"])
				: null;
		if (dataCategory) return dataCategory;

		const settings = asSettingsRecord(result.data_points?.settings);
		const settingsCategory =
			typeof settings?.["KPI Category"] === "string"
				? DeepDiveService.normalizeTextInput(settings["KPI Category"])
				: null;
		if (settingsCategory) return settingsCategory;

		return DeepDiveService.normalizeTextInput(
			result.data_points?.name ?? result.data_point_id ?? null,
		);
	}

	private static getKpiResultScore(result: CompanyKpiResultRow): number | null {
		const data = DeepDiveService.isJsonObject(result.data) ? result.data : null;
		const type = result.data_points?.type ?? "";
		const dataPointId = result.data_point_id ?? "";
		const isCategory =
			type === "kpi_category" || dataPointId.startsWith("kpi_category");
		const isDriver =
			type === "kpi_driver" || dataPointId.startsWith("kpi_driver");

		if (isCategory) {
			return DeepDiveService.parseNumericPrefix(
				result.value ?? data?.["KPI Score"] ?? null,
			);
		}

		if (isDriver) {
			return DeepDiveService.parseNumericPrefix(
				result.value ?? data?.Score ?? null,
			);
		}

		return null;
	}

	private static buildCategoryMathValidationFromKpiResults(
		kpiResults: CompanyKpiResultRow[],
	): {
		summaryByCompany: Map<number, StaticValidationSummary>;
		detailsByCompany: Map<number, CompanyCategoryMathDetail[]>;
	} {
		const perCompanyCategories = new Map<number, Map<string, number>>();
		const perCompanyDrivers = new Map<number, Map<string, number[]>>();

		for (const result of kpiResults) {
			const companyId = result.company_id;

			if (typeof companyId !== "number") {
				throw new Error(`Invalid company_id in KPI result: ${companyId}`);
			}

			const type = result.data_points?.type ?? "";
			const dataPointId = result.data_point_id ?? "";
			const isCategory =
				type === "kpi_category" || dataPointId.startsWith("kpi_category");
			const isDriver =
				type === "kpi_driver" || dataPointId.startsWith("kpi_driver");
			if (!isCategory && !isDriver) continue;

			const categoryName = DeepDiveService.getKpiResultCategoryName(result);
			if (!categoryName) continue;

			const score = DeepDiveService.getKpiResultScore(result);
			if (score === null) continue;

			if (isCategory) {
				const categoryScores =
					perCompanyCategories.get(companyId) ?? new Map<string, number>();
				if (!categoryScores.has(categoryName)) {
					categoryScores.set(categoryName, score);
				}
				perCompanyCategories.set(companyId, categoryScores);
				continue;
			}

			const driverScoresByCategory =
				perCompanyDrivers.get(companyId) ?? new Map<string, number[]>();
			const existingScores = driverScoresByCategory.get(categoryName) ?? [];
			existingScores.push(score);
			driverScoresByCategory.set(categoryName, existingScores);
			perCompanyDrivers.set(companyId, driverScoresByCategory);
		}

		const summaryByCompany = new Map<number, StaticValidationSummary>();
		const detailsByCompany = new Map<number, CompanyCategoryMathDetail[]>();

		perCompanyCategories.forEach((categoryScores, companyId) => {
			const driverScoresByCategory =
				perCompanyDrivers.get(companyId) ?? new Map();

			const mismatches: CompanyCategoryMathDetail[] = [];

			categoryScores.forEach((currentValue, category) => {
				const driverScores = driverScoresByCategory.get(category) ?? [];
				if (driverScores.length === 0) {
					mismatches.push({
						category,
						currentValue,
						expectedCalculatedValue: null,
						delta: null,
					});
					return;
				}

				const expectedCalculatedValue =
					driverScores.reduce((sum: number, score: number) => sum + score, 0) /
					driverScores.length;
				const delta = currentValue - expectedCalculatedValue;
				if (
					DeepDiveService.roundToOneDecimal(currentValue) ===
					DeepDiveService.roundToOneDecimal(expectedCalculatedValue)
				) {
					return;
				}

				mismatches.push({
					category,
					currentValue,
					expectedCalculatedValue,
					delta,
				});
			});

			summaryByCompany.set(companyId, {
				...DEFAULT_STATIC_VALIDATION,
				categoryMathOk: mismatches.length === 0,
				categoryMathMismatchCount: mismatches.length,
				categoryMathDetails: mismatches,
			});
			detailsByCompany.set(companyId, mismatches);
		});

		return { summaryByCompany, detailsByCompany };
	}

	private static applySourcesUpdate(
		data: Record<string, unknown>,
		sources: string | Record<string, unknown> | unknown[] | null,
		options: { isRaw: boolean },
	): void {
		if (options.isRaw) {
			data.sources = sources;
			delete data.Sources;
			return;
		}

		data.Sources = sources;
		delete data.sources;
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

	private static mapCompanyDataPointResult(
		result: Awaited<
			ReturnType<typeof DeepDiveRepository.updateCompanyDataPointResult>
		>,
	) {
		return {
			id: result.id,
			reportId: result.report_id,
			companyId: result.company_id,
			dataPointId: result.data_point_id,
			type: result.data_points?.type ?? null,
			value: result.value,
			manualValue: result.manualValue,
			status: result.status,
			data: result.data,
			updatedAt: result.updates_at,
		};
	}

	private static isManualCompanyDataPointShape(
		dataPointId: string,
		dataPointType: string,
	): boolean {
		return (
			(dataPointType === "raw_data_point" &&
				dataPointId.startsWith("raw_data_point_")) ||
			(dataPointType === "kpi_driver" && dataPointId.startsWith("kpi_driver_"))
		);
	}

	private static deriveValueFromRawData(
		raw: Record<string, unknown>,
		flags: { isCategory?: boolean; isDriver?: boolean; isRaw?: boolean },
	): { value?: string | null; manualValue?: string | null } {
		const toStr = (v: unknown): string | null => (v != null ? String(v) : null);
		if (flags.isCategory) return { value: toStr(raw["KPI Score"]) };
		if (flags.isDriver) return { value: toStr(raw.Score) };
		if (flags.isRaw) {
			const tv = toStr(raw.answer);
			return { value: tv, manualValue: tv };
		}
		return {};
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

		if (payload.rawData !== undefined) {
			const raw = payload.rawData;
			const updated = await DeepDiveRepository.updateCompanyDataPointResult(
				resultId,
				{
					data: raw as unknown as CompanyDataPointResultUpdateData["data"],
					...(payload.status !== undefined && { status: payload.status }),
					...DeepDiveService.deriveValueFromRawData(raw, {
						isCategory,
						isDriver,
						isRaw,
					}),
				},
			);
			return {
				success: true as const,
				data: DeepDiveService.mapCompanyDataPointResult(updated),
			};
		}

		const mutableData: ManualDataPointResultBuilder =
			DeepDiveService.isJsonObject(existing.data) ? { ...existing.data } : {};

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
					: typeof payload.sources === "string"
						? DeepDiveService.normalizeTextInput(payload.sources)
						: payload.sources;

			DeepDiveService.applySourcesUpdate(mutableData, sources, { isRaw });
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
				mutableData.Score = normalizedScore.textValue;
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
			data: DeepDiveService.mapCompanyDataPointResult(updated),
		};
	}

	static async createManualCompanyDataPoint(
		reportId: number,
		companyId: number,
		payload: CreateCompanyDataPointPayload,
	) {
		const company = await DeepDiveRepository.getCompany(reportId, companyId);
		if (!company) return null;

		const dataPointId = payload.dataPointId.trim();
		if (!dataPointId) {
			return { success: false as const, error: "dataPointId is required" };
		}

		const existing = await DeepDiveRepository.getReportModelItem(
			reportId,
			dataPointId,
		);
		if (!existing?.data_points) {
			return { success: false as const, error: "Model item not found" };
		}

		const dataPoint = existing.data_points;
		const dataPointType = dataPoint.type ?? "";
		if (dataPoint.manual_method !== true) {
			return {
				success: false as const,
				error: "Only manual data points can be added from company detail",
			};
		}

		if (
			!DeepDiveService.isManualCompanyDataPointShape(dataPointId, dataPointType)
		) {
			return {
				success: false as const,
				error:
					"Manual company data points must be raw_data_point_* or kpi_driver_* and match their model type",
			};
		}
		const isDriver = dataPointType === "kpi_driver";
		const isRaw = dataPointType === "raw_data_point";

		const duplicate = await DeepDiveRepository.getCompanyKpiResults(
			reportId,
			companyId,
		);
		if (duplicate.some((row) => row.data_point_id === dataPointId)) {
			return {
				success: false as const,
				error: "Data point result already exists for this company",
			};
		}

		if (payload.rawData !== undefined) {
			const raw = payload.rawData;
			const created = await DeepDiveRepository.createCompanyDataPointResult({
				reportId,
				companyId,
				dataPointId,
				data: raw as Prisma.InputJsonValue,
				status: payload.status ?? true,
				...DeepDiveService.deriveValueFromRawData(raw, { isDriver, isRaw }),
			});
			return {
				success: true as const,
				data: DeepDiveService.mapCompanyDataPointResult(created),
			};
		}

		const mutableData: ManualDataPointResultBuilder = asSettingsRecord(
			dataPoint.settings,
		)
			? { ...(dataPoint.settings as Record<string, unknown>) }
			: {};
		let value: string | null = null;
		let manualValue: string | null = null;

		if (payload.reasoning !== undefined) {
			const reasoning =
				payload.reasoning === null
					? null
					: DeepDiveService.normalizeTextInput(payload.reasoning);
			if (isRaw) mutableData.explanation = reasoning;
			mutableData.Reasoning = reasoning;
		}

		if (payload.sources !== undefined) {
			const sources =
				payload.sources === null
					? null
					: typeof payload.sources === "string"
						? DeepDiveService.normalizeTextInput(payload.sources)
						: payload.sources;
			DeepDiveService.applySourcesUpdate(mutableData, sources, { isRaw });
		}

		if (isDriver) {
			const normalizedKpiScore =
				DeepDiveService.normalizeKpiScoreInput(payload);
			if (!normalizedKpiScore.success) {
				return {
					success: false as const,
					error: normalizedKpiScore.error || "Invalid KPI score payload",
				};
			}
			if (normalizedKpiScore.provided) {
				value = normalizedKpiScore.concatenatedValue ?? null;
				mutableData.Score = value;
			}
			mutableData["Metric (KPI Driver)"] =
				mutableData["Metric (KPI Driver)"] ?? dataPoint.name ?? dataPointId;
		}

		if (isRaw) {
			mutableData.raw_data_point =
				mutableData.raw_data_point ?? dataPoint.name ?? dataPointId;
			if (payload.score !== undefined) {
				const normalizedScore = DeepDiveService.normalizeRawScoreInput(
					payload.score,
				);
				if (!normalizedScore) {
					return {
						success: false as const,
						error: "score must be a finite number, string, or null",
					};
				}
				value = normalizedScore.textValue;
				manualValue = normalizedScore.textValue;
				mutableData.answer =
					normalizedScore.numericValue ?? normalizedScore.textValue;
			}
		}

		const created = await DeepDiveRepository.createCompanyDataPointResult({
			reportId,
			companyId,
			dataPointId,
			value,
			manualValue,
			data: mutableData as Prisma.InputJsonValue,
			status: payload.status ?? true,
		});

		return {
			success: true as const,
			data: DeepDiveService.mapCompanyDataPointResult(created),
		};
	}

	static async getSettings(reportId: number) {
		const [snapshot, allUseCases, allCountries, selectedCountryIds] =
			await Promise.all([
				DeepDiveRepository.getReportSettingsSnapshot(reportId),
				DeepDiveRepository.listAllUseCases(),
				DeepDiveRepository.listAllCountries(),
				DeepDiveRepository.getReportCountryIds(reportId),
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
				countries: {
					all: allCountries.map(
						(country: { id: string; country_name: string }) => ({
							id: country.id,
							name: country.country_name,
						}),
					),
					selected: selectedCountryIds,
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

		if (payload.countryIds !== undefined) {
			await DeepDiveRepository.syncReportCountries(
				reportId,
				payload.countryIds,
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

	static async importKpiModel(
		reportId: number,
		dataPoints: ImportedModelDataPoint[],
	) {
		const report = await DeepDiveRepository.getReportById(reportId);
		if (!report)
			return { success: false as const, error: "Deep dive not found" };

		if (report.report_type !== "biz_miner") {
			return {
				success: false as const,
				error: "Model page is available only for biz_miner reports",
			};
		}

		if (!dataPoints.length) {
			return { success: false as const, error: "No data points provided" };
		}

		const importedCategories =
			DeepDiveService.buildImportedKpiCategories(dataPoints);

		await DeepDiveRepository.upsertDataPointsAndAppendToModel(reportId, [
			...dataPoints,
			...importedCategories,
		]);
		return DeepDiveService.getReportModel(reportId);
	}

	private static buildImportedKpiCategories(
		dataPoints: ImportedModelDataPoint[],
	): ImportedModelDataPoint[] {
		const existingIds = new Set(dataPoints.map((dp) => dp.id));
		const categoryMap = new Map<string, ImportedModelDataPoint>();

		dataPoints.forEach((dp) => {
			if (dp.type !== "kpi_driver") return;

			const categoryValue = dp.settings["KPI Category"];
			if (typeof categoryValue !== "string") return;

			const category = categoryValue.trim();
			if (!category) return;

			const categoryId = `kpi_category_${category}`;
			if (existingIds.has(categoryId) || categoryMap.has(categoryId)) return;

			categoryMap.set(categoryId, {
				id: categoryId,
				type: "kpi_category",
				name: category,
				settings: {
					"KPI Category": category,
				},
			});
		});

		return Array.from(categoryMap.values());
	}

	static async updateReportModelItem(
		reportId: number,
		payload: UpdateReportModelItemPayload,
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

		const dataPointId = payload.dataPointId.trim();
		if (!dataPointId) {
			return { success: false as const, error: "dataPointId is required" };
		}

		const existing = await DeepDiveRepository.getReportModelItem(
			reportId,
			dataPointId,
		);
		if (!existing?.data_points) {
			return { success: false as const, error: "Model item not found" };
		}

		const updateData: {
			name?: string | null;
			settings?: Prisma.InputJsonValue;
			manual_method?: boolean | null;
		} = {};

		if (payload.name !== undefined) {
			const normalized = payload.name?.trim() ?? null;
			updateData.name = normalized || null;
		}

		if (payload.settings !== undefined) {
			updateData.settings = asInputJsonObject(payload.settings);
		}

		if (payload.manualMethod !== undefined) {
			updateData.manual_method = payload.manualMethod;
		}

		await DeepDiveRepository.updateReportModelItem(dataPointId, updateData);
		return DeepDiveService.getReportModel(reportId);
	}

	static async deleteReportModelItem(reportId: number, dataPointIdRaw: string) {
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

		const dataPointId = dataPointIdRaw.trim();
		if (!dataPointId) {
			return { success: false as const, error: "dataPointId is required" };
		}

		const existing = await DeepDiveRepository.getReportModelItem(
			reportId,
			dataPointId,
		);
		if (!existing?.data_points) {
			return { success: false as const, error: "Model item not found" };
		}

		await DeepDiveRepository.deleteReportModelItem(reportId, dataPointId);
		return DeepDiveService.getReportModel(reportId);
	}

	static async createReportModelItem(
		reportId: number,
		payload: CreateReportModelItemPayload,
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

		const dataPointId = payload.dataPointId.trim();
		if (!dataPointId) {
			return { success: false as const, error: "dataPointId is required" };
		}

		const type = payload.type.trim();
		if (type !== "kpi_driver" && type !== "raw_data_point") {
			return {
				success: false as const,
				error: "type must be kpi_driver or raw_data_point",
			};
		}

		const existing = await DeepDiveRepository.getDataPointsByIds([dataPointId]);
		if (existing.length > 0) {
			return { success: false as const, error: "dataPointId already exists" };
		}

		await DeepDiveRepository.createReportModelItem(reportId, {
			dataPointId,
			type,
			name: payload.name?.trim() || null,
			settings: asInputJsonObject(payload.settings),
			manualMethod: payload.manualMethod,
		});

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

	private static evaluateDopEligibility(
		stats: DopExportStatsRow | undefined,
	): DopEligibility {
		if (!stats) return { eligible: false, reason: "Report does not exist." };
		if (stats.report_type !== "sales_miner") {
			return { eligible: false, reason: "Report is not SalesMiner." };
		}
		if (!stats.has_started) {
			return { eligible: false, reason: "Report has not started." };
		}
		if (stats.completed_companies_count < 1) {
			return {
				eligible: false,
				reason: "Report has no completed companies.",
			};
		}
		return { eligible: true };
	}

	private static buildDopExportStatus(stats: DopExportStatsRow | undefined) {
		const completedCompaniesCount = stats?.completed_companies_count ?? 0;
		const hasStarted = stats?.has_started ?? false;
		const eligibility = DeepDiveService.evaluateDopEligibility(stats);
		return {
			dopExportEligible: eligibility.eligible,
			dopExportHasStarted: hasStarted,
			completedCompaniesCount,
		};
	}

	static async getSalesMinerDopExportValidation(reportIds: number[]) {
		const stats =
			await DeepDiveRepository.getSalesMinerDopExportStats(reportIds);
		const statsByReport = new Map(stats.map((row) => [row.report_id, row]));
		const invalidReports: Array<{ report_id: number; reason: string }> = [];

		for (const reportId of reportIds) {
			const row = statsByReport.get(reportId);
			const eligibility = DeepDiveService.evaluateDopEligibility(row);
			if (!eligibility.eligible) {
				invalidReports.push({
					report_id: reportId,
					reason: eligibility.reason,
				});
			}
		}

		return { invalidReports };
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

	private static buildStatusByCompany(
		rows: Array<{
			company_id: number;
			status: report_status_enum;
			_count: { _all: number };
		}>,
	): Map<number, Record<report_status_enum, number>> {
		const statusByCompany = new Map<
			number,
			Record<report_status_enum, number>
		>();

		rows.forEach((row) => {
			const current = statusByCompany.get(row.company_id) ?? {
				...DEFAULT_STATUS_COUNTS,
			};
			current[row.status] = row._count._all;
			statusByCompany.set(row.company_id, current);
		});

		return statusByCompany;
	}

	private static buildStaticValidationMap(
		categoryMathByCompany: Map<number, StaticValidationSummary>,
		missingRows: MissingReportDataPointsRow[],
	): Map<number, StaticValidationSummary> {
		const validations = new Map<number, StaticValidationSummary>();

		categoryMathByCompany.forEach((summary, companyId) => {
			validations.set(companyId, { ...summary });
		});

		missingRows.forEach((row) => {
			const current = validations.get(row.company_id) ?? {
				...DEFAULT_STATIC_VALIDATION,
			};
			current.missingReportDataPointsCount = row.missing_count;
			current.missingReportDataPointIds = row.missing_data_point_ids;
			current.hasMissingReportDataPoints = row.missing_count > 0;
			validations.set(row.company_id, current);
		});

		return validations;
	}

	private static buildDeepDiveCompanyRows({
		companies,
		statusByCompany,
		totalStepsCount,
		sourcesMap,
		validSourcesMap,
		usedSourcesMap,
		companyLevelReportFilesMap,
		staticValidationMap,
	}: {
		companies: Awaited<
			ReturnType<typeof DeepDiveRepository.getReportCompanies>
		>;
		statusByCompany: Map<number, Record<report_status_enum, number>>;
		totalStepsCount: number;
		sourcesMap: Map<number, number>;
		validSourcesMap?: Map<number, number>;
		usedSourcesMap?: Map<number, number>;
		companyLevelReportFilesMap: Map<number, number>;
		staticValidationMap?: Map<number, StaticValidationSummary>;
	}) {
		return companies
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
					listed: company.listed,
					countryCode: company.country_code,
					url: company.url,
					status: DeepDiveService.deriveDominantStatus(counts, totalStepsCount),
					sourcesCount: sourcesMap.get(company.id) ?? 0,
					validSourcesCount: validSourcesMap?.get(company.id) ?? 0,
					usedSourcesCount: usedSourcesMap?.get(company.id) ?? 0,
					candidatesCount: 0,
					companyLevelReportFilesCount:
						companyLevelReportFilesMap.get(company.id) ?? 0,
					stepsDone: doneSteps,
					stepsTotal: totalStepsCount,
					staticValidation:
						staticValidationMap?.get(company.id) ?? DEFAULT_STATIC_VALIDATION,
				};
			});
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

		const reportIds = items.map((report) => report.id);
		const [costRows, dopExportStatsRows] = await Promise.all([
			ReportStepsRepository.getReportCostSummaryBatch(reportIds),
			DeepDiveRepository.getSalesMinerDopExportStats(reportIds),
		]);
		const dopExportStats = dopExportStatsRows ?? [];
		const costByReport = new Map(
			costRows.map((row) => [
				row.report_id,
				{
					totalCost: Number(row.total_cost),
					callsWithoutPricing: Number(row.calls_without_pricing),
				},
			]),
		);
		const dopExportByReport = new Map(
			dopExportStats.map((row) => [row.report_id, row]),
		);

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
						...DeepDiveService.buildDopExportStatus(
							dopExportByReport.get(report.id),
						),
						cost: costByReport.get(report.id) ?? null,
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

		const dopExportStats =
			(await DeepDiveRepository.getSalesMinerDopExportStats([reportId])) ?? [];

		return {
			success: true,
			data: {
				report: {
					...DeepDiveService.mapOverviewReport(report),
					...DeepDiveService.buildDopExportStatus(dopExportStats[0]),
				},
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
				const reportDataPointSources =
					await DeepDiveRepository.getReportDataPointSources(reportId);
				value = DeepDiveService.countUniqueReportDataPointSources(
					reportDataPointSources,
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

		const [
			companyStatusRaw,
			reportDataPointSources,
			totalStepsCount,
			companyLevelReportFileCounts,
			companyKpiResults,
			missingReportDataPoints,
		] = await Promise.all([
			DeepDiveRepository.getCompanyStepStatusSummary(reportId, companyIds),
			DeepDiveRepository.getReportDataPointSources(reportId),
			DeepDiveRepository.getReportStepsCount(reportId),
			DeepDiveRepository.getCompanyLevelReportFileCounts(reportId),
			DeepDiveRepository.getCompaniesKpiResults(reportId, companyIds),
			DeepDiveRepository.getMissingReportDataPointsByCompany(
				reportId,
				companyIds,
			),
		]);

		const statusByCompany =
			DeepDiveService.buildStatusByCompany(companyStatusRaw);

		const sourcesMap = DeepDiveService.buildSourcesCountByCompany(
			reportDataPointSources,
		);
		const companyLevelReportFilesMap = new Map(
			companyLevelReportFileCounts.map((row) => [
				row.company_id,
				Number(row.files_count),
			]),
		);
		const { summaryByCompany: categoryMathByCompany } =
			DeepDiveService.buildCategoryMathValidationFromKpiResults(
				companyKpiResults,
			);
		const staticValidationMap = DeepDiveService.buildStaticValidationMap(
			categoryMathByCompany,
			missingReportDataPoints,
		);

		return {
			success: true,
			data: {
				reportId,
				companies: DeepDiveService.buildDeepDiveCompanyRows({
					companies,
					statusByCompany,
					totalStepsCount,
					sourcesMap,
					companyLevelReportFilesMap,
					staticValidationMap,
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
			reportDataPointSourcesForSummary,
			totalScrapeCandidates,
			totalQueries,
			companyStatusRaw,
			perCompanySources,
			perCompanyUsedSources,
			companyLevelReportFileCounts,
			companyKpiResults,
			missingReportDataPoints,
		] = await Promise.all([
			DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
			DeepDiveRepository.getReportSourcesCount(reportId, sourceCountingContext),
			DeepDiveRepository.getReportDataPointSources(reportId),
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
			DeepDiveRepository.getCompanyLevelReportFileCounts(reportId),
			DeepDiveRepository.getCompaniesKpiResults(reportId, companyIds),
			DeepDiveRepository.getMissingReportDataPointsByCompany(
				reportId,
				companyIds,
			),
		]);
		const totalUsedSources = DeepDiveService.countUniqueReportDataPointSources(
			reportDataPointSourcesForSummary,
		);

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
		const statusByCompany =
			DeepDiveService.buildStatusByCompany(companyStatusRaw);

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
		const companyLevelReportFilesMap = new Map(
			companyLevelReportFileCounts.map((row) => [
				row.company_id,
				Number(row.files_count),
			]),
		);
		const staticValidationMap = DeepDiveService.buildStaticValidationMap(
			DeepDiveService.buildCategoryMathValidationFromKpiResults(
				companyKpiResults,
			).summaryByCompany,

			missingReportDataPoints,
		);

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
				companies: DeepDiveService.buildDeepDiveCompanyRows({
					companies,
					statusByCompany,
					totalStepsCount,
					sourcesMap,
					validSourcesMap,
					usedSourcesMap,
					companyLevelReportFilesMap,
					staticValidationMap,
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
			manualModelItems,
		] = await Promise.all([
			DeepDiveRepository.getCompanyStepStatuses(reportId, companyId),
			DeepDiveRepository.getCompanyKpiResults(reportId, companyId),
			DeepDiveRepository.getCompanyScrapCandidates(reportId, companyId, 200),
			DeepDiveRepository.getCompanyScrapCandidatesCount(reportId, companyId),
			DeepDiveRepository.getCompanySources(reportId, companyId, filters),
			DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
			DeepDiveRepository.getManualReportModelItems(reportId),
		]);
		const { detailsByCompany: categoryMathDetailsByCompany } =
			DeepDiveService.buildCategoryMathValidationFromKpiResults(kpiResults);
		const categoryMathDebug = categoryMathDetailsByCompany.get(companyId) ?? [];

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
					listed: company.listed,
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
				staticValidationDebug: {
					categoryMath: categoryMathDebug.map((row) => ({
						category: row.category,
						currentValue: row.currentValue,
						expectedCalculatedValue: row.expectedCalculatedValue,
						delta: row.delta,
					})),
				},
				manualDataPoints: manualModelItems
					.filter((row) =>
						DeepDiveService.isManualCompanyDataPointShape(
							row.data_point_id ?? "",
							row.data_points?.type ?? "",
						),
					)
					.map((row) => ({
						dataPointId: row.data_point_id ?? "",
						name: row.data_points?.name ?? null,
						type: row.data_points?.type ?? null,
						settings: asSettingsRecord(row.data_points?.settings),
						manualMethod: row.data_points?.manual_method ?? null,
						resultId:
							kpiResults.find(
								(result) => result.data_point_id === row.data_point_id,
							)?.id ?? null,
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

		const customerId =
			isRecord(settings) && typeof settings.customer_id === "number"
				? settings.customer_id
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
					customerId,
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
						listed: c.listed,
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
				customerId,
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
					listed: c.listed,
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
					listed: boolean;
					url?: string | null;
					countryCode?: string | null;
					industryId?: number | null;
					investPortal?: string | null;
					careerPortal?: string | null;
					slug?: string | null;
					reportRole?: string | null;
					additionalData?: unknown;
					parentCompanyId?: number | null;
			  },
	) {
		if (payload.mode === "existing") {
			await DeepDiveRepository.linkCompanyToReport(reportId, payload.companyId);
			return { success: true };
		}

		return DeepDiveService.createCompany({ ...payload, reportId });
	}

	static async createCompany(payload: {
		name: string;
		listed: boolean;
		url?: string | null;
		logoUrl?: string | null;
		countryCode?: string | null;
		industryId?: number | null;
		gicsCode?: string | null;
		investPortal?: string | null;
		careerPortal?: string | null;
		slug?: string | null;
		reportRole?: string | null;
		additionalData?: unknown;
		parentCompanyId?: number | null;
		reportId?: number | null;
		verified?: boolean;
	}) {
		if (typeof payload.listed !== "boolean") {
			return { success: false, error: "listed is required" };
		}

		const company = await DeepDiveRepository.createCompanyAndLink(
			payload.reportId ?? null,
			{
				name: payload.name,
				listed: payload.listed,
				url: payload.url,
				logoUrl: payload.logoUrl,
				countryCode: payload.countryCode,
				industryId: payload.industryId,
				gicsCode: payload.gicsCode,
				investPortal: payload.investPortal,
				careerPortal: payload.careerPortal,
				slug: payload.slug,
				reportRole: payload.reportRole,
				additionalData: payload.additionalData,
				parentCompanyId: payload.parentCompanyId,
				verified: payload.verified,
			},
		);

		return {
			success: true,
			data: {
				companyId: company.id,
				name: company.name,
				listed: company.listed,
				countryCode: company.country_code,
				url: company.url,
				logoUrl: company.logo_url,
				gicsCode: company.gics_code,
				verified: company.verified,
			},
		};
	}

	static async getCompanyByIdGeneric(companyId: number) {
		const company = await DeepDiveRepository.getCompanyByIdGeneric(companyId);
		if (!company) return null;
		return {
			success: true,
			data: {
				id: company.id,
				name: company.name,
				listed: company.listed,
				url: company.url,
				logoUrl: company.logo_url,
				countryCode: company.country_code,
				industryId: company.industry_id,
				gicsCode: company.gics_code,
				investPortal: company.invest_portal,
				careerPortal: company.career_portal,
				slug: company.slug,
				reportRole: company.report_role,
				additionalData: company.additional_data,
				parentCompanyId: company.parent_company,
				verified: company.verified,
			},
		};
	}

	static async updateCompany(
		reportId: number,
		companyId: number,
		data: {
			name?: string;
			listed?: boolean | null;
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
		if (
			data.listed !== undefined &&
			data.listed !== null &&
			typeof data.listed !== "boolean"
		) {
			return { success: false, error: "listed must be true, false, or null" };
		}

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
				listed: c.listed,
				countryCode: c.country_code,
				url: c.url,
				verified: c.verified,
			})),
		};
	}

	static async updateCompanyGeneric(
		companyId: number,
		data: {
			name?: string;
			listed?: boolean | null;
			url?: string | null;
			logoUrl?: string | null;
			countryCode?: string | null;
			industryId?: number | null;
			gicsCode?: string | null;
			investPortal?: string | null;
			careerPortal?: string | null;
			slug?: string | null;
			reportRole?: string | null;
			additionalData?: unknown;
			parentCompanyId?: number | null;
			verified?: boolean;
		},
	) {
		const company = await DeepDiveRepository.updateCompanyGeneric(
			companyId,
			data,
		);
		return {
			success: true,
			data: {
				companyId: company.id,
				name: company.name,
				listed: company.listed,
				countryCode: company.country_code,
				url: company.url,
				logoUrl: company.logo_url,
				gicsCode: company.gics_code,
				verified: company.verified,
			},
		};
	}

	static async getSalesMinerSignalStats(reportId: number) {
		const rows = await DeepDiveRepository.getSalesMinerSignalStats(reportId);
		return {
			success: true,
			data: rows.map((r) => ({
				signalDefinitionId: Number(r.signal_definition_id),
				signalTypeName: r.signal_type_name,
				signalDefinitionName: r.signal_definition_name,
				researchedContextCount: Number(r.researched_context_count),
				decisionContextCount: Number(r.decision_context_count),
				researchedButNotSelectedContextCount: Number(
					r.researched_but_not_selected_context_count,
				),
				usedSeedCount: Number(r.used_seed_count),
				finalOpportunityCount: Number(r.final_opportunity_count),
				top10OpportunityCount: Number(r.top10_opportunity_count),
				deepDiveOpportunityCount: Number(r.deep_dive_opportunity_count),
				usedEffectiveSignalScore: Number(r.used_effective_signal_score),
				top10EffectiveSignalScore: Number(r.top10_effective_signal_score),
				avgEffectiveSignalScore: Number(r.avg_effective_signal_score),
				totalConfirmationCount:
					r.total_confirmation_count != null
						? Number(r.total_confirmation_count)
						: null,
				avgEvidenceStrengthScore: Number(r.avg_evidence_strength_score),
				avgEvidenceConfidenceScore: Number(r.avg_evidence_confidence_score),
				avgEvidenceFreshnessScore: Number(r.avg_evidence_freshness_score),
				latestEffectiveDate: r.latest_effective_date?.toISOString() ?? null,
				selectedOpportunitySpaces: r.selected_opportunity_spaces ?? [],
				signalEffectivenessClass: r.signal_effectiveness_class,
			})),
		};
	}

	static async getValidationSummary(reportId: number) {
		return ValidationService.getValidationSummary(reportId);
	}

	static async getReportValidationRules(reportId: number) {
		return ValidationService.getReportValidationRules(reportId);
	}

	static async addReportValidationRule(reportId: number, ruleId: number) {
		await ValidationService.addReportValidationRule(reportId, ruleId);
	}

	static async removeReportValidationRule(reportId: number, ruleId: number) {
		await ValidationService.removeReportValidationRule(reportId, ruleId);
	}

	static async updateValidationRule(id: number, params: ValidationRulePayload) {
		await ValidationService.updateValidationRule(id, params);
	}

	static async createValidationRule(params: ValidationRulePayload) {
		return ValidationService.createValidationRule(params);
	}

	static async getValidationByCompany(
		reportId: number,
		companyId: number,
		status?: ValidationStatus,
	) {
		return ValidationService.getValidationByCompany(
			reportId,
			companyId,
			status,
		);
	}

	static async updateValidationCheckManually(
		reportId: number,
		companyId: number,
		validationId: number,
		payload: ValidationManualUpdatePayload,
	) {
		return ValidationService.updateValidationCheckManually(
			reportId,
			companyId,
			validationId,
			payload,
		);
	}

	// --- Opportunity FIFA-style cards -------------------------------------

	private static clampStat(value: number): number {
		if (!Number.isFinite(value)) return 0;
		return Math.max(0, Math.min(99, Math.round(value)));
	}

	private static dealSizeToStat(band: string | null): {
		value: number;
		raw: string | null;
	} {
		const key = (band ?? "").toLowerCase();
		if (key.includes(">1m") || key.includes("1m+"))
			return { value: 99, raw: band };
		if (key.includes("250k-1m")) return { value: 85, raw: band };
		if (key.includes("50k-250k")) return { value: 65, raw: band };
		if (key.includes("<50k")) return { value: 45, raw: band };
		return { value: band ? 55 : 0, raw: band };
	}

	private static stageToStat(stage: string | null): number {
		switch ((stage ?? "").toLowerCase()) {
			case "lead":
				return 45;
			case "discovery":
				return 70;
			case "qualified":
				return 82;
			case "proposal":
				return 90;
			case "won":
				return 99;
			default:
				return stage ? 60 : 0;
		}
	}

	private static tierForScore(overall: number): OpportunityCardTier {
		if (overall >= 75) return "gold";
		if (overall >= 50) return "silver";
		return "bronze";
	}

	private static buildOpportunityCard(row: {
		id: bigint;
		title: string;
		rank_position: number | null;
		motion_family: string | null;
		stage: string | null;
		status: string | null;
		deal_size_general: string | null;
		horizon_name: string | null;
		priority_score: number;
		confidence_score: number;
		stakeholder_count: number;
		product_count: number;
		deep_dive_property_count: number;
		company_name: string | null;
		company_logo_url: string | null;
		is_approved: boolean | null;
	}): OpportunityCard {
		const overall = DeepDiveService.clampStat(row.priority_score);
		const confidencePct = Math.round((row.confidence_score ?? 0) * 100);
		const deal = DeepDiveService.dealSizeToStat(row.deal_size_general);

		const stats: OpportunityCardStat[] = [
			{
				key: "confidence",
				label: "CNF",
				title: "Confidence",
				value: DeepDiveService.clampStat(confidencePct),
				raw: `${confidencePct}%`,
			},
			{
				key: "committee",
				label: "CMT",
				title: "Buying committee",
				value: DeepDiveService.clampStat(row.stakeholder_count * 16),
				raw: row.stakeholder_count,
			},
			{
				key: "value",
				label: "VAL",
				title: "Deal value",
				value: DeepDiveService.clampStat(deal.value),
				raw: deal.raw,
			},
			{
				key: "bundle",
				label: "BND",
				title: "Bundle breadth",
				value: DeepDiveService.clampStat(row.product_count * 22 + 30),
				raw: row.product_count,
			},
			{
				key: "depth",
				label: "DPT",
				title: "Deep-dive depth",
				value: DeepDiveService.clampStat(
					(row.deep_dive_property_count / 19) * 99,
				),
				raw: row.deep_dive_property_count,
			},
			{
				key: "stage",
				label: "STG",
				title: "Stage progression",
				value: DeepDiveService.clampStat(
					DeepDiveService.stageToStat(row.stage),
				),
				raw: row.stage,
			},
		];

		return {
			id: row.id.toString(),
			title: row.title,
			rankPosition: row.rank_position,
			companyName: row.company_name,
			companyLogoUrl: row.company_logo_url?.trim() || null,
			motionFamily: row.motion_family,
			stage: row.stage,
			status: row.status,
			dealSize: row.deal_size_general,
			horizonName: row.horizon_name,
			overall,
			tier: DeepDiveService.tierForScore(overall),
			stats,
			stakeholderCount: row.stakeholder_count,
			productCount: row.product_count,
			isApproved: row.is_approved ?? false,
		};
	}

	static async setOpportunityCandidateApproval(
		opportunityId: bigint,
		isApproved: boolean,
	): Promise<void> {
		await DeepDiveRepository.setOpportunityCandidateApproval(
			opportunityId,
			isApproved,
		);
	}

	static async getCompanyOpportunityCards(
		reportId: number,
		companyId: number,
	): Promise<OpportunityCardsResponse> {
		const rows = await DeepDiveRepository.getCompanyOpportunityCards(
			reportId,
			companyId,
		);
		const cards = rows.map((row) => DeepDiveService.buildOpportunityCard(row));
		return {
			success: true,
			data: {
				reportId,
				companyId,
				companyName: cards[0]?.companyName ?? null,
				companyLogoUrl: cards[0]?.companyLogoUrl ?? null,
				cards,
			},
		};
	}

	private static buildOpportunityBaseFields(row: {
		title: string;
		primary_business_problem: string | null;
		primary_value_proposition: string | null;
		why_now: string | null;
		notes: string | null;
	}): OpportunityNarrativeField[] {
		return DeepDiveService.OPPORTUNITY_BASE_TEXT_FIELDS.map((def) => ({
			source: "base",
			field: def.field,
			label: def.label,
			value: row[def.key],
		}));
	}

	private static buildOpportunityDeepDiveFields(
		propertyRows: Awaited<
			ReturnType<typeof DeepDiveRepository.getOpportunityDeepDiveProperties>
		>,
	): OpportunityNarrativeField[] {
		const byKey = new Map(propertyRows.map((row) => [row.property_key, row]));
		return DeepDiveService.OPPORTUNITY_DEEP_DIVE_TEXT_FIELDS.flatMap((def) => {
			const row = byKey.get(def.field);
			if (!row || typeof row.value_json !== "string") return [];
			return [
				{
					source: "deepDive" as const,
					field: def.field,
					label: def.label,
					value: row.value_json,
				},
			];
		});
	}

	private static isEditableOpportunityField(
		source: OpportunityNarrativeFieldSource,
		field: string,
	): boolean {
		if (source === "base") {
			return DeepDiveService.OPPORTUNITY_BASE_TEXT_FIELDS.some(
				(def) => def.field === field,
			);
		}

		return DeepDiveService.OPPORTUNITY_DEEP_DIVE_TEXT_FIELDS.some(
			(def) => def.field === field,
		);
	}

	private static opportunityFieldLabel(
		source: OpportunityNarrativeFieldSource,
		field: string,
	): string {
		const defs =
			source === "base"
				? DeepDiveService.OPPORTUNITY_BASE_TEXT_FIELDS
				: DeepDiveService.OPPORTUNITY_DEEP_DIVE_TEXT_FIELDS;
		return defs.find((def) => def.field === field)?.label ?? field;
	}

	static async getOpportunityDetail(
		reportId: number,
		companyId: number,
		opportunityId: bigint,
	): Promise<OpportunityDetailResponse | null> {
		const base = await DeepDiveRepository.getOpportunityDetailBase(
			reportId,
			companyId,
			opportunityId,
		);
		if (!base) return null;

		const propertyRows =
			await DeepDiveRepository.getOpportunityDeepDiveProperties(opportunityId);
		const editableDeepDiveKeys = new Set<string>(
			DeepDiveService.OPPORTUNITY_DEEP_DIVE_TEXT_FIELDS.map((def) => def.field),
		);
		const structuredBlocks = propertyRows
			.filter((row) => !editableDeepDiveKeys.has(row.property_key))
			.filter((row) =>
				Object.prototype.hasOwnProperty.call(
					DeepDiveService.OPPORTUNITY_STRUCTURED_LABELS,
					row.property_key,
				),
			)
			.map((row) => ({
				key: row.property_key,
				label:
					DeepDiveService.OPPORTUNITY_STRUCTURED_LABELS[row.property_key] ??
					row.property_key,
				group: row.property_group,
				value: row.value_json,
				status: row.status,
			}));

		return {
			success: true,
			data: {
				reportId,
				companyId,
				opportunityId: base.id.toString(),
				companyName: base.company_name,
				companyLogoUrl: base.company_logo_url?.trim() || null,
				header: {
					title: base.title,
					rankPosition: base.rank_position,
					motionFamily: base.motion_family,
					stage: base.stage,
					status: base.status,
					dealSize: base.deal_size_general,
					horizonName: base.horizon_name,
					priorityScore: DeepDiveService.clampStat(base.priority_score),
					confidenceScore: base.confidence_score,
					isApproved: base.is_approved ?? false,
				},
				baseFields: DeepDiveService.buildOpportunityBaseFields(base),
				deepDiveFields:
					DeepDiveService.buildOpportunityDeepDiveFields(propertyRows),
				structuredBlocks,
				competitiveAwareness: base.competitive_awareness,
			},
		};
	}

	static async updateOpportunityNarrativeField(
		reportId: number,
		companyId: number,
		opportunityId: bigint,
		payload: UpdateOpportunityNarrativeFieldPayload,
	): Promise<UpdateOpportunityNarrativeFieldResponse | null> {
		const base = await DeepDiveRepository.getOpportunityDetailBase(
			reportId,
			companyId,
			opportunityId,
		);
		if (!base) return null;

		if (payload.source !== "base" && payload.source !== "deepDive") {
			return {
				success: false,
				error: "Invalid field source",
				errorCode: "INVALID_SOURCE",
			};
		}

		if (
			!DeepDiveService.isEditableOpportunityField(payload.source, payload.field)
		) {
			return {
				success: false,
				error: "Field is not editable",
				errorCode: "FIELD_NOT_EDITABLE",
			};
		}

		if (typeof payload.value !== "string") {
			return {
				success: false,
				error: "Field value must be a string",
				errorCode: "INVALID_VALUE_TYPE",
			};
		}

		const value = payload.value.trim();
		if (!value) {
			return {
				success: false,
				error: "Field value cannot be empty",
				errorCode: "EMPTY_VALUE",
			};
		}

		const updatedCount =
			payload.source === "base"
				? await DeepDiveRepository.updateOpportunityBaseTextField(
						reportId,
						companyId,
						opportunityId,
						payload.field,
						value,
					)
				: await DeepDiveRepository.updateOpportunityDeepDiveTextField(
						reportId,
						companyId,
						opportunityId,
						payload.field,
						value,
					);

		if (updatedCount === 0) {
			return {
				success: false,
				error:
					payload.source === "deepDive"
						? "Deep-dive field is not available for this opportunity"
						: "Opportunity field is not available",
				errorCode: "FIELD_NOT_AVAILABLE",
			};
		}

		return {
			success: true,
			data: {
				field: {
					source: payload.source,
					field: payload.field,
					label: DeepDiveService.opportunityFieldLabel(
						payload.source,
						payload.field,
					),
					value,
				},
			},
		};
	}
}
