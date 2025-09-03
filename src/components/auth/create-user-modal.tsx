'use client';

import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
} from 'antd';
import { useCreateUser } from '../../hooks/api/useUsersService';
import type { CreateUserData } from '../../hooks/api/useUsersService';
import ImageUpload from '../ui/image-upload';

const { Option } = Select;

interface CreateUserModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ open, onCancel, onSuccess }: CreateUserModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: createUser, isPending } = useCreateUser();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate password strength
      if (values.password && values.password.length < 6) {
        message.error('Password must be at least 6 characters long');
        return;
      }

      // Clean up empty optional fields
      const cleanedValues = {
        ...values,
        firstName: values.firstName?.trim() || undefined,
        lastName: values.lastName?.trim() || undefined,
        companyName: values.companyName?.trim() || undefined,
        logo: values.logo?.trim() || undefined,
      };

      await createUser(cleanedValues);
      message.success('User created successfully');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Failed to create user:', error);
      message.error('Failed to create user. Please try again.');
    }
  };

  const handleCancel = () => {
    form.resetFields();
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
          role: 'user',
          isActive: true,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { min: 2, message: 'First name must be at least 2 characters' }
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
                { min: 2, message: 'Last name must be at least 2 characters' }
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
            { required: true, message: 'Please enter email address' },
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
        >
          <Input placeholder="user@company.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please enter password' },
            { min: 6, message: 'Password must be at least 6 characters' },
            { 
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
            }
          ]}
        >
          <Input.Password placeholder="Enter password" />
        </Form.Item>

        <Form.Item
          name="companyName"
          label="Company Name"
          rules={[
            { min: 2, message: 'Company name must be at least 2 characters' }
          ]}
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
              label="User Role"
              rules={[{ required: true, message: 'Please select user role' }]}
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
              label="Account Status"
              rules={[{ required: true, message: 'Please select account status' }]}
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
  );
}


