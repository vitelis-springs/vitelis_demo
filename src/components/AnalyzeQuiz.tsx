'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Form,
  message as antMessage,
  Steps,
  Space
} from 'antd';
import { 
  SearchOutlined, 
  FileTextOutlined, 
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
}

interface AnalyzeQuizProps {
  onComplete?: (data: AnalyzeQuizData) => void;
}

export default function AnalyzeQuiz({ onComplete }: AnalyzeQuizProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<AnalyzeQuizData>({
    companyName: '',
    businessLine: '',
    country: '',
    useCase: '',
    timeline: ''
  });

  const steps = [
    {
      title: 'Company Name',
      icon: <UserOutlined />,
      description: 'Enter the company name'
    },
    {
      title: 'Business Line',
      icon: <TrophyOutlined />,
      description: 'Select the industry'
    },
    {
      title: 'Country',
      icon: <GlobalOutlined />,
      description: 'Choose the country'
    },
    {
      title: 'Use Case',
      icon: <FileTextOutlined />,
      description: 'Select analysis type'
    },
    {
      title: 'Timeline',
      icon: <ClockCircleOutlined />,
      description: 'Choose the period'
    }
  ];

  const questions = [
    {
      name: 'companyName',
      label: 'What is the name of the company you want to analyze?',
      type: 'input',
      placeholder: 'e.g., Adidas, Nike, Apple...',
      required: true
    },
    {
      name: 'businessLine',
      label: 'What is the main business line or industry of this company?',
      type: 'input',
      placeholder: 'e.g., Sportswear, Technology, Automotive...',
      required: true
    },
    {
      name: 'country',
      label: 'In which country does this company operate?',
      type: 'input',
      placeholder: 'e.g., Germany, United States, Japan...',
      required: true
    },
    {
      name: 'useCase',
      label: 'What is the specific use case or area you want to analyze?',
      type: 'select',
      options: [
        'Leadership',
        'Marketing', 
        'Finance',
        'Operations',
        'Sustainability',
        'Digital Transformation',
        'Supply Chain',
        'Customer Experience'
      ],
      required: true
    },
    {
      name: 'timeline',
      label: 'What is your preferred timeline for this analysis?',
      type: 'input',
      placeholder: 'e.g., Q1 2025, Q1 2024 - Q3 2025...',
      required: true
    }
  ];

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      
      // Update quiz data
      setQuizData(prev => ({ ...prev, ...values }));
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - submit
        await handleSubmit(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (values: AnalyzeQuizData) => {
    setLoading(true);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setQuizData(values);
      
      // Show success message
      antMessage.success('Analysis request submitted successfully!');
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete(values);
      }
      
    } catch (error) {
      console.error('Error submitting analysis request:', error);
      antMessage.error('Failed to submit analysis request');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentStep(0);
    setQuizData({
      companyName: '',
      businessLine: '',
      country: '',
      useCase: '',
      timeline: ''
    });
  };

  const currentQuestion = questions[currentStep];

  return (
    <div style={{ 
      padding: '24px', 
      background: '#141414', 
      minHeight: '100vh',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <Card 
        style={{ 
          background: '#1f1f1f', 
          border: '1px solid #303030',
          borderRadius: '12px'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
            Company Analysis Quiz
          </Title>
          <Text style={{ color: '#8c8c8c' }}>
            Step-by-step analysis request form
          </Text>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: '32px' }}>
          <Steps
            current={currentStep}
            items={steps.map((step, index) => ({
              title: step.title,
              description: step.description,
              icon: step.icon,
              status: index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait'
            }))}
            style={{ marginBottom: '24px' }}
          />
          
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#8c8c8c' }}>
              Step {currentStep + 1} of {steps.length}
            </Text>
          </div>
        </div>

        {/* Question Form */}
        <Card
          style={{
            background: '#262626',
            border: '1px solid #434343',
            borderRadius: '8px',
            marginBottom: '32px'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={3} style={{ color: '#d9d9d9', marginBottom: '8px' }}>
              {currentQuestion.label}
            </Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={quizData}
            style={{ maxWidth: '500px', margin: '0 auto' }}
          >
            <Form.Item
              name={currentQuestion.name}
              rules={[{ required: currentQuestion.required, message: 'This field is required' }]}
            >
              {currentQuestion.type === 'input' ? (
                <Input
                  placeholder={currentQuestion.placeholder}
                  size="large"
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #434343',
                    borderRadius: '8px',
                    color: '#d9d9d9',
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              ) : currentQuestion.type === 'select' ? (
                <Select
                  placeholder={currentQuestion.placeholder}
                  size="large"
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #434343',
                    borderRadius: '8px'
                  }}
                  dropdownStyle={{
                    background: '#1f1f1f',
                    border: '1px solid #434343'
                  }}
                >
                  {currentQuestion.options?.map((option, index) => (
                    <Option key={index} value={option}>
                      <Text style={{ color: '#d9d9d9' }}>{option}</Text>
                    </Option>
                  ))}
                </Select>
              ) : null}
            </Form.Item>
          </Form>
        </Card>

        {/* Navigation Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '24px'
        }}>
          <div>
            {currentStep > 0 && (
              <Button
                size="large"
                onClick={handlePrev}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #434343',
                  color: '#d9d9d9',
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px'
                }}
              >
                Previous
              </Button>
            )}
          </div>

          <Space>
            <Button
              size="large"
              onClick={handleReset}
              style={{
                background: '#1f1f1f',
                border: '1px solid #434343',
                color: '#d9d9d9',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px'
              }}
            >
              Reset
            </Button>
            
            <Button
              type="primary"
              size="large"
              onClick={handleNext}
              loading={loading}
              icon={currentStep === steps.length - 1 ? <SendOutlined /> : undefined}
              style={{
                background: '#58bfce',
                border: '1px solid #58bfce',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px'
              }}
            >
              {currentStep === steps.length - 1 ? 'Generate Analysis' : 'Next'}
            </Button>
          </Space>
        </div>

        {/* Progress Summary */}
        {Object.values(quizData).some(value => value) && (
          <Card
            style={{
              background: '#262626',
              border: '1px solid #434343',
              borderRadius: '8px',
              marginTop: '32px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
              <CheckCircleOutlined style={{ marginRight: '8px' }} />
              Progress Summary
            </Title>
            <div style={{ color: '#d9d9d9' }}>
              {quizData.companyName && (
                <p><strong>Company:</strong> {quizData.companyName}</p>
              )}
              {quizData.businessLine && (
                <p><strong>Business Line:</strong> {quizData.businessLine}</p>
              )}
              {quizData.country && (
                <p><strong>Country:</strong> {quizData.country}</p>
              )}
              {quizData.useCase && (
                <p><strong>Use Case:</strong> {quizData.useCase}</p>
              )}
              {quizData.timeline && (
                <p><strong>Timeline:</strong> {quizData.timeline}</p>
              )}
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}
