"use client";

import { useUpdateUser } from "@hooks/api/useUsersService";
import type { User } from "@hooks/api/useUsersService";
import { Col, Form, Input, Modal, Row, Select, Tag, message } from "antd";
import React from "react";
import ImageUpload from "../ui/image-upload";

const { Option } = Select;

interface EditUserModalProps {
	open: boolean;
	user: User | null;
	onCancel: () => void;
	onSuccess: () => void;
}

export default function EditUserModal({
	open,
	user,
	onCancel,
	onSuccess,
}: EditUserModalProps) {
	const [form] = Form.useForm();
	const { mutateAsync: updateUser, isPending } = useUpdateUser();

	// Set form values when user changes
	React.useEffect(() => {
		if (user && open) {
			form.setFieldsValue({
				email: user.email,
				companyName: user.companyName || "",
				firstName: user.firstName || "",
				lastName: user.lastName || "",
				logo: user.logo || "",
				role: user.role,
				usercases: user.usercases || [],
			});
		}
	}, [user, open, form]);

	const handleSubmit = async () => {
		if (!user) return;

		try {
			const values = await form.validateFields();

			// Clean up empty optional fields
			const cleanedValues = {
				...values,
				firstName: values.firstName?.trim() || undefined,
				lastName: values.lastName?.trim() || undefined,
				companyName: values.companyName?.trim() || undefined,
				logo: values.logo?.trim() || undefined,
				usercases: values.usercases || [],
			};

			await updateUser({ userId: user._id, userData: cleanedValues });
			message.success("User updated successfully");
			onSuccess();
		} catch (error) {
			console.error("Failed to update user:", error);
			message.error("Failed to update user. Please try again.");
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			title="Edit User"
			open={open}
			onOk={handleSubmit}
			onCancel={handleCancel}
			okText="Update"
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
					tooltip="Select the use cases this user will have access to"
				>
					<Select
						mode="multiple"
						placeholder="Select use cases"
						style={{ width: "100%" }}
						tagRender={(props) => {
							const { label, closable, onClose } = props;
							return (
								<Tag
									color="blue"
									closable={closable}
									onClose={onClose}
									style={{ marginRight: 3 }}
								>
									{label}
								</Tag>
							);
						}}
					>
						<Option value="data-analysis">Data Analysis</Option>
						<Option value="reporting">Reporting</Option>
						<Option value="user-management">User Management</Option>
						<Option value="system-config">System Configuration</Option>
						<Option value="content-management">Content Management</Option>
						<Option value="analytics">Analytics</Option>
						<Option value="integration">Integration</Option>
						<Option value="automation">Automation</Option>
					</Select>
				</Form.Item>
			</Form>
		</Modal>
	);
}
