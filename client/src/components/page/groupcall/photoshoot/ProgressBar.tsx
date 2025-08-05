import React from 'react'

interface ProgressBarProps {
  currentStep: number    // 0~n-1 (현 단계 인덱스)
  labels: string[]       // 단계별 라벨
  className?: string     // width 제어 등 외부 스타일링
}

export default function ProgressBar({ currentStep, labels, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full flex justify-center ${className}`}>
      <ol className="flex w-full max-w-lg items-center justify-between relative">
        {labels.map((label, idx) => (
          <li key={label} className="flex flex-col items-center z-10 min-w-[48px]">
            {/* 진행: 체크, 현단계: 굵은 빈원, 나머지: 얇은 빈원 */}
            <div
              className={`
                flex items-center justify-center
                rounded-full 
                ${idx < currentStep
                  ? 'bg-blue-700'
                  : idx === currentStep
                  ? 'border-2 border-blue-700 bg-white'
                  : 'border border-gray-300 bg-white'
                }
                w-6 h-6
                transition-all duration-200
              `}
            >
              {idx < currentStep ? (
                // 체크아이콘
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path
                    d="M4 7l2 2 4-4"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : idx === currentStep ? (
                <span className="block w-2 h-2 bg-blue-700 rounded-full"></span>
              ) : null}
            </div>
            <span
              className={`mt-1 text-xs whitespace-nowrap ${
                idx === currentStep
                  ? 'text-blue-700 font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </li>
        ))}

        {/* 선 그리기: 파란색(완료/진행), 회색(이후 단계) */}
        <svg
          className="absolute left-0 right-0 top-[12px] w-full h-[2px] z-0 pointer-events-none"
          viewBox={`0 0 100 2`}
          preserveAspectRatio="none"
        >
          {labels.slice(0, -1).map((_, idx) => {
            const isPastOrCurrent = idx < currentStep
            const x1 = (idx) * (100 / (labels.length - 1))
            const x2 = (idx + 1) * (100 / (labels.length - 1))
            return (
              <line
                key={idx}
                x1={x1}
                x2={x2}
                y1={1}
                y2={1}
                stroke={isPastOrCurrent ? "#1d4ed8" : "#e5e7eb"}
                strokeWidth={isPastOrCurrent ? 2 : 1.5}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
      </ol>
    </div>
  )
}