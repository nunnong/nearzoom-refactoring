'use client'

import React from 'react';

interface PhotoCutSelectorProps {
  cutCount: number
  onChange: (count: number) => void
}

export default function PhotoCutSelector({ cutCount, onChange }: PhotoCutSelectorProps) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex w-64 flex-wrap rounded-lg bg-gray-200 p-0.5 text-sm shadow-sm">
        {[1, 2, 4].map(n => (
          <label key={n} className="flex-1 cursor-pointer text-center">
            <input
              type="radio"
              name="cutCount"
              checked={cutCount === n}
              onChange={() => onChange(n)}
              className="hidden"
            />
            <span
              className={`relative flex items-center justify-center rounded-md py-2 transition-all duration-150 ease-in-out ${
                cutCount === n
                  ? 'bg-white font-semibold text-slate-700 shadow-md'
                  : 'text-slate-600 hover:bg-white/50'
              } `}
            >
              {n}컷
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
