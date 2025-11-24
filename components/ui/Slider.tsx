import React from 'react';

interface SliderProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    unit?: string;
    step?: number;
}

export const Slider: React.FC<SliderProps> = ({
    label,
    min,
    max,
    value,
    onChange,
    unit = '',
    step = 1,
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-text-secondary">{label}</label>
                <span className="text-lg font-bold text-primary">
                    {unit}{value.toLocaleString()}
                </span>
            </div>
            <div className="relative w-full h-2 bg-bg-tertiary rounded-full">
                <div
                    className="absolute h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${percentage}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute h-5 w-5 bg-white rounded-full shadow-glow border-2 border-primary top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all"
                    style={{ left: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>{unit}{min}</span>
                <span>{unit}{max}</span>
            </div>
        </div>
    );
};
