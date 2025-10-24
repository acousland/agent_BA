import React from 'react';
import logo from './assets/logo.png';

interface ConfigSelectorProps {
  configs: string[];
  currentConfig: string;
  onConfigChange: (configName: string) => void;
}

export function ConfigSelector({ configs, currentConfig, onConfigChange }: ConfigSelectorProps) {
  const formatConfigName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="config-selector glass">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="app-logo" />
      </div>
      <div className="config-controls">
        <label htmlFor="config-select">Conversation Type:</label>
        <select
          id="config-select"
          value={currentConfig}
          onChange={(e) => onConfigChange(e.target.value)}
        >
          {configs.map((config) => (
            <option key={config} value={config}>
              {formatConfigName(config)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
