'use client'

import React from 'react'

interface ToggleOption {
  value: string | number
  label: string
}

interface ToggleSwitchProps {
  options: ToggleOption[]
  value: string | number
  onChange: (value: string | number) => void
  name?: string
  className?: string
}

export default function ToggleSwitch({
  options,
  value,
  onChange,
  name = 'toggleSwitch',
  className = '',
}: ToggleSwitchProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="relative mx-auto flex w-64 flex-wrap rounded-lg bg-gray-200 p-0.5 text-sm shadow-sm">
        {options.map(option => (
          <label
            key={option.value}
            className="flex-1 cursor-pointer text-center"
          >
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <span
              className={`relative flex items-center justify-center rounded-md py-2 transition-all duration-150 ease-in-out ${
                value === option.value
                  ? 'bg-white font-semibold text-slate-700 shadow-md'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
