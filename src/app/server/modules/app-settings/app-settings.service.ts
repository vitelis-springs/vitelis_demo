import { AppSettingsRepository } from "./app-settings.repository";

export interface OrchestratorInstanceConfig {
	enabled: boolean;
	concurrency: number;
	webhook: string;
}

export interface CompanyLevelReportsOrchestratorSettings {
	autoGenEnabled: boolean;
	instances: [OrchestratorInstanceConfig, OrchestratorInstanceConfig];
}

export interface MonitoringSettings {
	/** A PROCESSING step untouched for this long is treated as a lost run. */
	stuckAfterMinutes: number;
	/** How far back failed steps stay on the dashboard. */
	lookbackHours: number;
}

const CLR_ORCHESTRATOR_KEY = "orchestrator:company-level-reports";
const MONITORING_KEY = "monitoring:n8n";

const DEFAULT_INSTANCE: OrchestratorInstanceConfig = {
	enabled: false,
	concurrency: 1,
	webhook: "",
};

const DEFAULT_SETTINGS: CompanyLevelReportsOrchestratorSettings = {
	autoGenEnabled: false,
	instances: [DEFAULT_INSTANCE, DEFAULT_INSTANCE],
};

const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
	stuckAfterMinutes: 60,
	lookbackHours: 24,
};

export class AppSettingsService {
	static async getClrOrchestrator(): Promise<CompanyLevelReportsOrchestratorSettings> {
		const value =
			await AppSettingsRepository.get<CompanyLevelReportsOrchestratorSettings>(
				CLR_ORCHESTRATOR_KEY,
			);
		return value ?? DEFAULT_SETTINGS;
	}

	static async updateClrOrchestrator(
		settings: CompanyLevelReportsOrchestratorSettings,
	): Promise<CompanyLevelReportsOrchestratorSettings> {
		return AppSettingsRepository.upsert(CLR_ORCHESTRATOR_KEY, settings);
	}

	static async getMonitoring(): Promise<MonitoringSettings> {
		const value =
			await AppSettingsRepository.get<MonitoringSettings>(MONITORING_KEY);
		if (!value) return DEFAULT_MONITORING_SETTINGS;

		return {
			stuckAfterMinutes:
				value.stuckAfterMinutes ??
				DEFAULT_MONITORING_SETTINGS.stuckAfterMinutes,
			lookbackHours:
				value.lookbackHours ?? DEFAULT_MONITORING_SETTINGS.lookbackHours,
		};
	}

	static async updateMonitoring(
		settings: MonitoringSettings,
	): Promise<MonitoringSettings> {
		return AppSettingsRepository.upsert(MONITORING_KEY, settings);
	}
}
