'use client'

import React from 'react';

interface PhotoCutSelectorProps {
  cutCount: number
  onChange: (count: number) => void
  maxAvailable?: number
  availablePhotos?: number
}

export default function PhotoCutSelector({ cutCount, onChange, maxAvailable = 4, availablePhotos = 0 }: PhotoCutSelectorProps) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex w-64 flex-wrap rounded-lg bg-[#D0D6ED]/50 p-0.5 text-sm shadow-sm">
        {[1, 2, 4].map(n => {
          // 실제 사진 수에 따라 선택 가능 여부 결정
          const isAvailable = availablePhotos >= n
          const isDisabled = !isAvailable
          
          return (
            <label 
              key={n} 
              className={`flex-1 text-center ${
                isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="cutCount"
                checked={cutCount === n}
                onChange={() => isAvailable && onChange(n)}
                disabled={isDisabled}
                className="hidden"
              />
              <span
                className={`relative flex items-center justify-center rounded-md py-2 transition-all duration-150 ease-in-out ${
                  cutCount === n
                    ? 'bg-white font-semibold text-slate-700 shadow-md'
                    : isDisabled
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                {n}컷
                {isDisabled && (
                  <span className="ml-1 text-xs text-red-400">✗</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {availablePhotos < 4 && availablePhotos > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          촬영된 사진: {availablePhotos}장 ({availablePhotos >= 4 ? '모든 컷' : availablePhotos >= 2 ? '1-2컷' : '1컷만'} 선택 가능)
        </p>
      )}
    </div>
  )
}
