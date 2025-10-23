"use client";

import {
	DeleteOutlined,
	EditOutlined,
	FilterOutlined,
	PlusOutlined,
	ReloadOutlined,
	SearchOutlined,
	TeamOutlined,
	UserOutlined,
} from "@ant-design/icons";
import {
	type User,
	useDeleteUser,
	useGetUsers,
} from "@hooks/api/useUsersService";
import { useAuth } from "@hooks/useAuth";
import {
	Avatar,
	Button,
	Card,
	Col,
	Input,
	Layout,
	Modal,
	Row,
	Select,
	Space,
	Table,
	Tag,
	Typography,
	message,
} from "antd";
import { useEffect, useState } from "react";
import Sidebar from "../ui/sidebar";
import CreateUserModal from "./create-user-modal";
import EditUserModal from "./edit-user-modal";

const { Content } = Layout;
const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function Users() {
	const { user } = useAuth();
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
	const [searchText, setSearchText] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	// Fetch users from API
	const { data: usersData, isLoading: isLoadingUsers, refetch } = useGetUsers();
	const { mutateAsync: deleteUser } = useDeleteUser();

	// Set users when data is fetched
	useEffect(() => {
		if (usersData) {
			console.log("📊 Users: Users data received:", usersData);
			setFilteredUsers(usersData);
		}
	}, [usersData]);

	// Filter users based on search text and role
	useEffect(() => {
		if (!usersData) return;

		let filtered = usersData;

		if (searchText) {
			filtered = filtered.filter(
				(user) =>
					user.email.toLowerCase().includes(searchText.toLowerCase()) ||
					user.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
					user.firstName?.toLowerCase().includes(searchText.toLowerCase()) ||
					user.lastName?.toLowerCase().includes(searchText.toLowerCase()),
			);
		}

		if (roleFilter !== "all") {
			filtered = filtered.filter((user) => user.role === roleFilter);
		}

		setFilteredUsers(filtered);
	}, [usersData, searchText, roleFilter]);

	const handleSearch = (value: string) => {
		setSearchText(value);
	};

	const handleRoleFilterChange = (value: string) => {
		setRoleFilter(value);
	};
	const handleAddUser = () => {
		setIsCreateModalVisible(true);
	};

	const handleEditUser = (user: User) => {
		setEditingUser(user);
		setIsEditModalVisible(true);
	};

	const handleDeleteUser = (userId: string) => {
		Modal.confirm({
			title: "Are you sure you want to delete this user?",
			content: "This action cannot be undone.",
			okText: "Yes",
			okType: "danger",
			cancelText: "No",
			onOk: async () => {
				try {
					await deleteUser(userId);
					message.success("User deleted successfully");
				} catch (error) {
					message.error("Failed to delete user");
				}
			},
		});
	};

	const handleCreateModalClose = () => {
		setIsCreateModalVisible(false);
	};

	const handleEditModalClose = () => {
		setIsEditModalVisible(false);
		setEditingUser(null);
	};

	const columns = [
		{
			title: "User",
			key: "user",
			render: (record: User) => (
				<Space>
					<Avatar
						src={record.logo || undefined}
						icon={!record.logo ? <UserOutlined /> : undefined}
						style={{
							backgroundColor: record.role === "admin" ? "#faad14" : "#1890ff",
						}}
					/>
					<div>
						<div style={{ color: "#d9d9d9", fontWeight: 500 }}>
							{record.firstName && record.lastName
								? `${record.firstName} ${record.lastName}`
								: "N/A"}
						</div>
						<div style={{ color: "#8c8c8c", fontSize: "12px" }}>
							{record.email}
						</div>
					</div>
				</Space>
			),
		},
		{
			title: "Company",
			dataIndex: "companyName",
			key: "companyName",
			render: (text: string | undefined) => (
				<span style={{ color: "#d9d9d9" }}>{text || "N/A"}</span>
			),
		},
		{
			title: "Role",
			dataIndex: "role",
			key: "role",
			render: (role: string) => (
				<Tag color={role === "admin" ? "gold" : "blue"}>
					{role === "admin" ? "Admin" : "User"}
				</Tag>
			),
		},
		{
			title: "Status",
			dataIndex: "isActive",
			key: "isActive",
			render: (isActive: boolean) => (
				<Tag color={isActive ? "green" : "red"}>
					{isActive ? "Active" : "Inactive"}
				</Tag>
			),
		},
		{
			title: "Use Cases",
			dataIndex: "usercases",
			key: "usercases",
			render: (usercases: string[]) => (
				<div>
					{usercases && usercases.length > 0 ? (
						<>
							{usercases.slice(0, 3).map((usecase) => {
								// Convert kebab-case back to readable format
								const displayName = usecase
									.split("-")
									.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									.join(" ");
								return (
									<Tag
										key={usecase}
										color="gray"
										style={{ marginBottom: 4, fontSize: "12px" }}
									>
										{displayName}
									</Tag>
								);
							})}
							{usercases.length > 3 && (
								<Tag
									color="default"
									style={{ 
										marginBottom: 4, 
										fontSize: "12px",
										background: "#434343",
										color: "#8c8c8c",
										border: "1px solid #434343"
									}}
								>
									+{usercases.length - 3}
								</Tag>
							)}
						</>
					) : (
						<span style={{ color: "#8c8c8c" }}>None</span>
					)}
				</div>
			),
		},
		{
			title: "Credits",
			dataIndex: "credits",
			key: "credits",
			render: (credits: number) => (
				<span style={{ color: "#d9d9d9", fontWeight: 500 }}>
					{credits !== undefined ? credits : 0}
				</span>
			),
		},
		{
			title: "Last Login",
			dataIndex: "lastLogin",
			key: "lastLogin",
			render: (date: string) => (
				<span style={{ color: "#8c8c8c" }}>
					{date ? new Date(date).toLocaleDateString() : "Never"}
				</span>
			),
		},
		{
			title: "Actions",
			key: "actions",
			render: (record: User) => (
				<Space>
					<Button
						type="text"
						icon={<EditOutlined />}
						onClick={() => handleEditUser(record)}
						style={{ color: "#1890ff" }}
					/>
					<Button
						type="text"
						icon={<DeleteOutlined />}
						onClick={() => handleDeleteUser(record._id)}
						style={{ color: "#ff4d4f" }}
						disabled={record.role === "admin" && record._id === user?._id}
					/>
				</Space>
			),
		},
	];

	return (
		<Layout style={{ minHeight: "100vh", background: "#141414" }}>
			<Sidebar />
			<Layout style={{ marginLeft: 280, background: "#141414" }}>
				<Content
					style={{
						padding: "24px",
						background: "#141414",
						minHeight: "100vh",
					}}
				>
					<div style={{ maxWidth: "1200px", margin: "0 auto" }}>
						{/* Header */}
						<div style={{ marginBottom: "24px" }}>
							<Space align="center" style={{ marginBottom: "16px" }}>
								<Title level={2} style={{ margin: 0, color: "#4ea5b2" }}>
									Account Management
								</Title>
							</Space>
						</div>

						{/* Search and Filters */}
						<Card
							style={{
								background: "#1f1f1f",
								border: "1px solid #303030",
								marginBottom: "24px",
							}}
						>
							<Row gutter={[16, 16]} align="middle">
								<Col xs={24} sm={12} md={8}>
									<Search
										placeholder="Search users..."
										onSearch={handleSearch}
										style={{ width: "100%" }}
										prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
									/>
								</Col>
								<Col xs={24} sm={12} md={8}>
									<Select
										placeholder="Filter by role"
										value={roleFilter}
										onChange={handleRoleFilterChange}
										style={{ width: "100%" }}
										prefix={<FilterOutlined style={{ color: "#8c8c8c" }} />}
									>
										<Option value="all">All Roles</Option>
										<Option value="admin">Admin</Option>
										<Option value="user">User</Option>
									</Select>
								</Col>
								<Col xs={24} sm={12} md={6}>
									<Button
										type="primary"
										icon={<PlusOutlined />}
										onClick={handleAddUser}
										style={{ width: "100%" }}
									>
										Add User
									</Button>
								</Col>
								<Col xs={24} sm={12} md={6}>
									<Button
										icon={<ReloadOutlined />}
										onClick={() => refetch()}
										loading={isLoadingUsers}
										style={{ width: "100%" }}
									>
										Refresh
									</Button>
								</Col>
							</Row>
						</Card>

						{/* Users Table */}
						<Card
							title={
								<Space>
									<TeamOutlined style={{ color: "#1890ff" }} />
									<span style={{ color: "#d9d9d9" }}>
										Users ({filteredUsers.length})
									</span>
								</Space>
							}
							style={{ background: "#1f1f1f", border: "1px solid #303030" }}
						>
							<Table
								columns={columns}
								dataSource={filteredUsers}
								rowKey="_id"
								loading={isLoadingUsers}
								pagination={{
									pageSize: 10,
									showSizeChanger: true,
									showQuickJumper: true,
									showTotal: (total, range) =>
										`${range[0]}-${range[1]} of ${total} users`,
								}}
								style={{ background: "transparent" }}
								rowClassName={(record) =>
									record.role === "admin" ? "admin-row" : ""
								}
							/>
						</Card>
					</div>

					{/* Create User Modal */}
					<CreateUserModal
						open={isCreateModalVisible}
						onCancel={handleCreateModalClose}
						onSuccess={() => {
							handleCreateModalClose();
							refetch();
						}}
					/>

					{/* Edit User Modal */}
					<EditUserModal
						open={isEditModalVisible}
						user={editingUser}
						onCancel={handleEditModalClose}
						onSuccess={() => {
							handleEditModalClose();
							refetch();
						}}
					/>
				</Content>
			</Layout>
		</Layout>
	);
}
