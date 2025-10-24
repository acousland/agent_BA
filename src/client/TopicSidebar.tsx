import React from 'react';
import type { TopicState, AppConfig } from './types';
import { getVisibleTopics } from './conditionalLogic';

interface TopicSidebarProps {
  config: AppConfig;
  state: TopicState | null;
  onNavigate: (topicId: string) => void;
  onDownload: () => void;
}

export function TopicSidebar({ config, state, onNavigate, onDownload }: TopicSidebarProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'complete';
      case 'InProgress':
        return 'in-progress';
      default:
        return 'not-started';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'Complete';
      case 'InProgress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  // Filter topics based on conditional visibility
  const visibleTopics = getVisibleTopics(config.topics, state);

  return (
    <aside className="topic-sidebar glass">
      <div className="sidebar-header">
        <h2>Topics</h2>
      </div>

      <ul className="topics-list">
        {visibleTopics.map((topic) => {
          const topicData = state?.topics[topic.id];
          const status = topicData?.status || 'NotStarted';
          const isActive = state?.activeTopicId === topic.id;
          const isComplete = status === 'Complete';
          const isClickable = isComplete && !isActive;

          return (
            <li
              key={topic.id}
              className={`topic-item ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && onNavigate(topic.id)}
            >
              <div className="topic-title">
                {topic.title}
              </div>
              <span className={`status-badge ${getStatusBadgeClass(status)}`}>
                {getStatusLabel(status)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="download-section">
        <button
          className="download-button"
          onClick={onDownload}
          disabled={!state?.done}
        >
          {state?.done ? 'Download Summary' : 'Complete All Topics'}
        </button>
      </div>
    </aside>
  );
}
