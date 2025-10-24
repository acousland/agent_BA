import React, { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
import { TopicSidebar } from './TopicSidebar';
import { ConfigSelector } from './ConfigSelector';
import type { TopicState, AppConfig, Message } from './types';
import './styles/glass.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<TopicState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<string[]>([]);
  const [currentConfig, setCurrentConfig] = useState<string>('');

  // Load available configs on mount
  useEffect(() => {
    fetch(`${API_URL}/api/configs/list`)
      .then(res => res.json())
      .then(data => {
        setAvailableConfigs(data.configs);
        setCurrentConfig(data.currentConfig);
      })
      .catch(err => console.error('Failed to load configs:', err));
  }, []);

  // Load current config
  useEffect(() => {
    if (!currentConfig) return;

    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config:', err));
  }, [currentConfig]);

  // Initialize session on mount
  useEffect(() => {
    if (!config) return;

    setIsLoading(true);
    fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '', message: '' })
    })
      .then(res => res.json())
      .then(data => {
        setState(data.state);
        setMessages([{ role: 'assistant', text: data.reply }]);
      })
      .catch(err => console.error('Failed to initialize:', err))
      .finally(() => setIsLoading(false));
  }, [config]);

  const handleSendMessage = async (message: string) => {
    if (!state) return;

    // Add user message to UI immediately
    const userMessage: Message = { role: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          message
        })
      });

      const data = await response.json();
      setState(data.state);

      // Add assistant response
      const assistantMessage: Message = { role: 'assistant', text: data.reply };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = async (topicId: string) => {
    if (!state) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          topicId
        })
      });

      const data = await response.json();
      setState(data.state);

      // Load messages for this topic
      const topicMessages = data.state.topics[topicId].transcript;
      setMessages(topicMessages);
    } catch (err) {
      console.error('Failed to navigate:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!state || !state.done) return;

    try {
      const response = await fetch(`${API_URL}/api/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config?.docx.fileName || 'session-summary.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  const handleConfigChange = async (configName: string) => {
    try {
      // Switch config on backend
      const response = await fetch(`${API_URL}/api/configs/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentConfig(configName);
        setConfig(data.config);
        // Reset session state
        setState(null);
        setMessages([]);
        // Will trigger re-initialization via useEffect
      }
    } catch (err) {
      console.error('Failed to switch config:', err);
    }
  };

  if (!config || availableConfigs.length === 0) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  }

  const activeTopic = state ? config.topics.find(topic => topic.id === state.activeTopicId) : undefined;
  const isRevisitingActiveTopic =
    Boolean(state && state.revisitingTopicId && state.revisitingTopicId === state.activeTopicId);
  const revisitBanner = isRevisitingActiveTopic
    ? `Revisiting ${activeTopic?.title ?? 'this topic'} — let me know what you'd like to tweak.`
    : undefined;

  return (
    <div className="app-container">
      <ConfigSelector
        configs={availableConfigs}
        currentConfig={currentConfig}
        onConfigChange={handleConfigChange}
      />

      <div className="main-content">
        <div className="chat-section">
          <ChatWindow
            title={config.appTitle}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            bannerText={revisitBanner}
          />
        </div>

        <div className="sidebar-section">
          <TopicSidebar
            config={config}
            state={state}
            onNavigate={handleNavigate}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
