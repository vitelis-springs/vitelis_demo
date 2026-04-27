import { ensureDBConnection } from "../../../../lib/mongodb";
import AppSettings from "../../models/AppSettings";

export class AppSettingsRepository {
	static async get<T>(key: string): Promise<T | null> {
		await ensureDBConnection();
		const doc = await AppSettings.findOne({ key }).exec();
		return doc ? (doc.value as T) : null;
	}

	static async upsert<T>(key: string, value: T): Promise<T> {
		await ensureDBConnection();
		await AppSettings.findOneAndUpdate(
			{ key },
			{ value },
			{ upsert: true, new: true },
		).exec();
		return value;
	}
}
