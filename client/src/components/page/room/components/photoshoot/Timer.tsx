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

  // 타이머가 활성화되지 않았으면 표시하지 않음
  if (!isActive) return null

  const isUrgent = seconds <= 3 && seconds > 0
  const isComplete = seconds === 0
  
  // 원의 둘레 (크기 줄임)
  const radius = 42
  const circumference = 2 * Math.PI * radius 
  
  // 진행률 계산 (5초 기준) - Room에 맞게 수정
  const progress = seconds > 0 ? (5 - seconds) / 5 : 1
  const strokeDashoffset = circumference - (circumference * progress)

  return (
    <div className={`absolute top-4 right-4 z-30 ${className}`}>
      <div className="relative flex flex-col items-center">
        {/* 메인 타이머 SVG */}
        <div 
          className={`
            relative transition-all duration-300 ease-out
            ${isComplete ? 'scale-110' : isUrgent ? 'scale-105 animate-pulse' : 'scale-100'}
          `}
          style={{ width: '90px', height: '90px' }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="90" 
            height="90" 
            viewBox="0 0 90 90"
            className="block w-full h-full drop-shadow-xl"
          >
            {/* 배경 원 */}
            <circle 
              cx="45" 
              cy="45" 
              r="42" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.2)" 
              strokeWidth="4px"
            />
            
            {/* 진행률 원 */}
            <circle 
              cx="45" 
              cy="45" 
              r="42" 
              fill="none" 
              stroke={
                isComplete 
                  ? "#00ff88" 
                  : isUrgent 
                    ? "#ff006f" 
                    : "#00d4ff"
              }
              strokeWidth="4px" 
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                strokeDasharray: circumference,
                strokeDashoffset: isComplete ? 0 : strokeDashoffset,
                transition: 'stroke-dashoffset 1s ease-linear, stroke 0.3s ease',
                filter: isComplete 
                  ? 'drop-shadow(0 0 8px #00ff88)' 
                  : isUrgent 
                    ? 'drop-shadow(0 0 8px #ff006f)' 
                    : 'drop-shadow(0 0 6px #00d4ff)'
              }}
            />
          </svg>

          {/* 중앙 숫자 표시 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={`
                font-black text-white transition-all duration-300 drop-shadow-lg
                ${isComplete 
                  ? 'text-lg' 
                  : isUrgent 
                    ? 'text-2xl scale-110' 
                    : 'text-xl'
                }
              `}
              style={{
                textShadow: isComplete 
                  ? '0 0 12px #00ff88' 
                  : isUrgent 
                    ? '0 0 12px #ff006f' 
                    : '0 0 8px #00d4ff'
              }}
            >
              {isComplete ? (
                <div className="text-center">
                  <div className="text-2xl">✨</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-black">{seconds}</div>
                </div>
              )}
            </div>
          </div>

          {/* 네온 글로우 효과 */}
          {isUrgent && !isComplete && (
            <div 
              className="absolute inset-1 rounded-full animate-ping opacity-60"
              style={{
                boxShadow: '0 0 20px #ff006f, inset 0 0 20px #ff006f'
              }}
            ></div>
          )}
        </div>

        {/* 세련된 안내 텍스트 */}
        <div className="mt-3 text-center">
          <div 
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300
              ${isComplete 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                : isUrgent 
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-400/30 animate-bounce' 
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
              }
            `}
            style={{
              backdropFilter: 'blur(12px)',
              boxShadow: isComplete 
                ? '0 0 20px rgba(16, 185, 129, 0.3)' 
                : isUrgent 
                  ? '0 0 20px rgba(255, 0, 111, 0.3)' 
                  : '0 0 20px rgba(0, 212, 255, 0.3)'
            }}
          >
            {/* 상태 아이콘 */}
            <div className={`w-2 h-2 rounded-full ${
              isComplete 
                ? 'bg-emerald-400 animate-pulse' 
                : isUrgent 
                  ? 'bg-pink-400 animate-pulse' 
                  : 'bg-cyan-400 animate-pulse'
            }`}></div>
            
            {/* 메시지 */}
            <span>
              {isComplete 
                ? 'SHOT!' 
                : isUrgent 
                  ? 'SMILE!' 
                  : 'READY'
              }
            </span>
          </div>
          
          
        </div>
      </div>

      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes checkmark {
          0% {
            stroke-dashoffset: 30;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}