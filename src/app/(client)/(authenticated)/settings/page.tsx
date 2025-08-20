'use client';

import React, { useState } from 'react';
import { Card, Typography, Select, Layout } from 'antd';
import Sidebar from '../../../../components/ui/sidebar';

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState<string>('usual');

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    console.log('Model changed to:', value);
    // Here you can add logic to save the model preference
  };

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
            <Card style={{ 
              background: '#1f1f1f', 
              border: '1px solid #303030',
              borderRadius: '12px'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
                  Settings
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Configure your analysis preferences
                </Text>
              </div>

              {/* Model Selection */}
              <Card
                style={{
                  background: '#262626',
                  border: '1px solid #434343',
                  borderRadius: '8px',
                  marginBottom: '32px'
                }}
                styles={{ body: { padding: '32px' } }}
              >
                <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
                  Model Selection
                </Title>
                <Text style={{ color: '#8c8c8c', display: 'block', marginBottom: '16px' }}>
                  Choose your preferred analysis model
                </Text>
                
                <Select
                  value={selectedModel}
                  onChange={handleModelChange}
                  size="large"
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #434343',
                    borderRadius: '8px',
                    height: '48px',
                    width: '100%',
                    maxWidth: '300px'
                  }}
                  dropdownStyle={{ 
                    background: '#1f1f1f', 
                    border: '1px solid #434343',
                    borderRadius: '8px'
                  }}
                >
                  <Option value="usual">
                    <Text style={{ color: '#d9d9d9' }}>Usual</Text>
                  </Option>
                  <Option value="thinking">
                    <Text style={{ color: '#d9d9d9' }}>Thinking</Text>
                  </Option>
                </Select>
                
                <div style={{ marginTop: '16px' }}>
                  <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    <strong>Usual:</strong> Standard analysis model for general business insights
                  </Text>
                  <br />
                  <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    <strong>Thinking:</strong> Advanced model with deeper analytical reasoning
                  </Text>
                </div>
              </Card>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
