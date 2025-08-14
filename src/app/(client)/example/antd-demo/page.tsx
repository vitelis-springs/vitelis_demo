'use client';

import {
  Button,
  Card,
  Input,
  Select,
  DatePicker,
  Table,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Switch,
  Radio,
  Checkbox,
  Form,
  message,
  Modal,
  Tag,
  Progress,
  Statistic,
  Avatar,
  Badge,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  HeartOutlined,
  StarOutlined,
  LikeOutlined,
  DislikeOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function AntdDemoPage() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const tableData = [
    {
      key: '1',
      name: 'John Brown',
      age: 32,
      address: 'New York No. 1 Lake Park',
      tags: ['nice', 'developer'],
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
      tags: ['manager'],
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sydney No. 1 Lake Park',
      tags: ['cool', 'teacher'],
    },
  ];

  const tableColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Tags',
      key: 'tags',
      dataIndex: 'tags',
      render: (tags: string[]) => (
        <>
          {tags.map((tag) => {
            let color = tag.length > 5 ? 'geekblue' : 'green';
            if (tag === 'loser') {
              color = 'volcano';
            }
            return (
              <Tag color={color} key={tag}>
                {tag.toUpperCase()}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          <Popconfirm
            title="Are you sure to delete this item?"
            onConfirm={() => message.success('Deleted successfully')}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onFinish = (values: any) => {
    console.log('Form values:', values);
    message.success('Form submitted successfully!');
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div className="p-8">
      <Title level={1}>Ant Design Theme Demo</Title>
      <Paragraph>
        This page showcases various Ant Design components with our custom theme configuration.
      </Paragraph>

      <Row gutter={[24, 24]}>
        {/* Basic Components */}
        <Col xs={24} lg={12}>
          <Card title="Basic Components" className="h-full">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Buttons:</Text>
                <Space wrap>
                  <Button type="primary">Primary</Button>
                  <Button>Default</Button>
                  <Button type="dashed">Dashed</Button>
                  <Button type="text">Text</Button>
                  <Button type="link">Link</Button>
                  <Button danger>Danger</Button>
                </Space>
              </div>

              <div>
                <Text strong>Input Fields:</Text>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input placeholder="Basic input" />
                  <Input.Password placeholder="Password input" />
                  <TextArea rows={3} placeholder="Text area" />
                  <Select placeholder="Select an option" style={{ width: '100%' }}>
                    <Option value="option1">Option 1</Option>
                    <Option value="option2">Option 2</Option>
                    <Option value="option3">Option 3</Option>
                  </Select>
                  <DatePicker style={{ width: '100%' }} />
                </Space>
              </div>

              <div>
                <Text strong>Form Controls:</Text>
                <Space wrap>
                  <Switch defaultChecked />
                  <Radio.Group defaultValue="a">
                    <Radio.Button value="a">Option A</Radio.Button>
                    <Radio.Button value="b">Option B</Radio.Button>
                    <Radio.Button value="c">Option C</Radio.Button>
                  </Radio.Group>
                  <Checkbox>Checkbox</Checkbox>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Data Display */}
        <Col xs={24} lg={12}>
          <Card title="Data Display" className="h-full">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Statistics:</Text>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Active Users" value={112893} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Account Balance" value={11280} prefix="$" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Active Users" value={112893} />
                  </Col>
                </Row>
              </div>

              <div>
                <Text strong>Progress:</Text>
                <Progress percent={30} />
                <Progress percent={70} status="exception" />
                <Progress percent={100} />
              </div>

              <div>
                <Text strong>Avatar & Badge:</Text>
                <Space>
                  <Badge count={5}>
                    <Avatar shape="square" icon={<UserOutlined />} />
                  </Badge>
                  <Badge count={0} showZero>
                    <Avatar shape="square" icon={<UserOutlined />} />
                  </Badge>
                  <Badge count={<HeartOutlined style={{ color: '#f5222d' }} />}>
                    <Avatar shape="square" icon={<UserOutlined />} />
                  </Badge>
                </Space>
              </div>

              <div>
                <Text strong>Tags:</Text>
                <Space wrap>
                  <Tag color="magenta">magenta</Tag>
                  <Tag color="red">red</Tag>
                  <Tag color="volcano">volcano</Tag>
                  <Tag color="orange">orange</Tag>
                  <Tag color="gold">gold</Tag>
                  <Tag color="lime">lime</Tag>
                  <Tag color="green">green</Tag>
                  <Tag color="cyan">cyan</Tag>
                  <Tag color="blue">blue</Tag>
                  <Tag color="geekblue">geekblue</Tag>
                  <Tag color="purple">purple</Tag>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Table */}
        <Col xs={24}>
          <Card title="Data Table">
            <Table columns={tableColumns} dataSource={tableData} />
          </Card>
        </Col>

        {/* Interactive Components */}
        <Col xs={24} lg={12}>
          <Card title="Interactive Components">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
              >
                Open Modal
              </Button>

              <Button
                icon={<SettingOutlined />}
                onClick={() => message.info('Settings clicked')}
              >
                Show Message
              </Button>

              <Space>
                <Button
                  type="primary"
                  icon={<LikeOutlined />}
                  onClick={() => message.success('Liked!')}
                >
                  Like
                </Button>
                <Button
                  icon={<DislikeOutlined />}
                  onClick={() => message.error('Disliked!')}
                >
                  Dislike
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Theme Colors */}
        <Col xs={24} lg={12}>
          <Card title="Theme Colors">
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#1890ff',
                      borderRadius: 6,
                      margin: '0 auto 8px',
                    }}
                  />
                  <Text>Primary</Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#52c41a',
                      borderRadius: 6,
                      margin: '0 auto 8px',
                    }}
                  />
                  <Text>Success</Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#faad14',
                      borderRadius: 6,
                      margin: '0 auto 8px',
                    }}
                  />
                  <Text>Warning</Text>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#ff4d4f',
                      borderRadius: 6,
                      margin: '0 auto 8px',
                    }}
                  />
                  <Text>Error</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Modal */}
      <Modal
        title="Add New Item"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input the name!' }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category!' }]}
          >
            <Select placeholder="Select category">
              <Option value="category1">Category 1</Option>
              <Option value="category2">Category 2</Option>
              <Option value="category3">Category 3</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} placeholder="Enter description" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
