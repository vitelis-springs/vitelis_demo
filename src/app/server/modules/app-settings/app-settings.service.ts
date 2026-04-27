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

const CLR_ORCHESTRATOR_KEY = "orchestrator:company-level-reports";

const DEFAULT_INSTANCE: OrchestratorInstanceConfig = {
	enabled: false,
	concurrency: 1,
	webhook: "",
};

const DEFAULT_SETTINGS: CompanyLevelReportsOrchestratorSettings = {
	autoGenEnabled: false,
	instances: [DEFAULT_INSTANCE, DEFAULT_INSTANCE],
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
}
