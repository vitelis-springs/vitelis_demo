'use client';

import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../ui/sidebar';
import ImageUpload from '../ui/image-upload';
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Avatar,
  List,
  Descriptions,
  Tag,
  Button,
  Table,
  Input,
  Select,
  Modal,
  Form,
  message,
} from 'antd';
import {
  CrownOutlined,
  TeamOutlined,
  DatabaseOutlined,
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useGetUsers, useUpdateUser, useDeleteUser, type User } from '../../hooks/api/useUsersService';
import CreateUserModal from './create-user-modal';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function Accounts() {
  const { user } = useAuth();
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // Fetch users from API
  const { data: usersData, isLoading: isLoadingUsers, refetch } = useGetUsers();
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();

  // Set users when data is fetched
  useEffect(() => {
    if (usersData) {
      console.log('📊 Accounts: Users data received:', usersData);
      setFilteredUsers(usersData);
    }
  }, [usersData]);


  // Filter users based on search text and role
  useEffect(() => {
    if (!usersData) return;
    
    let filtered = usersData;
    
    if (searchText) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchText.toLowerCase())) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchText.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
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
    setIsModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      companyName: user.companyName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      logo: user.logo || '',
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalVisible(true);
  };

  const handleDeleteUser = (userId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteUser(userId);
          message.success('User deleted successfully');
        } catch (error) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // Update existing user
        await updateUser({ userId: editingUser._id, userData: values });
        message.success('User updated successfully');
        setIsModalVisible(false);
        form.resetFields();
      }
    } catch (error) {
      console.error('Operation failed:', error);
      message.error('Failed to save user');
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.role === 'admin' ? '#faad14' : '#1890ff' }} />
          <div>
            <div style={{ color: '#d9d9d9', fontWeight: 500 }}>
              {record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : 'N/A'}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (text: string | undefined) => <span style={{ color: '#d9d9d9' }}>{text || 'N/A'}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? 'Admin' : 'User'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => (
        <span style={{ color: '#8c8c8c' }}>
          {date ? new Date(date).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
            style={{ color: '#1890ff' }}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record._id)}
            style={{ color: '#ff4d4f' }}
            disabled={record.role === 'admin' && record._id === user?._id}
          />
        </Space>
      ),
    },
  ];



  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '24px',
          background: '#141414',
          minHeight: '100vh'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <Space align="center" style={{ marginBottom: '16px' }}>
                
                <Title level={2} style={{ margin: 0, color: '#4ea5b2' }}>
                  Account Management
                </Title>
              </Space>
            </div>



            {/* Search and Filters */}
            <Card 
              style={{ 
                background: '#1f1f1f', 
                border: '1px solid #303030',
                marginBottom: '24px'
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={8}>
                  <Search
                    placeholder="Search users..."
                    onSearch={handleSearch}
                    style={{ width: '100%' }}
                    prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    placeholder="Filter by role"
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
                    style={{ width: '100%' }}
                    prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
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
                    style={{ width: '100%' }}
                  >
                    Add User
                  </Button>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => refetch()}
                    loading={isLoadingUsers}
                    style={{ width: '100%' }}
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
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#d9d9d9' }}>Users ({filteredUsers.length})</span>
                </Space>
              }
              style={{ background: '#1f1f1f', border: '1px solid #303030' }}
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
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
                }}
                style={{ background: 'transparent' }}
                rowClassName={(record) => record.role === 'admin' ? 'admin-row' : ''}
              />
            </Card>
          </div>

          {/* Create User Modal */}
          <CreateUserModal
            open={isModalVisible && !editingUser}
            onCancel={() => setIsModalVisible(false)}
            onSuccess={() => {
              setIsModalVisible(false);
              refetch();
            }}
          />

          {/* Edit User Modal */}
          <Modal
            title="Edit User"
            open={isModalVisible && !!editingUser}
            onOk={handleModalOk}
            onCancel={() => setIsModalVisible(false)}
            okText="Update"
            cancelText="Cancel"
            width={600}
            confirmLoading={isUpdating}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                role: 'user',
                isActive: true,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                  >
                    <Input placeholder="First Name (optional)" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                  >
                    <Input placeholder="Last Name (optional)" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item
                name="companyName"
                label="Company Name"
              >
                <Input placeholder="Company Name (optional)" />
              </Form.Item>
              <Form.Item
                name="logo"
                label="Company Logo"
              >
                <ImageUpload
                  folder="company-logos"
                  maxSize={5}
                  placeholder="Upload company logo"
                  onChange={(url) => form.setFieldValue('logo', url)}
                  onRemove={() => form.setFieldValue('logo', '')}
                />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Role"
                    rules={[{ required: true, message: 'Please select role' }]}
                  >
                    <Select placeholder="Select Role">
                      <Option value="user">User</Option>
                      <Option value="admin">Admin</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="isActive"
                    label="Status"
                    rules={[{ required: true, message: 'Please select status' }]}
                  >
                    <Select placeholder="Select Status">
                      <Option value={true}>Active</Option>
                      <Option value={false}>Inactive</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
