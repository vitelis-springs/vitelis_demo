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
  Space,
  Spin,
  App
} from 'antd';
const { TextArea } = Input;
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  SendOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useRunWorkflow, useGetExecutionDetails } from '@hooks/api/useN8NService';
import { useAnalyzeService, useGetAnalyze } from '@hooks/api/useAnalyzeService';
import Animation from './Animation';
import AnalyzeResult from './AnalyzeResult';
import ExtendedAnalyzeResult from './ExtendedAnalyzeResult';
import Sidebar from './ui/sidebar';
import { Layout } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
}

interface AnalyzeQuizProps {
  onComplete?: (data: AnalyzeQuizData) => void;
}

const FORM_FIELDS = [
  {
    name: 'companyName',
    label: 'Company Name',
    type: 'input',
    placeholder: 'e.g., Adidas, Nike, Apple...',
    required: true
  },
  {
    name: 'businessLine',
    label: 'Business Line / Industry',
    type: 'input',
    placeholder: 'e.g., Sportswear, Technology, Automotive...',
    required: true
  },
  {
    name: 'country',
    label: 'Country',
    type: 'input',
    placeholder: 'e.g., Germany, United States, Japan...',
    required: true
  },
  {
    name: 'useCase',
    label: 'Use Case / Analysis Area',
    type: 'select',
    placeholder: 'Select a use case...',
    options: [
      'Leadership',
      'AI Maturity',
      'Insurance CX',
      'Efficiency',
      'SalesMiner'
    ],
    required: true
  },
  {
    name: 'timeline',
    label: 'Timeline',
    type: 'input',
    placeholder: 'e.g., Q1 2025, Q1 2024 - Q3 2025...',
    required: true
  },

  {
    name: 'language',
    label: 'Language',
    type: 'select',
    placeholder: 'Select language...',
    options: [
      'English',
      'German'
    ],
    required: true
  },
  {
    name: 'additionalInformation',
    label: 'Additional Information',
    type: 'textarea',
    placeholder: 'Any additional context, specific requirements, or notes for the analysis...',
    required: false
  }
];

export default function AnalyzeQuiz({ onComplete }: AnalyzeQuizProps) {
  const { notification: appNotification } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [executionId, setExecutionId] = useState('');
  const [quizData, setQuizData] = useState<AnalyzeQuizData>({
    companyName: '', businessLine: '', country: '', useCase: '', timeline: '', language: '', additionalInformation: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const isTest = true;
  
  const { mutateAsync, isPending } = useRunWorkflow();
  const { createAnalyze, updateAnalyze } = useAnalyzeService();
  const { data: analyzeData, isLoading: isLoadingAnalyze } = useGetAnalyze(analyzeId, {
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!analyzeId
  });

  // Load progress from URL
  useEffect(() => {
    const urlAnalyzeId = searchParams.get('analyzeId');
    if (urlAnalyzeId) {
      setAnalyzeId(urlAnalyzeId);
    } else {
      setAnalyzeId(null);
      setShowResults(false);
      setExecutionId('');
      setQuizData({ companyName: '', businessLine: '', country: '', useCase: '', timeline: '', language: '', additionalInformation: '' });
      form.resetFields();
    }
    setIsLoadingProgress(false);
  }, [searchParams, form]);

  // Handle analyze data
  useEffect(() => {
    if (analyzeData) {
      console.log('📊 Component: Analyze data loaded:', analyzeData);
      
      // Set quiz data from analyze data
      setQuizData({
        companyName: analyzeData.companyName || '',
        businessLine: analyzeData.businessLine || '',
        country: analyzeData.country || '',
        useCase: analyzeData.useCase || '',
        timeline: analyzeData.timeline || '',
        language: analyzeData.language || '',
        additionalInformation: analyzeData.additionalInformation || ''
      });
      
      // Check if status is error or canceled - show quiz form with error
      if (analyzeData.status === 'error' || analyzeData.status === 'canceled') {
        console.log('❌ Component: Analysis failed with status:', analyzeData.status);
        setShowResults(false);
        showNotification('error', 'Analysis Failed', `The analysis was ${analyzeData.status}. Please try again.`);
        return;
      }
      
      // Check if status is finished - show results (regardless of resultText or other fields)
      if (analyzeData.status === 'finished') {
        console.log('📋 Component: Analysis completed, showing results');
        setShowResults(true);
        return;
      }
      
      // Check if we have executionId and status is not finished - show animation
      if (analyzeData.executionId && analyzeData.status !== 'finished') {
        console.log('🎬 Component: Found executionId, showing animation');
        setExecutionId(analyzeData.executionId);
        setShowResults(false);
        return;
      }
      
      // Default: show quiz form
      console.log('📝 Component: Loading quiz progress');
      setShowResults(false);
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

  const createNewAnalyzeRecord = async (data: Partial<AnalyzeQuizData>): Promise<string | null> => {
    try {
      const newAnalyzeData = {
        companyName: data.companyName || '',
        businessLine: data.businessLine || '',
        country: data.country || '',
        useCase: data.useCase || '',
        timeline: data.timeline || '',
        language: data.language || '',
        additionalInformation: data.additionalInformation || '',
        status: 'progress' as const
      };

      const result = await createAnalyze.mutateAsync(newAnalyzeData);
      if (result) {
        const newAnalyzeId = result._id as string;
        setAnalyzeId(newAnalyzeId);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('analyzeId', newAnalyzeId);
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
        return newAnalyzeId;
      }
      return null;
    } catch (error) {
      showNotification('error', 'Failed to Create Analysis Record', 'Unable to create a new analysis record.');
      return null;
    }
  };

  const saveProgress = async (data: Partial<AnalyzeQuizData>, status: 'progress' | 'finished' = 'progress') => {
    try {
      if (!analyzeId) return;
      const updateData = {
        id: analyzeId,
        companyName: data.companyName || '',
        businessLine: data.businessLine || '',
        country: data.country || '',
        useCase: data.useCase || '',
        timeline: data.timeline || '',
        language: data.language || '',
        additionalInformation: data.additionalInformation || '',
        status
      };
      await updateAnalyze.mutateAsync(updateData);
    } catch (error) {
      showNotification('warning', 'Failed to Save Progress', 'Unable to save your progress.');
    }
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedQuizData = { ...quizData, ...values };
      setQuizData(updatedQuizData);
      
      let currentAnalyzeId = analyzeId;
      if (!currentAnalyzeId) {
        const newAnalyzeId = await createNewAnalyzeRecord(updatedQuizData);
        currentAnalyzeId = newAnalyzeId;
      }
      
      await handleWorkflowSubmit(values, currentAnalyzeId);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleWorkflowSubmit = async (values: AnalyzeQuizData, analyzeIdToUse?: string | null) => {
    setLoading(true);
    try {
      const completeData = { ...quizData, ...values };
      console.log('🚀 Starting N8N workflow with data:', completeData);
      
      const result = await mutateAsync({ data: completeData, isTest });
      console.log('✅ N8N workflow result:', result);
      
      if (result && result.success !== false && result.executionId) {
        setExecutionId(result.executionId.toString());
        const currentAnalyzeId = analyzeIdToUse || analyzeId;
        if (currentAnalyzeId) {
          console.log('🔄 Component: About to call updateAnalyze with:', {
            id: currentAnalyzeId,
            executionId: result.executionId.toString(),
            executionStatus: 'started'
          });
          
          const updatedAnalyze = await updateAnalyze.mutateAsync({
            id: currentAnalyzeId,
            executionId: result.executionId.toString(),
            executionStatus: 'started',
            companyName: completeData.companyName,
            businessLine: completeData.businessLine,
            country: completeData.country,
            useCase: completeData.useCase,
            timeline: completeData.timeline,
            language: completeData.language,
            additionalInformation: completeData.additionalInformation
          });
          
          console.log('✅ Component: updateAnalyze completed:', updatedAnalyze);
        }
        await saveProgress(completeData, 'finished');
        setQuizData(completeData);
        showNotification('success', 'Success', 'Analysis request submitted successfully!');
      } else {
        await saveProgress(completeData, 'progress');
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
    setShowResults(false);
    setExecutionId('');
    setAnalyzeId(null);
    setQuizData({ companyName: '', businessLine: '', country: '', useCase: '', timeline: '', language: '' });
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('analyzeId');
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  const handleAnimationComplete = () => {
    setExecutionId('');
    setShowResults(true);
  };



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

  if (executionId) {
    return (
      <Animation 
        title="Analysis in Progress"
        description="Your company analysis is being processed. This may take a few minutes."
        executionId={executionId}
        companyName={quizData.companyName}
        executionStep={analyzeData?.executionStep}
        analyzeId={analyzeId || undefined}
        analyzeData={analyzeData}
        onComplete={handleAnimationComplete}
      />
    );
  }

  if (showResults) {
    // Check if analyze data has summary field - use ExtendedAnalyzeResult
    if (analyzeData?.summary) {
      return (
        <ExtendedAnalyzeResult 
          quizData={quizData} 
          summary={analyzeData.summary}
          improvementLeverages={analyzeData.improvementLeverages}
          headToHead={analyzeData.headToHead}
          sources={analyzeData.sources}
          onReset={handleReset} 
        />
      );
    }
    
    // Fallback to original AnalyzeResult for backward compatibility
    return <AnalyzeResult quizData={quizData} resultText={analyzeData?.resultText} onReset={handleReset} />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '24px',
          background: '#141414',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ width: '100%' }}>
            <Card style={{ background: '#1f1f1f', border: '1px solid #303030', borderRadius: '12px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>Request Report Form</Title>
          <Text style={{ color: '#8c8c8c' }}>Complete analysis request form</Text>
        </div>

        {/* Form */}
        <Card style={{ background: '#262626', border: '1px solid #434343', borderRadius: '8px', marginBottom: '32px' }} styles={{ body: { padding: '32px' } }}>
          <Form form={form} layout="vertical" initialValues={quizData} style={{ width: '100%' }}>
            {FORM_FIELDS.map((field) => (
              <Form.Item 
                key={field.name}
                name={field.name} 
                label={<Text style={{ color: '#d9d9d9', fontSize: '16px', fontWeight: '500' }}>{field.label}</Text>}
                rules={[{ required: field.required, message: 'This field is required' }]}
                style={{ marginBottom: '24px' }}
              >
                {field.type === 'input' ? (
                  <Input
                    placeholder={field.placeholder}
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
                  />
                ) : field.type === 'textarea' ? (
                  <TextArea
                    placeholder={field.placeholder}
                    size="large"
                    rows={4}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      color: '#d9d9d9',
                      fontSize: '16px',
                      padding: '12px 16px',
                      resize: 'vertical'
                    }}
                  />
                ) : field.type === 'select' ? (
                  <Select
                    placeholder={field.placeholder}
                    size="large"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      height: '48px',
                      width: '100%'
                    }}
                    styles={{ popup: { root: { background: '#1f1f1f', border: '1px solid #434343' } } }}
                  >
                    {field.options?.map((option, index) => (
                      <Option key={index} value={option}>
                        <Text style={{ color: '#d9d9d9' }}>{option}</Text>
                      </Option>
                    ))}
                  </Select>
                ) : null}
              </Form.Item>
            ))}
          </Form>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
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
            onClick={handleFormSubmit}
            loading={loading || isPending || createAnalyze.isPending || updateAnalyze.isPending}
            icon={<SendOutlined />}
            style={{
              background: '#58bfce',
              border: '1px solid #58bfce',
              borderRadius: '8px',
              height: '48px',
              padding: '0 24px'
            }}
          >
            Generate Analysis
          </Button>
        </div>


            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
