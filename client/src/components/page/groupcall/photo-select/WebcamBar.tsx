'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

interface Participant {
  id: string
  email: string
  name?: string
  avatar?: string
  isHost: boolean
  isMicOn: boolean
  isCameraOn: boolean
  isConnected: boolean
}

interface CurrentUser {
  id: string
  email: string
  name?: string
  avatar?: string
  isMicOn: boolean
  isCameraOn: boolean
  isHost: boolean
}

interface WebcamBarProps {
  participants: Participant[]
  currentUser: CurrentUser
  position?: 'top' | 'bottom'
  className?: string
}

// 개별 웹캠 타일 컴포넌트
function MiniWebcamTile({ 
  participant, 
  isCurrentUser = false 
}: { 
  participant: Participant
  isCurrentUser?: boolean 
}) {
  return (
    <div className={cn(
      'relative flex-shrink-0 overflow-hidden rounded-lg bg-gray-800 border-2 transition-all duration-200',
      // 크기 - 모바일에서 작게, 데스크톱에서는 약간 크게
      'w-24 h-18 sm:w-28 sm:h-20 md:w-32 md:h-24',
      // 테두리 색상
      participant.isHost 
        ? 'border-yellow-400/60' 
        : isCurrentUser 
          ? 'border-blue-400/60' 
          : 'border-white/20',
      // 호버 효과
      'hover:scale-105 hover:border-white/40'
    )}>
      {/* 비디오 또는 아바타 */}
      {participant.isCameraOn ? (
        <div className="flex h-full w-full items-center justify-center bg-gray-700">
          {/* 실제로는 video 태그가 들어갈 자리 */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
            {(participant.name || participant.email)[0]?.toUpperCase()}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-800 text-white">
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 text-xs font-semibold sm:h-8 sm:w-8">
            {(participant.name || participant.email)[0]?.toUpperCase()}
          </div>
          <svg className="h-3 w-3 text-gray-400 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
      )}

      {/* 이름 라벨 - 호버 시에만 표시 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="truncate text-center">
          {participant.name || participant.email.split('@')[0]}
        </div>
      </div>

      {/* 마이크 상태 표시 */}
      <div className={cn(
        'absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full',
        participant.isMicOn ? 'bg-green-500' : 'bg-red-500'
      )}>
        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {participant.isMicOn ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </>
          )}
        </svg>
      </div>

      {/* 호스트 표시 */}
      {participant.isHost && (
        <div className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500">
          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      )}

      {/* 말하는 중 효과 */}
      {participant.isMicOn && (
        <div className="absolute inset-0 animate-pulse rounded-lg border-2 border-green-400/50" />
      )}
    </div>
  )
}

export default function ZoomStyleWebcamBar({ 
  participants, 
  currentUser, 
  position = 'bottom',
  className 
}: WebcamBarProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  // 현재 사용자를 포함한 전체 참가자 목록
  const allParticipants = [
    { ...currentUser, isConnected: true } as Participant,
    ...participants.filter(p => p.id !== currentUser.id)
  ]

  return (
    <div className={cn(
      'fixed left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-gray-700 transition-all duration-300',
      position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t',
      isMinimized ? 'h-16' : 'h-28 sm:h-28',
      className
    )}>
      <div className="flex h-full items-center justify-between overflow-hidden px-2 sm:px-4">
        
        {/* 최소화 상태일 때 */}
        {isMinimized ? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm">
                {allParticipants.length}명 참여 중
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(false)}
              className="rounded bg-white/20 p-1 text-white hover:bg-white/30 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        ) : (
          /* 전체 표시 상태 */
          <>
            {/* 웹캠 타일들 - 가로 스크롤 */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-4 px-2 py-2 sm:gap-3 sm:px-3">
                {allParticipants.map((participant) => (
                  <div key={participant.id} className="group">
                    <MiniWebcamTile 
                      participant={participant}
                      isCurrentUser={participant.id === currentUser.id}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽 컨트롤 */}
            <div className="flex items-center gap-2 px-2">
              {/* 참가자 수 표시 */}
              <div className="hidden text-sm text-white sm:block">
                {allParticipants.length}명
              </div>
              
              {/* 최소화 버튼 */}
              <button
                onClick={() => setIsMinimized(true)}
                className="rounded bg-white/20 p-1 text-white hover:bg-white/30 transition-colors"
                title="웹캠 바 최소화"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}