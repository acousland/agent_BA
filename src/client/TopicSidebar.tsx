import React from 'react';
import type { TopicState, AppConfig } from './types';

interface TopicSidebarProps {
  config: AppConfig;
  state: TopicState | null;
  onNavigate: (stepId: string, topicId: string) => void;
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

  return (
    <aside className="topic-sidebar glass">
      <div className="sidebar-header">
        <h2>Progress</h2>
      </div>

      <div className="steps-list">
        {config.steps.map((step) => {
          const stepData = state?.steps[step.stepId];
          const stepStatus = stepData?.status || 'NotStarted';

          return (
            <div key={step.stepId} className="step-section">
              <div className="step-header">
                <h3>{step.displayName}</h3>
                <span className={`status-badge ${getStatusBadgeClass(stepStatus)}`}>
                  {getStatusLabel(stepStatus)}
                </span>
              </div>

              <ul className="topics-list">
                {step.topics.map((topic) => {
                  const topicData = stepData?.topics[topic.fieldName];
                  const status = topicData?.status || 'NotStarted';
                  const isActive =
                    state?.activeStepId === step.stepId &&
                    state?.activeTopicId === topic.fieldName;
                  const isComplete = status === 'Complete';
                  const isClickable = isComplete && !isActive;

                  return (
                    <li
                      key={topic.fieldName}
                      className={`topic-item ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`}
                      onClick={() => isClickable && onNavigate(step.stepId, topic.fieldName)}
                      title={topic.description}
                    >
                      <div className="topic-title">
                        {topic.displayName}
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

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
