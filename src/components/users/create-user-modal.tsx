"use client";

import { PlusOutlined } from "@ant-design/icons";
import { useCreateUser } from "@hooks/api/useUsersService";
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import { useState } from "react";
import ImageUpload from "../ui/image-upload";

const { Option } = Select;

interface CreateUserModalProps {
	open: boolean;
	onCancel: () => void;
	onSuccess: () => void;
}

export default function CreateUserModal({
	open,
	onCancel,
	onSuccess,
}: CreateUserModalProps) {
	const [form] = Form.useForm();
	const { mutateAsync: createUser, isPending } = useCreateUser();
	const [customUseCase, setCustomUseCase] = useState("");
	const [useCases, setUseCases] = useState<string[]>(["Leadership",
		"AI Maturity",
		"Insurance CX",
		"Efficiency",
]);

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();

			// Validate password strength
			if (values.password && values.password.length < 8) {
				message.error("Password must be at least 8 characters long");
				return;
			}

			// Validate password complexity
			const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
			if (values.password && !passwordRegex.test(values.password)) {
				message.error(
					"Password must contain at least one lowercase letter, one uppercase letter, and one number",
				);
				return;
			}

			// Clean up empty optional fields
			const cleanedValues = {
				...values,
				firstName: values.firstName?.trim() || undefined,
				lastName: values.lastName?.trim() || undefined,
				companyName: values.companyName?.trim() || undefined,
				logo: values.logo?.trim() || undefined,
				usercases: values.usercases || [],
			};

			await createUser(cleanedValues);
			message.success("User created successfully");
			form.resetFields();
			onSuccess();
		} catch (error) {
			console.error("Failed to create user:", error);
			message.error("Failed to create user. Please try again.");
		}
	};

	const handleCancel = () => {
		form.resetFields();
		setCustomUseCase("");
		setUseCases([]);
		onCancel();
	};

	const handleAddCustomUseCase = () => {
		if (!customUseCase.trim()) {
			message.warning("Please enter a use case name");
			return;
		}

		const useCaseValue = customUseCase
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "-");

		// Check if use case already exists
		if (useCases.includes(useCaseValue)) {
			message.warning("This use case already exists");
			return;
		}

		// Add the new use case
		const newUseCases = [...useCases, useCaseValue];
		setUseCases(newUseCases);
		form.setFieldValue("usercases", newUseCases);
		setCustomUseCase("");
		message.success("Custom use case added successfully");
	};

	const handleRemoveUseCase = (useCaseToRemove: string) => {
		const newUseCases = useCases.filter((uc) => uc !== useCaseToRemove);
		setUseCases(newUseCases);
		form.setFieldValue("usercases", newUseCases);
	};

	return (
		<Modal
			title="Create New User"
			open={open}
			onOk={handleSubmit}
			onCancel={handleCancel}
			okText="Create User"
			cancelText="Cancel"
			width={700}
			confirmLoading={isPending}
			destroyOnClose
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{
					role: "user",
					usercases: [],
				}}
			>
				<Row gutter={16}>
					<Col span={12}>
						<Form.Item
							name="firstName"
							label="First Name"
							rules={[
								{ min: 2, message: "First name must be at least 2 characters" },
							]}
						>
							<Input placeholder="First Name (optional)" />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item
							name="lastName"
							label="Last Name"
							rules={[
								{ min: 2, message: "Last name must be at least 2 characters" },
							]}
						>
							<Input placeholder="Last Name (optional)" />
						</Form.Item>
					</Col>
				</Row>

				<Form.Item
					name="email"
					label="Email Address"
					rules={[
						{ required: true, message: "Please enter email address" },
						{ type: "email", message: "Please enter a valid email address" },
					]}
				>
					<Input placeholder="user@company.com" />
				</Form.Item>

				<Form.Item
					name="password"
					label="Password"
					rules={[
						{ required: true, message: "Please enter password" },
						{ min: 8, message: "Password must be at least 8 characters" },
						{
							pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
							message:
								"Password must contain at least one lowercase letter, one uppercase letter, and one number",
						},
					]}
				>
					<Input.Password placeholder="Enter password" />
				</Form.Item>

				<Form.Item
					name="companyName"
					label="Company Name"
					rules={[
						{ min: 2, message: "Company name must be at least 2 characters" },
					]}
				>
					<Input placeholder="Company Name (optional)" />
				</Form.Item>

				<Form.Item name="logo" label="Company Logo">
					<ImageUpload
						folder="company-logos"
						maxSize={5}
						placeholder="Upload company logo"
						accept={[
							"image/jpeg",
							"image/jpg",
							"image/png",
							"image/gif",
							"image/webp",
							"image/svg+xml",
						]}
						onChange={(url) => form.setFieldValue("logo", url)}
						onRemove={() => form.setFieldValue("logo", "")}
					/>
				</Form.Item>

				<Form.Item
					name="role"
					label="User Role"
					rules={[{ required: true, message: "Please select user role" }]}
				>
					<Select placeholder="Select Role">
						<Option value="user">User</Option>
						<Option value="admin">Admin</Option>
					</Select>
				</Form.Item>

				<Form.Item
					name="usercases"
					label="Use Cases"
					tooltip="Add custom use cases for this user"
				>
					<div>
						{/* Display current use cases */}
						<div style={{ marginBottom: "12px", minHeight: "32px" }}>
							{useCases.length > 0 ? (
								<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
									{useCases.map((usecase: string) => {
										const displayName = usecase
											.split("-")
											.map(
												(word) => word.charAt(0).toUpperCase() + word.slice(1),
											)
											.join(" ");
										return (
											<Tag
												key={usecase}
												color="gray"
												closable
												onClose={() => handleRemoveUseCase(usecase)}
												style={{ marginBottom: 4, fontSize: "16px", padding: "5px 8px" }}
											>
												{displayName}
											</Tag>
										);
									})}
								</div>
							) : (
								<div style={{ color: "#8c8c8c", fontStyle: "italic" }}>
									No use cases added yet
								</div>
							)}
						</div>

						{/* Add new use case */}
						<Space.Compact style={{ width: "100%" }}>
							<Input
								placeholder="Enter use case name"
								value={customUseCase}
								onChange={(e) => setCustomUseCase(e.target.value)}
								onPressEnter={handleAddCustomUseCase}
							/>
							<Button
								type="primary"
								icon={<PlusOutlined />}
								onClick={handleAddCustomUseCase}
							>
								Add
							</Button>
						</Space.Compact>
					</div>
				</Form.Item>
			</Form>
		</Modal>
	);
}
