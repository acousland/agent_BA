import React, { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
import { TopicSidebar } from './TopicSidebar';
import type { TopicState, AppConfig, Message } from './types';
import './styles/glass.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<TopicState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config:', err));
  }, []);

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

  const handleNavigate = async (stepId: string, topicId: string) => {
    if (!state) return;

    try {
      const response = await fetch(`${API_URL}/api/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          stepId,
          topicId
        })
      });

      const data = await response.json();
      setState(data.state);

      // Load messages for this topic
      const topicMessages = data.state.steps[stepId].topics[topicId].transcript;
      setMessages(topicMessages);
    } catch (err) {
      console.error('Failed to navigate:', err);
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
      a.download = 'initiative-summary.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  if (!config) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  }

  return (
    <div className="app-container">
      <div className="chat-section">
        <ChatWindow
          title="Initiative Idea Development"
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
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
  );
}

export default App;
