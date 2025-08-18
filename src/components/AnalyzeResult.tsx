'use client';

import React from 'react';
import { Card, Typography, Space, Button, Layout } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkToc from 'remark-toc';
import remarkGfm from 'remark-gfm';
import { CheckCircleOutlined } from '@ant-design/icons';
import Sidebar from './ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  additionalInformation?: string;
}

interface AnalyzeResultProps {
  quizData: AnalyzeQuizData;
  resultText?: string;
  onReset: () => void;
}

export default function AnalyzeResult({ quizData, resultText, onReset }: AnalyzeResultProps) {
  // Use provided resultText or fallback to default content
  const reportContent = resultText || `\n\n# Analysis Report\n\nNo analysis results available yet. Please wait for the analysis to complete.`;

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
            Analysis Report Generated
          </Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your comprehensive analysis report is ready
          </Text>
        </div>

        {/* Quiz Data Summary */}
        <Card
          style={{
            background: '#262626',
            border: '1px solid #434343',
            borderRadius: '8px',
            marginBottom: '32px'
          }}
          bodyStyle={{ padding: '20px' }}
        >
          <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
            <CheckCircleOutlined style={{ marginRight: '8px' }} />
            Analysis Parameters
          </Title>
          <div style={{ color: '#d9d9d9' }}>
            <p><strong>Company:</strong> {quizData.companyName}</p>
            <p><strong>Business Line:</strong> {quizData.businessLine}</p>
            <p><strong>Country:</strong> {quizData.country}</p>
            <p><strong>Use Case:</strong> {quizData.useCase}</p>
            <p><strong>Timeline:</strong> {quizData.timeline}</p>
            {quizData.additionalInformation && (
              <p><strong>Additional Information:</strong> {quizData.additionalInformation}</p>
            )}
          </div>
        </Card>

        {/* Markdown Report */}
        <Card
          style={{
            background: '#262626',
            border: '1px solid #434343',
            borderRadius: '8px',
            marginBottom: '32px'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div style={{ 
            color: '#d9d9d9',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkToc, { tight: true, maxDepth: 3 }]
              ]}
              components={{
                h1: ({children}) => <h1 style={{color: '#58bfce', fontSize: '24px', marginBottom: '16px', marginTop: '24px'}}>{children}</h1>,
                h2: ({children}) => <h2 style={{color: '#58bfce', fontSize: '20px', marginBottom: '12px', marginTop: '20px'}}>{children}</h2>,
                h3: ({children}) => <h3 style={{color: '#58bfce', fontSize: '18px', marginBottom: '10px', marginTop: '16px'}}>{children}</h3>,
                h4: ({children}) => <h4 style={{color: '#58bfce', fontSize: '16px', marginBottom: '8px', marginTop: '14px'}}>{children}</h4>,
                p: ({children}) => <p style={{marginBottom: '12px'}}>{children}</p>,
                strong: ({children}) => <strong style={{color: '#ffffff'}}>{children}</strong>,
                table: ({children}) => (
                  <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <table style={{
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      marginBottom: '16px',
                      minWidth: '600px'
                    }}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({children}) => (
                  <th style={{
                    border: '1px solid #434343', 
                    padding: '12px 8px', 
                    textAlign: 'left', 
                    backgroundColor: '#1f1f1f', 
                    color: '#58bfce',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {children}
                  </th>
                ),
                td: ({children}) => (
                  <td style={{
                    border: '1px solid #434343', 
                    padding: '12px 8px', 
                    color: '#d9d9d9',
                    fontSize: '14px',
                    verticalAlign: 'top'
                  }}>
                    {children}
                  </td>
                ),
                ul: ({children}) => <ul style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ul>,
                ol: ({children}) => <ol style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ol>,
                li: ({children}) => <li style={{marginBottom: '4px'}}>{children}</li>,
                blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid #58bfce', paddingLeft: '16px', margin: '16px 0', fontStyle: 'italic', color: '#8c8c8c'}}>{children}</blockquote>,
                code: ({children}) => <code style={{backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace'}}>{children}</code>,
                pre: ({children}) => <pre style={{backgroundColor: '#1f1f1f', padding: '16px', borderRadius: '8px', overflow: 'auto', marginBottom: '16px'}}>{children}</pre>
              }}
            >
              {reportContent}
            </ReactMarkdown>
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button
              size="large"
              onClick={onReset}
              style={{
                background: '#1f1f1f',
                border: '1px solid #434343',
                color: '#d9d9d9',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px'
              }}
            >
              Start New Analysis
            </Button>
          </Space>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  </Layout>
  );
}
