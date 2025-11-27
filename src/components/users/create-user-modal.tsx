"use client";
import { useCreateUser } from "@hooks/api/useUsersService";
import {
  USE_CASE_SUGGESTIONS,
  formatUseCaseLabel,
  normalizeUseCase,
} from "@shared/constants/use-cases";
import { Col, Form, Input, Modal, Row, Select, Tag, message } from "antd";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
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

	const normalizeUseCaseList = (values: string[] = []) => {
		const normalized = values
			.map((value) => normalizeUseCase(value))
			.filter(Boolean);
		return Array.from(new Set(normalized));
	};

	const renderUseCaseTag = (props: CustomTagProps) => {
		const { closable, onClose, value } = props;
		const label = formatUseCaseLabel(String(value));
		return (
			<Tag
				closable={closable}
				onClose={onClose}
				style={{ marginBottom: 4, fontSize: "14px", padding: "4px 8px" }}
			>
				{label}
			</Tag>
		);
	};

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
		form.setFieldsValue({ usercases: [] });
		onCancel();
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
					credits: 0,
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
					name="credits"
					label="Credits"
					rules={[
						{ 
							validator: (_, value) => {
								if (value === undefined || value === null || value === '') {
									return Promise.resolve();
								}
								const numValue = Number(value);
								if (isNaN(numValue)) {
									return Promise.reject(new Error('Credits must be a valid number'));
								}
								if (numValue < 0) {
									return Promise.reject(new Error('Credits must be a positive number'));
								}
								return Promise.resolve();
							}
						},
					]}
					initialValue={0}
				>
					<Input
						type="number"
						placeholder="Enter credits amount"
						min={0}
						step={1}
					/>
				</Form.Item>

				<Form.Item
					name="usercases"
					label="Use Cases"
					tooltip="Select recommended use cases or add your own"
					normalize={normalizeUseCaseList}
				>
					<Select
						mode="tags"
						showSearch
						tokenSeparators={[","]}
						placeholder="Select or type use cases"
						options={USE_CASE_SUGGESTIONS}
						tagRender={renderUseCaseTag}
						style={{ width: "100%" }}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}
