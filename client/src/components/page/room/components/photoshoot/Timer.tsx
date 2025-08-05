'use client'

import { useEffect, useRef } from 'react'

interface TimerProps {
  isActive: boolean
  seconds: number   // 남은 초
  className?: string
}

export default function Timer({ 
  isActive, 
  seconds, 
  className = '' 
}: TimerProps) {
  const prevSeconds = useRef(seconds)
  
  useEffect(() => {
    prevSeconds.current = seconds
  }, [seconds])

  // 타이머가 활성화x
  if (!isActive) return null

  const isUrgent = seconds <= 3 && seconds > 0
  const isComplete = seconds === 0
  
  // 원의 둘레 
  const radius = 59
  const circumference = 2 * Math.PI * radius 
  
  // 진행률 계산 (10초 기준)
  const progress = seconds > 0 ? (10 - seconds) / 10 : 1
  const strokeDashoffset = circumference - (circumference * progress)

  return (
    <div className={`absolute top-6 right-6 z-30 ${className}`}>
      <div className="relative flex flex-col items-center">
        {/* 메인 타이머 SVG */}
        <div 
          className={`
            relative transition-all duration-300 ease-out
            ${isComplete ? 'scale-125' : isUrgent ? 'scale-110 animate-pulse' : 'scale-100'}
          `}
          style={{ width: '120px', height: '120px' }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="120" 
            height="120" 
            viewBox="0 0 124 124"
            className="block w-full h-full drop-shadow-2xl"
          >
            {/* 배경 원 */}
            <circle 
              cx="62" 
              cy="62" 
              r="59" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.4)" 
              strokeWidth="6px"
            />
            
            {/* 진행률 원 */}
            <circle 
              cx="62" 
              cy="62" 
              r="59" 
              fill="none" 
              stroke={isComplete ? "#10B981" : isUrgent ? "#EF4444" : "#3B82F6"}
              strokeWidth="6px" 
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                strokeDasharray: circumference,
                strokeDashoffset: isComplete ? 0 : strokeDashoffset,
                transition: 'stroke-dashoffset 1s ease-linear, stroke 0.3s ease'
              }}
            />
            
            {/* 완료 시 체크마크 */}
            {isComplete && (
              <polyline 
                points="73.56 48.63 57.88 72.69 49.38 62" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="6px" 
                strokeLinecap="round"
                style={{
                  strokeDasharray: 45,
                  strokeDashoffset: 45,
                  animation: 'checkmark 0.5s ease-in-out 0.2s forwards'
                }}
              />
            )}
          </svg>

          {/* 중앙 숫자 표시 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={`
                font-extrabold text-white transition-all duration-300 drop-shadow-lg
                ${isComplete 
                  ? 'text-2xl text-green-400' 
                  : isUrgent 
                    ? 'text-4xl text-red-400 scale-110' 
                    : 'text-3xl text-blue-400'
                }
              `}
            >
              {isComplete ? (
                <div className="text-center">
                  <div className="text-3xl mb-1"></div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl font-black">{seconds}</div>
                </div>
              )}
            </div>
          </div>

          {/* 긴급 상태 펄스 효과 */}
          {isUrgent && !isComplete && (
            <div className="absolute inset-2 rounded-full border-2 border-red-400 animate-ping opacity-75"></div>
          )}
        </div>

        {/* 안내 텍스트*/}
        <div className="mt-2 text-center bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
          <div 
            className={`
              font-bold transition-all duration-300 text-white text-sm
              ${isComplete 
                ? 'text-green-400' 
                : isUrgent 
                  ? 'text-red-400 animate-bounce' 
                  : ''
              }
            `}
          >
            {isComplete ? '촬영 완료!' : isUrgent ? '준비하세요!' : '촬영 준비 중...'}
          </div>
          
          {!isComplete && !isUrgent && (
            <div className="text-gray-300 text-xs mt-1">
              포즈를 취해주세요
            </div>
          )}
        </div>

        {/* 완료시만 화면 중앙에 큰 메시지 표시
        {isComplete && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-center animate-bounce">
              <div className="text-6xl mb-2">📸</div>
              <div className="text-2xl font-bold">촬영 완료!</div>
            </div>
          </div>
        )} */}
      </div>

      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes checkmark {
          0% {
            stroke-dashoffset: 45;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}