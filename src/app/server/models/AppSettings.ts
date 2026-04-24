import mongoose, { Document, Schema } from "mongoose";

export interface IAppSettings extends Document {
	key: string;
	value: unknown;
	updatedAt: Date;
}

const AppSettingsSchema: Schema = new Schema(
	{
		key: { type: String, required: true, unique: true, trim: true },
		value: { type: Schema.Types.Mixed, required: true },
	},
	{ timestamps: true },
);

const AppSettings =
	mongoose.models.AppSettings ||
	mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);

export default AppSettings;
