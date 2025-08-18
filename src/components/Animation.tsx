'use client';

import React, { useState, useEffect } from 'react';
import { Steps, Card, Button, Space, Typography, message, Spin, Layout } from 'antd';
import { 
  UserOutlined, 
  SolutionOutlined, 
  LoadingOutlined, 
  SmileOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileTextOutlined,
  AuditOutlined
} from '@ant-design/icons';
import Sidebar from './ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;

interface AnimationProps {
  title?: string;
  description?: string;
  executionId: string;
  companyName?: string;
  executionStep?: number;
  onComplete?: () => void;
}

export default function Animation({ 
  title = "Analysis in Progress", 
  description = "Your company analysis is being processed. This may take a few minutes.",
  executionId,
  companyName,
  executionStep,
  onComplete
}: AnimationProps) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);


  // Poll execution details
  // const { data: executionDetails } = useGetExecutionDetails(
  //   executionId,
  //   {
  //     refetchInterval: 5000, // Poll every 5 seconds
  //     enabled: !!executionId
  //   }
  // );

  const steps = [
    {
      title: 'Initialising',
      description: 'Workflow initiated',
      icon: <UserOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 1: Initialising</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your analysis request for <Text style={{ color: '#58bfce', fontWeight: 'bold' }}>{companyName || 'the company'}</Text> has been received and the workflow has been initiated.
            <br />
            Execution ID: <Text style={{ color: '#58bfce' }}>{executionId}</Text>
          </Text>
        </Card>
      )
    },
    {
      title: 'Research',
      description: 'Gathering data',
      icon: <SearchOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 2: Research</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Researching and gathering comprehensive data about <Text style={{ color: '#58bfce', fontWeight: 'bold' }}>{companyName || 'the company'}</Text>.
          
           
          </Text>
        </Card>
      )
    },
    {
      title: 'Sources Validation',
      description: 'Validating sources',
      icon: <SafetyCertificateOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 3: Sources Validation</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Validating and cross-referencing all data sources to ensure accuracy and reliability.
            This step ensures the quality of information used in the analysis.
            {executionStep && executionStep >= 2 && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current execution step: {executionStep}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Scoring',
      description: 'Calculating scores',
      icon: <BarChartOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 4: Scoring</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Applying scoring algorithms and metrics to evaluate the company's performance
            across various dimensions and criteria.
            {executionStep && executionStep >= 3 && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current execution step: {executionStep}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Report Building',
      description: 'Generating report',
      icon: <FileTextOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 5: Report Building</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Compiling all findings and insights into a comprehensive analysis report.
            This includes visualizations, recommendations, and detailed analysis.
            {executionStep && executionStep >= 4 && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current execution step: {executionStep}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Result Evaluation',
      description: 'Final review',
      icon: <AuditOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 6: Result Evaluation</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Final quality check and evaluation of the analysis results.
            Ensuring all insights are accurate and actionable.
            {executionStep && executionStep >= 5 && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current execution step: {executionStep}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    }
  ];

  // Update current step based on executionStep prop
  useEffect(() => {
    if (executionStep !== undefined) {
      const newStep = Math.min(executionStep, steps.length - 1);
      if (newStep !== current) {
        console.log(`🔄 Animation: Updating step from ${current} to ${newStep} based on executionStep: ${executionStep}`);
        setCurrent(newStep);
      }
    }
  }, [executionStep, current, steps.length]);







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
          <div style={{ maxWidth: '900px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ background: '#1f1f1f', border: '1px solid #303030', borderRadius: '12px' }}>
              <style jsx>{`
                .animation-steps .ant-steps-item-title {
                  white-space: normal !important;
                  word-wrap: break-word !important;
                  line-height: 1.2 !important;
                  max-width: 100px !important;
                  text-align: center !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  min-height: 40px !important;
                }
                
                .animation-steps .ant-steps-item-description {
                  white-space: normal !important;
                  word-wrap: break-word !important;
                  line-height: 1.2 !important;
                  max-width: 100px !important;
                  text-align: center !important;
                  font-size: 12px !important;
                }
                
                .animation-steps .ant-steps-item {
                  flex: 1 !important;
                  min-width: 0 !important;
                }
                
                .animation-steps .ant-steps-item-container {
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                }
              `}</style>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
                  {companyName ? `Analysis in Progress: ${companyName}` : title}
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  {companyName 
                    ? `Your analysis for ${companyName} is being processed. This may take a few minutes.`
                    : description
                  }
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
                className="animation-steps"
              />

              <div style={{ marginTop: '24px' }}>
                {steps[current]?.content}
              </div>

              <div style={{ 
                marginTop: '24px', 
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px'
              }}>
                
                
               
                
              
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
        </Content>
      </Layout>
    </Layout>
  );
}
