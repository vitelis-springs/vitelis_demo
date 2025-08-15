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
  message as antMessage,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useState, useRef, useEffect } from 'react';
import { chatService, Message as ChatMessage } from '../../services/chatService';
import { useRouter, useSearchParams } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AnalysisData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
}

export default function AnalyzeChat() {
  const { email } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    companyName: '',
    businessLine: '',
    country: '',
    useCase: '',
    timeline: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const questions = [
    "What is the name of the company you want to analyze?",
    "What is the main business line or industry of this company?",
    "In which country does this company operate?",
    "What is the specific use case or area you want to analyze? (e.g., Leadership, Marketing, Finance, Operations)",
    "What is your preferred timeline for this analysis? (e.g., Q1 2025, Q1 2024 - Q3 2025)"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat - either load existing or prepare for new
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoadingChat(true);
        const chatId = searchParams.get('chatId');

        if (chatId) {
          // Load existing chat
          const chatData = await chatService.getChat(chatId, email);
          setCurrentChatId(chatId);
          
          // Convert database messages to local format
          const localMessages: Message[] = chatData.messages.map(msg => ({
            id: msg._id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
          }));
          
                      setMessages(localMessages);
            
            // Determine current question based on message count
            const questionCount = localMessages.filter(msg => msg.role === 'user').length;
            setCurrentQuestion(questionCount);
          } else {
            // Prepare for new chat - don't create in DB yet
            setCurrentChatId(null);
            // Show welcome message from assistant (not saved to DB yet)
            setMessages([
              {
                id: 'welcome',
                content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
                role: 'assistant',
                timestamp: new Date(),
              }
            ]);
            setCurrentQuestion(0); // Reset question counter for new chat
          }
      } catch (error) {
        console.error('Error initializing chat:', error);
        antMessage.error('Failed to initialize chat');
      } finally {
        setIsLoadingChat(false);
      }
    };

    if (email) {
      initializeChat();
    }
  }, [email, searchParams]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setInputValue('');
    setIsLoading(true);

    try {
      let chatId = currentChatId;

      // Create new chat if this is the first message
      if (!chatId) {
        const chat = await chatService.createChat(
          email,
          'New Analysis Session',
          inputValue.substring(0, 50) + (inputValue.length > 50 ? '...' : ''),
          inputValue
        );
        chatId = chat._id;
        setCurrentChatId(chatId);
        router.replace(`/analyze?chatId=${chatId}`);
        
        // Save the welcome message to database first (earlier timestamp)
        const welcomeTimestamp = new Date(Date.now() - 1000); // 1 second earlier
        await chatService.addMessage(chatId, `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`, 'assistant', email, welcomeTimestamp);
        
        // Note: User message is already saved by createChat, so we don't need to save it again
        
        // Update local messages to include the welcome message from database and user message
        setMessages([
          {
            id: 'welcome-db',
            content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
            role: 'assistant',
            timestamp: welcomeTimestamp,
          },
          userMessage
        ]);
      } else {
        // Save user message to existing chat
        await chatService.addMessage(chatId, inputValue, 'user', email);
        // Add user message to local state for existing chats
        setMessages(prev => [...prev, userMessage]);
      }

      // Handle structured data collection
      const userInput = userMessage.content;
      let isComplete = false;

      // Update analysis data based on current question
      switch (currentQuestion) {
        case 0:
          setAnalysisData(prev => ({ ...prev, companyName: userInput }));
          break;
        case 1:
          setAnalysisData(prev => ({ ...prev, businessLine: userInput }));
          break;
        case 2:
          setAnalysisData(prev => ({ ...prev, country: userInput }));
          break;
        case 3:
          setAnalysisData(prev => ({ ...prev, useCase: userInput }));
          break;
        case 4:
          setAnalysisData(prev => ({ ...prev, timeline: userInput }));
          isComplete = true;
          break;
      }

      // Simulate AI response
      setTimeout(async () => {
        let aiResponse = '';
        
        if (isComplete) {
          // Show the collected data and provide analysis
          const collectedData = { ...analysisData, [currentQuestion === 0 ? 'companyName' : 
            currentQuestion === 1 ? 'businessLine' : 
            currentQuestion === 2 ? 'country' : 
            currentQuestion === 3 ? 'useCase' : 'timeline']: userInput };
          
          aiResponse = `Perfect! I've collected all the information. Here's what I have:

**Company Analysis Data:**
\`\`\`json
${JSON.stringify(collectedData, null, 2)}
\`\`\`

Now I'll analyze ${collectedData.companyName} (${collectedData.businessLine}) based on your ${collectedData.useCase} requirements for the ${collectedData.timeline} timeline.

Let me start the analysis...`;
        } else {
          // Ask next question
          const nextQuestionIndex = currentQuestion + 1;
          aiResponse = `**Question ${nextQuestionIndex + 1} of 5:** ${questions[nextQuestionIndex]}`;
          setCurrentQuestion(nextQuestionIndex);
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          role: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);

        // Save AI response to database
        try {
          await chatService.addMessage(chatId!, aiResponse, 'assistant', email);
        } catch (error) {
          console.error('Error saving AI message:', error);
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Failed to send message');
      setIsLoading(false);
    }
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

  if (isLoadingChat) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Sidebar />
        <Layout style={{ marginLeft: 280, background: '#141414' }}>
          <Content style={{ 
            padding: '0',
            background: '#141414',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Space direction="vertical" size="large" align="center">
              <Spin size="large" />
              <Text style={{ color: '#8c8c8c' }}>Loading chat...</Text>
            </Space>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh', background: '#141414', overflow: 'hidden' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414', height: '100vh', overflow: 'hidden' }}>
        <Content style={{ 
          padding: '0',
          background: '#141414',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '20px 24px',
            borderBottom: '1px solid #303030',
            background: '#1f1f1f',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            minHeight: '80px'
          }}>
            <div>
              <Title level={3} style={{ margin: 0, color: '#58bfce' }}>
                AI Analysis Assistant
              </Title>
              <Text style={{ color: '#8c8c8c' }}>
                Ask me anything and I'll help you analyze it
                {currentChatId && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                    (Chat ID: {currentChatId})
                  </span>
                )}
              </Text>
            </div>
            <Button
              type="primary"
              onClick={async () => {
                try {
                  setIsLoadingChat(true);
                  setCurrentChatId(null);
                  setCurrentQuestion(0);
                  setAnalysisData({
                    companyName: '',
                    businessLine: '',
                    country: '',
                    useCase: '',
                    timeline: ''
                  });
                  setMessages([
                    {
                      id: 'welcome',
                      content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
                      role: 'assistant',
                      timestamp: new Date(),
                    }
                  ]);
                  router.replace('/analyze');
                } catch (error) {
                  console.error('Error creating new chat:', error);
                  antMessage.error('Failed to create new chat');
                } finally {
                  setIsLoadingChat(false);
                }
              }}
              style={{
                background: '#58bfce',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                padding: '0 20px'
              }}
            >
              New Chat
            </Button>
          </div>

          {/* Chat Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: '#303030 #1f1f1f'
          }}
          className="chat-messages-container"
          >
            <style jsx>{`
              .chat-messages-container::-webkit-scrollbar {
                width: 8px;
              }
              .chat-messages-container::-webkit-scrollbar-track {
                background: #1f1f1f;
                border-radius: 4px;
              }
              .chat-messages-container::-webkit-scrollbar-thumb {
                background: #303030;
                border-radius: 4px;
              }
              .chat-messages-container::-webkit-scrollbar-thumb:hover {
                background: #434343;
              }
            `}</style>
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
            background: '#1f1f1f',
            flexShrink: 0
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
