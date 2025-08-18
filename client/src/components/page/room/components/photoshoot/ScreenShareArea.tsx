'use client'

import { useRef, useEffect } from 'react'

import Timer from '@/components/page/room/components/photoshoot/Timer'
import { cn } from '@/lib/utils'

interface ParticipantWebcam {
  id: string
  name: string
  stream?: MediaStream
  nukiUrl?: string
}

interface ScreenShareAreaProps {
  screenStream?: MediaStream
  participantWebcams?: ParticipantWebcam[]
  className?: string
  isTimerActive?: boolean
  timerSeconds?: number
}

export default function ScreenShareArea({
  screenStream,
  participantWebcams = [],
  className = '',
  isTimerActive = false,
  timerSeconds = 0,
}: ScreenShareAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // 화면 공유 스트림 설정
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream
    }
  }, [screenStream])

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-black shadow-lg',
        // 반응형 크기 조정 - 모든 브레이크포인트에서 정사각형 유지
        'mx-auto aspect-square max-w-sm', // 모바일: 정사각형, 작은 크기
        'sm:aspect-square sm:max-w-md', // 작은 태블릿: 정사각형, 중간 크기
        'md:aspect-square md:max-w-lg', // 태블릿: 정사각형, 큰 크기
        'lg:aspect-square lg:max-w-lg', // 데스크톱: 정사각형, 매우 큰 크기
        className
      )}
    >
      {/* 공유화면 */}
      {screenStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white">
          <div className="space-y-3 p-4 text-center sm:space-y-4 sm:p-6">
            {/* 아이콘 - 반응형 크기 */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
              <svg
                className="h-8 w-8 text-white sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* 텍스트 - 반응형 크기 */}
            <div>
              <h3 className="mb-2 text-lg font-semibold sm:text-xl lg:text-2xl">
                화면 공유 대기 중
              </h3>
              <p className="text-sm text-gray-300 sm:text-base lg:text-lg">
                {/* <span className="hidden sm:inline">
                  방장이 화면을 공유하면 촬영이 시작됩니다
                </span> */}
                <span className="sm:hidden">촬영 대기 중...</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 타이머 오버레이 - 반응형 위치 및 크기 */}
      {isTimerActive && (
        <div className="absolute top-2 right-2 z-30 sm:top-4 sm:right-4">
          <Timer
            isActive={isTimerActive}
            seconds={timerSeconds}
            className="scale-75 sm:scale-100" 
          />
        </div>
      )}

      {/* 촬영 준비 상태 표시 - 반응형 */}
      {screenStream && !isTimerActive && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white sm:gap-2 sm:px-3 sm:text-sm">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white sm:h-2 sm:w-2"></div>
            <span className="hidden sm:inline">촬영 준비 완료</span>
            <span className="sm:hidden">준비</span>
          </div>
        </div>
      )}

      {/* 참가자 웹캠 미리보기 - 데스크톱에서만 표시 */}
      {participantWebcams && participantWebcams.length > 0 && screenStream && (
        <div className="absolute bottom-2 left-2 hidden gap-2 lg:flex">
          {participantWebcams.slice(0, 4).map(participant => (
            <div
              key={participant.id}
              className="h-16 w-16 overflow-hidden rounded-lg border-2 border-white/20 bg-gray-800"
              title={participant.name}
            >
              {participant.stream ? (
                <video
                  ref={ref => {
                    if (ref && participant.stream) {
                      ref.srcObject = participant.stream
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800 text-xs text-white">
                  {participant.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          ))}
          {participantWebcams.length > 4 && (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-white/20 bg-gray-800 text-xs text-white">
              +{participantWebcams.length - 4}
            </div>
          )}
        </div>
      )}

      {/* 촬영 모드 표시 - 좌하단 */}
      <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-4">
        <div className="rounded-lg bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm sm:px-3 sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-500">●</span>
            <span className="hidden sm:inline">photobooth</span>
            <span className="sm:hidden">📸</span>
          </div>
        </div>
      </div>
    </div>
  )
}