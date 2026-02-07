'use client';

// components/skills-input.tsx
// Tag-based input for skills - allows multi-word skills with spaces
// Triggers: Enter or Comma (,) to add a tag

import { useState, KeyboardEvent, ChangeEvent } from 'react';

interface SkillsInputProps {
    value: string[];
    onChange: (skills: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function SkillsInput({ value, onChange, placeholder, className }: SkillsInputProps) {
    const [inputValue, setInputValue] = useState('');

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        const currentValue = inputValue.trim();

        // Only trigger on Enter or Comma
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault(); // Prevent form submission or comma insertion

            if (currentValue && !value.includes(currentValue)) {
                onChange([...value, currentValue]);
                setInputValue('');
            }
            return;
        }

        // Backspace to remove last tag when input is empty
        if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
            onChange(value.slice(0, -1));
            return;
        }

        // Space key - DO NOT prevent default, allow normal typing
        // This allows multi-word skills like "Data Science" or "Public Speaking"
    }

    function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
        const newValue = e.target.value;

        // Check if user pasted text with commas - auto-split
        if (newValue.includes(',')) {
            const parts = newValue.split(',').map((s) => s.trim()).filter(Boolean);
            const uniqueParts = parts.filter((p) => !value.includes(p));
            if (uniqueParts.length > 0) {
                onChange([...value, ...uniqueParts]);
            }
            setInputValue('');
        } else {
            setInputValue(newValue);
        }
    }

    function removeSkill(skillToRemove: string) {
        onChange(value.filter((skill) => skill !== skillToRemove));
    }

    return (
        <div className={`skills-input-container ${className || ''}`}>
            <div className="skills-tags">
                {value.map((skill, index) => (
                    <span key={index} className="skill-tag">
                        {skill}
                        <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="skill-remove"
                            aria-label={`Remove ${skill}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : 'Add more...'}
                className="skills-input-field"
            />
            <style jsx>{`
        .skills-input-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          min-height: 42px;
          align-items: center;
        }
        .skills-input-container:focus-within {
          border-color: var(--primary);
        }
        .skills-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .skill-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: var(--primary);
          color: var(--primary-foreground);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .skill-remove {
          background: none;
          border: none;
          color: inherit;
          font-size: 1rem;
          line-height: 1;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
          padding: 0;
          margin-left: 0.125rem;
        }
        .skill-remove:hover {
          opacity: 1;
        }
        .skills-input-field {
          flex: 1;
          min-width: 120px;
          border: none;
          background: transparent;
          color: var(--foreground);
          font-size: 0.875rem;
          outline: none;
        }
        .skills-input-field::placeholder {
          color: var(--muted-foreground);
        }
      `}</style>
        </div>
    );
}
