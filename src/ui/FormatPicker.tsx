import { useId } from 'react';
import type { Format } from '../model/types';

const OPTIONS: { value: Format; label: string; hint: string }[] = [
  { value: '9:16', label: 'Vertical 9:16', hint: 'Shorts, Reels, TikTok' },
  { value: '16:9', label: 'Horizontal 16:9', hint: 'YouTube, widescreen' },
];

export function FormatPicker({ value, onChange }: { value: Format; onChange(format: Format): void }) {
  const name = useId();
  return (
    <fieldset className="format-picker">
      <legend>Format</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="format-option">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className={`format-shape format-shape-${option.value === '9:16' ? 'v' : 'h'}`} aria-hidden="true" />
          <span>
            <span className="format-label">{option.label}</span>
            <span className="format-hint"> {option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
