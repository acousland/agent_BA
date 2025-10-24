import React, { useState, useRef, useEffect } from 'react';
import type { Message } from './types';

interface ChatWindowProps {
  title: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  bannerText?: string;
}

export function ChatWindow({ title, messages, onSendMessage, isLoading, bannerText }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="chat-window glass">
      <div className="chat-header">
        <h1>{title}</h1>
      </div>
      {bannerText && (
        <div className="revisit-banner">
          {bannerText}
        </div>
      )}

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
