'use client';

import { useAuthStore } from '../../stores/auth-store';
import Sidebar from '../ui/sidebar';
import {
  Layout,
  Card,
  Input,
  Button,
  Typography,
  Space,
  Avatar,
  Spin,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useState, useRef, useEffect } from 'react';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function AnalyzeChat() {
  const { email } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI assistant. How can I help you analyze something today?',
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(inputValue),
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const responses = [
      "I've analyzed your request and here are my findings...",
      "Based on the data you've provided, I can see several interesting patterns...",
      "Let me break down this analysis for you...",
      "From my perspective, this suggests that...",
      "I've processed your input and here's what I found...",
      "This is an interesting case. Let me analyze it further...",
      "Based on my analysis, I recommend considering...",
      "I've identified several key points in your request...",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + 
           " This is a simulated response. In a real application, this would be connected to an AI service like OpenAI's GPT or similar.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '0',
          background: '#141414',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '20px 24px',
            borderBottom: '1px solid #303030',
            background: '#1f1f1f'
          }}>
            <Title level={3} style={{ margin: 0, color: '#58bfce' }}>
              AI Analysis Assistant
            </Title>
            <Text style={{ color: '#8c8c8c' }}>
              Ask me anything and I'll help you analyze it
            </Text>
          </div>

          {/* Chat Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  maxWidth: '800px',
                  margin: '0 auto',
                  width: '100%'
                }}
              >
                <Avatar
                  size={32}
                  icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ 
                    backgroundColor: message.role === 'user' ? '#58bfce' : '#52c41a',
                    flexShrink: 0
                  }}
                />
                <Card
                  style={{
                    background: message.role === 'user' ? '#58bfce' : '#1f1f1f',
                    border: `1px solid ${message.role === 'user' ? '#4ac8d7' : '#303030'}`,
                    borderRadius: '12px',
                    flex: 1
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Text style={{ 
                    color: message.role === 'user' ? '#fff' : '#d9d9d9',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {message.content}
                  </Text>
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '12px',
                    color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#8c8c8c'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </Card>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                maxWidth: '800px',
                margin: '0 auto',
                width: '100%'
              }}>
                <Avatar
                  size={32}
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                />
                <Card
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #303030',
                    borderRadius: '12px',
                    flex: 1
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Space>
                    <Spin indicator={<LoadingOutlined style={{ color: '#58bfce' }} />} />
                    <Text style={{ color: '#8c8c8c' }}>Analyzing...</Text>
                  </Space>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '20px 24px',
            borderTop: '1px solid #303030',
            background: '#1f1f1f'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{
                  background: '#262626',
                  border: '1px solid #434343',
                  borderRadius: '8px',
                  color: '#d9d9d9',
                  resize: 'none'
                }}
                disabled={isLoading}
              />
              <Button
                type="primary"
                icon={<SendOutlined style={{ fontSize: '25px' }} />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                style={{
                  background: '#58bfce',
                  border: 'none',
                  borderRadius: '8px',
                  height: '54px',
                  width: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '12px',
              fontSize: '12px',
              color: '#8c8c8c'
            }}>
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
