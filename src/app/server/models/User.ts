import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
	email: string;
	password: string;
	companyName?: string;
	logo?: string;
	firstName?: string;
	lastName?: string;
	role: "user" | "admin";
	isActive: boolean;
	lastLogin?: Date;
	usercases?: string[];
	createdAt: Date;
	updatedAt: Date;
}

const UserSchema: Schema = new Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			index: true,
		},
		password: {
			type: String,
			required: true,
			trim: true,
		},
		companyName: {
			type: String,
			required: false,
			trim: true,
			index: true,
		},
		logo: {
			type: String,
			required: false,
			trim: true,
		},
		firstName: {
			type: String,
			required: false,
			trim: true,
		},
		lastName: {
			type: String,
			required: false,
			trim: true,
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
			required: true,
		},
		isActive: {
			type: Boolean,
			default: true,
			required: true,
		},
		lastLogin: {
			type: Date,
			required: false,
		},
		usercases: {
			type: [String],
			default: ["Leadership",
				"AI Maturity",
				"Insurance CX",
				"Efficiency",
				"SalesMiner",],
			required: false,
		},
	},
	{
		timestamps: true,
	},
);

// Clear existing model to ensure schema changes take effect
if (mongoose.models.User) {
	delete mongoose.models.User;
}

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
