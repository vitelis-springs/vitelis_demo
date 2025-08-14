'use client';

import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  Space,
  Checkbox,
  message,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  GoogleOutlined,
  GithubOutlined,
  TwitterOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Login form values:', values);
    message.success('Login successful! (Demo only)');
    
    setLoading(false);
    // In a real app, you would redirect here
    // router.push('/dashboard');
  };

  const handleSocialLogin = (provider: string) => {
    message.info(`${provider} login clicked! (Demo only)`);
  };

  const handleForgotPassword = () => {
    message.info('Forgot password clicked! (Demo only)');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Row justify="center" align="middle" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={24} md={12} lg={10} xl={8}>
          <Card
            style={{
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: 'none',
            }}
            bodyStyle={{ padding: '40px' }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Title level={2} style={{ marginBottom: '8px', color: '#58bfce' }}>
                Welcome Back
              </Title>
              <Paragraph style={{ color: '#666', margin: 0 }}>
                Sign in to your account to continue
              </Paragraph>
            </div>

            {/* Login Form */}
            <Form
              form={form}
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Enter your email"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Enter your password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  >
                    Remember me
                  </Checkbox>
                  <Button
                    type="link"
                    onClick={handleForgotPassword}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    Forgot password?
                  </Button>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    background: '#58bfce',
                    borderColor: '#58bfce',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            {/* Divider */}
            <Divider style={{ margin: '24px 0' }}>
              <Text style={{ color: '#999' }}>or continue with</Text>
            </Divider>

            {/* Social Login Buttons */}
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<GoogleOutlined />}
                size="large"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #d9d9d9',
                  color: '#333',
                }}
                onClick={() => handleSocialLogin('Google')}
              >
                Continue with Google
              </Button>

              <Row gutter={12}>
                <Col span={12}>
                  <Button
                    icon={<GithubOutlined />}
                    size="large"
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid #d9d9d9',
                      color: '#333',
                    }}
                    onClick={() => handleSocialLogin('GitHub')}
                  >
                    GitHub
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<TwitterOutlined />}
                    size="large"
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid #d9d9d9',
                      color: '#333',
                    }}
                    onClick={() => handleSocialLogin('Twitter')}
                  >
                    Twitter
                  </Button>
                </Col>
              </Row>
            </Space>

            {/* Sign Up Link */}
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Text style={{ color: '#666' }}>
                Don't have an account?{' '}
                <Link href="/signup" style={{ color: '#58bfce', fontWeight: '600' }}>
                  Sign up
                </Link>
              </Text>
            </div>
          </Card>
        </Col>

        {/* Welcome Section */}
        <Col xs={24} md={12} lg={14} xl={16}>
          <div style={{ 
            padding: '40px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <Title level={1} style={{ color: 'white', marginBottom: '24px' }}>
              Welcome to Our Platform
            </Title>
            <Paragraph style={{ 
              fontSize: '18px', 
              lineHeight: '1.6',
              marginBottom: '32px',
              opacity: 0.9
            }}>
              Experience the power of modern web development with our comprehensive platform. 
              Built with Next.js 15, TypeScript, and Ant Design.
            </Paragraph>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '32px',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '8px',
                  opacity: 0.8
                }}>
                  ⚡
                </div>
                <Text style={{ color: 'white', fontSize: '16px' }}>Fast Performance</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '8px',
                  opacity: 0.8
                }}>
                  🔒
                </div>
                <Text style={{ color: 'white', fontSize: '16px' }}>Secure</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '8px',
                  opacity: 0.8
                }}>
                  🎨
                </div>
                <Text style={{ color: 'white', fontSize: '16px' }}>Beautiful UI</Text>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
