'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Form,
  notification,
  Steps,
  Space,
  Spin,
  App
} from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  SendOutlined,
  CheckCircleOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useRunWorkflow, useGetExecutionDetails } from '@hooks/api/useN8NService';
import { useAnalyzeService, useGetAnalyze } from '@hooks/api/useAnalyzeService';
import Animation from './Animation';
import AnalyzeResult from './AnalyzeResult';

const { Title, Text } = Typography;
const { Option } = Select;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
}

interface AnalyzeQuizProps {
  onComplete?: (data: AnalyzeQuizData) => void;
  userEmail?: string;
}

const STEPS = [
  { title: 'Company Name', icon: <UserOutlined />, description: 'Enter the company name' },
  { title: 'Business Line', icon: <TrophyOutlined />, description: 'Select the industry' },
  { title: 'Country', icon: <GlobalOutlined />, description: 'Choose the country' },
  { title: 'Use Case', icon: <FileTextOutlined />, description: 'Select analysis type' },
  { title: 'Timeline', icon: <ClockCircleOutlined />, description: 'Choose the period' }
];

const QUESTIONS = [
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
    placeholder: 'Select a use case...',
    options: [
      'Leadership', 'Marketing', 'Finance', 'Operations', 'Sustainability',
      'Digital Transformation', 'Supply Chain', 'Customer Experience'
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

export default function AnalyzeQuiz({ onComplete, userEmail }: AnalyzeQuizProps) {
  const { notification: appNotification } = App.useApp();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [executionId, setExecutionId] = useState('');
  const [quizData, setQuizData] = useState<AnalyzeQuizData>({
    companyName: '', businessLine: '', country: '', useCase: '', timeline: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const isTest = true;
  
  const { mutateAsync, isPending } = useRunWorkflow();
  const { createAnalyze, updateAnalyze } = useAnalyzeService();
  const { data: analyzeData, isLoading: isLoadingAnalyze } = useGetAnalyze(analyzeId);

  // Load progress from URL
  useEffect(() => {
    const urlAnalyzeId = searchParams.get('analyzeId');
    if (urlAnalyzeId) {
      setAnalyzeId(urlAnalyzeId);
    } else {
      setAnalyzeId(null);
      setCurrentStep(0);
      setShowResults(false);
      setShowAnimation(false);
      setQuizData({ companyName: '', businessLine: '', country: '', useCase: '', timeline: '' });
      form.resetFields();
    }
    setIsLoadingProgress(false);
  }, [searchParams, form]);

  // Handle analyze data
  useEffect(() => {
    if (analyzeData) {
      setCurrentStep(analyzeData.currentStep || 0);
      setQuizData({
        companyName: analyzeData.companyName || '',
        businessLine: analyzeData.businessLine || '',
        country: analyzeData.country || '',
        useCase: analyzeData.useCase || '',
        timeline: analyzeData.timeline || ''
      });
      if (analyzeData.currentStep >= 5 && analyzeData.status === 'finished') {
        setShowResults(true);
      } else {
        setShowResults(false);
      }
    }
  }, [analyzeData]);

  const showNotification = (type: 'error' | 'warning' | 'info' | 'success', title: string, message: string) => {
    appNotification[type]({
      message: title,
      description: message,
      duration: type === 'error' ? 8 : 4,
      placement: 'topRight'
    });
  };

  const createNewAnalyzeRecord = async (data: Partial<AnalyzeQuizData>) => {
    try {
      const newAnalyzeData = {
        companyName: data.companyName || '',
        businessLine: data.businessLine || '',
        country: data.country || '',
        useCase: data.useCase || '',
        timeline: data.timeline || '',
        userId: userEmail || 'anonymous',
        status: 'progress' as const,
        currentStep: 1
      };

      const result = await createAnalyze.mutateAsync(newAnalyzeData);
      if (result) {
        const newAnalyzeId = result._id as string;
        setAnalyzeId(newAnalyzeId);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('analyzeId', newAnalyzeId);
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    } catch (error) {
      showNotification('error', 'Failed to Create Analysis Record', 'Unable to create a new analysis record.');
    }
  };

  const saveProgress = async (data: Partial<AnalyzeQuizData>, step: number, status: 'progress' | 'finished' = 'progress') => {
    try {
      if (!analyzeId) return;
      const updateData = {
        id: analyzeId,
        companyName: data.companyName || '',
        businessLine: data.businessLine || '',
        country: data.country || '',
        useCase: data.useCase || '',
        timeline: data.timeline || '',
        currentStep: step,
        status
      };
      await updateAnalyze.mutateAsync(updateData);
    } catch (error) {
      showNotification('warning', 'Failed to Save Progress', 'Unable to save your progress.');
    }
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      const updatedQuizData = { ...quizData, ...values };
      setQuizData(updatedQuizData);
      
      if (currentStep === 0 && !analyzeId) {
        await createNewAnalyzeRecord(updatedQuizData);
      } else {
        const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
        await saveProgress(updatedQuizData, nextStep, 'progress');
      }
      
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
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
      const completeData = { ...quizData, ...values };
      console.log('🚀 Starting N8N workflow with data:', completeData);
      
      const result = await mutateAsync({ data: completeData, isTest });
      console.log('✅ N8N workflow result:', result);
      
      if (result && result.success !== false && result.executionId) {
        setExecutionId(result.executionId.toString());
        if (analyzeId) {
          console.log('🔄 Component: About to call updateAnalyze with:', {
            id: analyzeId,
            executionId: result.executionId.toString(),
            executionStatus: 'started',
            executionStep: 0
          });
          
          const updatedAnalyze = await updateAnalyze.mutateAsync({
            id: analyzeId,
            executionId: result.executionId.toString(),
            executionStatus: 'started',
            executionStep: 0
          });
          
          console.log('✅ Component: updateAnalyze completed:', updatedAnalyze);
        }
        await saveProgress(completeData, currentStep, 'finished');
        setQuizData(completeData);
        setShowAnimation(true);
        showNotification('success', 'Success', 'Analysis request submitted successfully!');
      } else {
        await saveProgress(completeData, currentStep, 'progress');
        showNotification('error', 'N8N Workflow Failed', 'The analysis workflow did not complete successfully.');
      }
    } catch (error) {
      console.error('❌ N8N workflow error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      showNotification('error', 'N8N Workflow Execution Failed', 'Unable to start the analysis workflow.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrentStep(0);
    setShowResults(false);
    setShowAnimation(false);
    setAnalyzeId(null);
    setQuizData({ companyName: '', businessLine: '', country: '', useCase: '', timeline: '' });
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('analyzeId');
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setShowResults(true);
  };

  const currentQuestion = QUESTIONS[currentStep];

  if (!currentQuestion && currentStep < 5) {
    return (
      <div style={{ padding: '24px', background: '#141414', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={3} style={{ color: '#d9d9d9' }}>Error: Question not found</Title>
        </Card>
      </div>
    );
  }

  if (isLoadingProgress || (analyzeId && isLoadingAnalyze)) {
    return (
      <div style={{ padding: '24px', background: '#141414', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" style={{ marginBottom: '16px' }} />
            <Title level={3} style={{ color: '#d9d9d9' }}>Loading your progress...</Title>
          </div>
        </Card>
      </div>
    );
  }

  if (showAnimation) {
    return (
      <Animation 
        title="Analysis in Progress"
        description="Your company analysis is being processed. This may take a few minutes."
        onComplete={handleAnimationComplete}
      />
    );
  }

  if (showResults) {
    return <AnalyzeResult quizData={quizData} onReset={handleReset} />;
  }

  return (
    <div style={{ padding: '24px', background: '#141414', minHeight: '100vh', maxWidth: '900px', margin: '0 auto' }}>
      <Card style={{ background: '#1f1f1f', border: '1px solid #303030', borderRadius: '12px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>Company Analysis Quiz</Title>
          <Text style={{ color: '#8c8c8c' }}>Step-by-step analysis request form</Text>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: '32px' }}>
          <Steps
            current={currentStep}
            items={STEPS.map((step, index) => ({
              title: step.title,
              description: step.description,
              icon: step.icon,
              status: index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait'
            }))}
            style={{ marginBottom: '24px' }}
          />
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#8c8c8c' }}>Step {currentStep + 1} of {STEPS.length}</Text>
          </div>
        </div>

        {/* Question Form */}
        {currentStep < 5 && currentQuestion && (
          <Card style={{ background: '#262626', border: '1px solid #434343', borderRadius: '8px', marginBottom: '32px' }} bodyStyle={{ padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={3} style={{ color: '#d9d9d9', marginBottom: '8px' }}>{currentQuestion.label}</Title>
            </div>

            <Form form={form} layout="vertical" initialValues={quizData} style={{ maxWidth: '500px', margin: '0 auto' }}>
              <Form.Item name={currentQuestion.name} rules={[{ required: currentQuestion.required, message: 'This field is required' }]}>
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
                      padding: '12px 16px',
                      height: '48px'
                    }}
                    onPressEnter={handleNext}
                  />
                ) : currentQuestion.type === 'select' ? (
                  <Select
                    placeholder={currentQuestion.placeholder}
                    size="large"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      height: '48px',
                      width: '100%'
                    }}
                    dropdownStyle={{ background: '#1f1f1f', border: '1px solid #434343' }}
                    onSelect={() => setTimeout(handleNext, 100)}
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
        )}

        {/* Navigation Buttons */}
        {currentStep < 5 && currentQuestion && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
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
                loading={loading || isPending || createAnalyze.isPending || updateAnalyze.isPending}
                icon={currentStep === STEPS.length - 1 ? <SendOutlined /> : undefined}
                style={{
                  background: '#58bfce',
                  border: '1px solid #58bfce',
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px'
                }}
              >
                {currentStep === STEPS.length - 1 ? 'Generate Analysis' : 'Next'}
              </Button>
            </Space>
          </div>
        )}

        {/* Progress Summary */}
        {Object.values(quizData).some(value => value) && (
          <Card style={{ background: '#262626', border: '1px solid #434343', borderRadius: '8px', marginTop: '32px' }} bodyStyle={{ padding: '20px' }}>
            <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
              <CheckCircleOutlined style={{ marginRight: '8px' }} />
              Progress Summary
            </Title>
            <div style={{ color: '#d9d9d9' }}>
              {quizData.companyName && <p><strong>Company:</strong> {quizData.companyName}</p>}
              {quizData.businessLine && <p><strong>Business Line:</strong> {quizData.businessLine}</p>}
              {quizData.country && <p><strong>Country:</strong> {quizData.country}</p>}
              {quizData.useCase && <p><strong>Use Case:</strong> {quizData.useCase}</p>}
              {quizData.timeline && <p><strong>Timeline:</strong> {quizData.timeline}</p>}
            </div>
          </Card>
          
        )}
      </Card>
    </div>
  );
}
