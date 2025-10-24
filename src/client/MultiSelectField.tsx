import React, { useState } from 'react';

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  onSubmit: (selected: string[]) => void;
}

export function MultiSelectField({ label, options, onSubmit }: MultiSelectFieldProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (option: string) => {
    setSelected(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onSubmit(selected);
    }
  };

  return (
    <div className="multiselect-field">
      <label className="multiselect-label">{label}</label>
      <div className="multiselect-options">
        {options.map((option) => (
          <label key={option} className="multiselect-option">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggleOption(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <button
        className="multiselect-submit"
        onClick={handleSubmit}
        disabled={selected.length === 0}
      >
        Submit Selection ({selected.length} selected)
      </button>
    </div>
  );
}
