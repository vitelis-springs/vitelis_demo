'use client';

import React, { useState } from 'react';
import { Steps, Card, Button, Space, Typography, message } from 'antd';
import { 
  UserOutlined, 
  SolutionOutlined, 
  LoadingOutlined, 
  SmileOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AnimationProps {
  title?: string;
  description?: string;
}

export default function Animation({ 
  title = "Animated Steps Demo", 
  description = "Interactive step-by-step animation component" 
}: AnimationProps) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      title: 'User Input',
      description: 'Enter your information',
      icon: <UserOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 1: User Information</Title>
          <Text style={{ color: '#8c8c8c' }}>
            This is the first step where users can input their basic information.
            The form will collect essential details to proceed with the process.
          </Text>
        </Card>
      )
    },
    {
      title: 'Processing',
      description: 'Analyzing your data',
      icon: <SolutionOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 2: Data Processing</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your information is being processed and analyzed. This step involves
            data validation and preparation for the next phase.
          </Text>
        </Card>
      )
    },
    {
      title: 'Loading',
      description: 'Please wait...',
      icon: <LoadingOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 3: Loading & Processing</Title>
          <Text style={{ color: '#8c8c8c' }}>
            The system is now loading and processing your request. This may take
            a few moments depending on the complexity of your data.
          </Text>
        </Card>
      )
    },
    {
      title: 'Review',
      description: 'Review results',
      icon: <SmileOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 4: Review Results</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Review the processed results and confirm that everything looks correct.
            You can make adjustments if needed before finalizing.
          </Text>
        </Card>
      )
    },
    {
      title: 'Complete',
      description: 'All done!',
      icon: <CheckCircleOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 5: Completion</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Congratulations! The process has been completed successfully.
            Your data has been processed and saved. You can now proceed with your next steps.
          </Text>
        </Card>
      )
    }
  ];

  const next = async () => {
    if (current === 2) {
      // Simulate loading for step 3
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLoading(false);
    }
    
    setCurrent(current + 1);
    message.success(`Moved to step ${current + 2}`);
  };

  const prev = () => {
    setCurrent(current - 1);
    message.info(`Moved back to step ${current}`);
  };

  const reset = () => {
    setCurrent(0);
    message.info('Reset to first step');
  };

  return (
    <div style={{ 
      padding: '24px', 
      background: '#141414', 
      minHeight: '100vh',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <Card 
        style={{ 
          background: '#1f1f1f', 
          border: '1px solid #303030',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
            {title}
          </Title>
          <Text style={{ color: '#8c8c8c' }}>
            {description}
          </Text>
        </div>

        <Steps
          current={current}
          items={steps.map((item, index) => ({
            title: item.title,
            description: item.description,
            icon: index === 2 && loading ? <LoadingOutlined spin /> : item.icon,
            status: index < current ? 'finish' : index === current ? 'process' : 'wait'
          }))}
          style={{ marginBottom: '24px' }}
        />

        <div style={{ marginTop: '24px' }}>
          {steps[current].content}
        </div>

        <div style={{ 
          marginTop: '24px', 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          {current > 0 && (
            <Button 
              onClick={prev}
              style={{
                background: '#1f1f1f',
                border: '1px solid #303030',
                color: '#d9d9d9'
              }}
            >
              Previous
            </Button>
          )}
          
          {current < steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={next}
              loading={loading}
              style={{
                background: '#58bfce',
                border: '1px solid #58bfce'
              }}
            >
              Next
            </Button>
          )}
          
          {current === steps.length - 1 && (
            <Button 
              type="primary"
              onClick={reset}
              style={{
                background: '#52c41a',
                border: '1px solid #52c41a'
              }}
            >
              Reset
            </Button>
          )}
        </div>

        <div style={{ 
          marginTop: '16px', 
          textAlign: 'center' 
        }}>
          <Text style={{ color: '#8c8c8c' }}>
            Step {current + 1} of {steps.length}
          </Text>
        </div>
      </Card>
    </div>
  );
}
