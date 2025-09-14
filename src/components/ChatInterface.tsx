import { useState, useRef, useEffect } from 'react';
import { TextInput, Button, Paper, Text, LoadingOverlay, ActionIcon, MantineProvider } from '@mantine/core';
import { IconSend, IconRefresh, IconAlertCircle, IconRobot } from '@tabler/icons-react';
import { chatApi } from '../utils/api';
import type { ChatResponse } from '../utils/api';
import '../styles/ChatInterface.scss';
import { showNotification } from '@mantine/notifications';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your news assistant. Ask me anything about recent news!',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };
  
  const testConnection = async () => {
    try {
      console.clear()
      console.log("message")
      console.log("env",import.meta.env.VITE_API_URL)
      console.log('Testing connection to backend...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`);
      const data = await response.json();
      console.log('Backend health check:', data);
      showNotification({
        title: 'Connection Test',
        message: `Connected to backend: ${JSON.stringify(data)}`,
        color: 'green',
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      showNotification({
        title: 'Connection Test Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages]);

  // Initialize chat session on component mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const session = await chatApi.startSession();
        setSessionId(session.sessionId);
        setConnectionError(null);
        
        // Update welcome message with session info
        setMessages([{
          id: '1',
          content: `Hello! I'm your news assistant. Ask me anything about recent news! (Session: ${session.sessionId.slice(0, 8)}...)`,
          isUser: false,
          timestamp: new Date(),
        }]);
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
        setConnectionError('Failed to connect to the chat service. Please refresh the page to try again.');
        showNotification({
          title: 'Connection Error',
          message: 'Unable to connect to the chat service',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(sessionId, input) as ChatResponse;
      
      // Format the response to show the answer and sources
      let formattedResponse = response.answer || 'I received your message but got an empty response.';
      
      // Add sources if available
      if (response.hits && response.hits.length > 0) {
        formattedResponse += '\n\n**Sources:**\n';
        response.hits.forEach((hit, index) => {
          if (hit.payload?.title) {
            formattedResponse += `\n${index + 1}. ${hit.payload.title}`;
            if (hit.payload.url) {
              formattedResponse += ` (${hit.payload.url})`;
            }
          }
        });
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: formattedResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConnectionError(null);
    } catch (err: any) {
      console.error('Chat API Error:', err);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Chat session not found. Please refresh the page to start a new chat.';
          setSessionId(null);
        } else if (err.response.status === 503) {
          errorMessage = 'The service is currently unavailable. Please try again later.';
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        setConnectionError('Connection lost. Trying to reconnect...');
      }
      
      showNotification({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      const session = await chatApi.startSession();
      setSessionId(session.sessionId);
      
      setMessages([
        {
          id: Date.now().toString(),
          content: `Chat reset. New session started (${session.sessionId.slice(0, 8)}...). How can I help you today?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to reset chat:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to reset chat. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInitializing) {
    return (
      <div className="chat-container">
        <Paper shadow="sm" className="chat-paper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <IconRobot size={48} style={{ marginBottom: '1rem' }} />
            <Text size="lg" fw={600} mb="sm">Initializing Chat...</Text>
            <Text size="sm" c="dimmed">Please wait while we set up your chat session</Text>
          </div>
        </Paper>
      </div>
    );
  }

  return (
    <div style={{ display: 'contents' }}>
    <MantineProvider>
      <div className="chat-container">
        <Paper shadow="sm" className="chat-paper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div className="chat-header">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              width: '100%',
              gap: '10px'
            }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  overflow: 'hidden'
                }}>
                  <Text size="md" fw={600} style={{ whiteSpace: 'nowrap' }}>
                    News Assistant
                  </Text>
                  <Button 
                    variant="subtle" 
                    size="xs" 
                    onClick={testConnection}
                    leftSection={<IconRefresh size={12} />}
                    title="Test Backend Connection"
                    p={4}
                    style={{ flexShrink: 0 }}
                  >
                    <span style={{ 
                      display: 'none',
                      '@media (minWidth: 400px)': { 
                        display: 'inline' 
                      } 
                    } as React.CSSProperties}>Test</span>
                  </Button>
                </div>
                {sessionId && (
                  <Text size="xs" c="dimmed" style={{ 
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    maxWidth: '100%'
                  }}>
                    Session: {sessionId.slice(0, 8)}...
                  </Text>
                )}
              </div>
              <ActionIcon 
                variant="outline" 
                color="blue" 
                onClick={handleReset}
                title="Start New Chat"
                size="sm"
                style={{ flexShrink: 0 }}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </div>
          </div>
          
          {/* Scrollable Messages Area */}
          <div className="messages-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div className="messages" style={{ minHeight: 'min-content' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.isUser ? 'user' : 'bot'}`}
                >
                  <div className="message-content">
                    {message.content.split('\n').map((paragraph, i) => {
                      if (!paragraph.trim()) return null;
                      
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = [];
                      let lastIndex = 0;
                      let match;
                      
                      while ((match = urlRegex.exec(paragraph)) !== null) {
                        if (match.index > lastIndex) {
                          parts.push(paragraph.substring(lastIndex, match.index));
                        }
                        
                        const url = match[0];
                        parts.push(
                          <a 
                            key={match.index} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#228be6', textDecoration: 'underline' }}
                          >
                            {url}
                          </a>
                        );
                        
                        lastIndex = match.index + url.length;
                      }
                      
                      if (lastIndex < paragraph.length) {
                        parts.push(paragraph.substring(lastIndex));
                      }
                      
                      return (
                        <Text key={i} size="sm" style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
                          {parts.length > 0 ? parts : paragraph}
                        </Text>
                      );
                    })}
                  </div>
                  <Text size="xs" c="dimmed" className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Error Message */}
          {connectionError && (
            <div style={{ 
              backgroundColor: 'rgba(255, 0, 0, 0.1)', 
              padding: '0.5rem', 
              borderRadius: '4px',
              margin: '0 1rem 0.5rem',
              textAlign: 'center'
            }}>
              <Text size="sm" c="red">
                <IconAlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {connectionError}
              </Text>
            </div>
          )}
          
          {/* Input Area - Wrapped in a stable container */}
          <div style={{ 
            position: 'sticky',
            bottom: 0,
            background: 'white',
            borderTop: '1px solid #e9ecef',
            padding: '0.75rem 1rem',
            zIndex: 10
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <TextInput
                placeholder={sessionId ? "Ask me anything about recent news..." : "Connecting to chat service..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="message-input"
                disabled={isLoading || !sessionId}
                style={{
                  flex: 1,
                  minWidth: 0, // Prevents flex item from overflowing
                }}
                styles={{
                  input: {
                    paddingRight: '60px', // Space for button
                    height: '48px',
                    fontSize: '1rem',
                    borderRadius: '24px',
                    border: '1px solid #ced4da',
                    transition: 'all 0.2s ease',
                    '&:focus': {
                      borderColor: '#228be6',
                      boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)'
                    }
                  }
                }}
              />
              <Button
                variant="filled"
                color="blue"
                size="sm"
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || !sessionId}
                loading={isLoading}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '42px',
                  height: '42px',
                  minWidth: '42px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  '&:active:not(:disabled)': {
                    transform: 'translateY(-50%) scale(0.95)'
                  }
                }}
                title={!sessionId ? "Connecting to chat service..." : "Send message"}
              >
                {!isLoading && <IconSend size={18} />}
              </Button>
            </div>
          </div>
          
          <LoadingOverlay visible={isLoading} />
        </Paper>
      </div>
    </MantineProvider>
    </div>
  );
}

export default ChatInterface;
