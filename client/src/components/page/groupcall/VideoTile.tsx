'use client'

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

interface VideoTileProps {
  participant: Participant
  className?: string
  aspect?: boolean
}

export default function VideoTile({
  participant,
  className,
  aspect = true,
}: VideoTileProps) {
  return (
    <div
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-lg transition-all duration-300 hover:scale-[1.02] md:rounded-3xl',
        aspect && 'aspect-video',
        participant.isHost && 'shadow-xl ring-2 ring-blue-200/60',
        className
      )}
    >
      {participant.isCameraOn ? (
        // 카메라 켜진 상태
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gray-50">
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:scale-110 sm:mb-3 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl">
              {(participant.name || participant.email)[0].toUpperCase()}
            </div>
            <div className="text-2xl opacity-30 sm:text-3xl md:text-4xl">
              <br />
            </div>
          </div>
        </div>
      ) : (
        // 카메라 꺼진 상태
        <div className="flex h-full w-full items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-lg font-semibold text-white shadow-md sm:mb-3 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl">
              {(participant.name || participant.email)[0].toUpperCase()}
            </div>
            <svg
              className="mx-auto h-5 w-5 text-gray-400 sm:h-6 sm:w-6 md:h-8 md:w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
        </div>
      )}

      {/* 참가자 이름 및 상태  */}
      <div className="absolute right-0 bottom-0 left-0 border-t border-gray-200/60 bg-white/95 p-2 sm:p-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
            <span className="truncate text-sm font-medium text-gray-800 sm:text-base">
              {participant.name || participant.email}
            </span>
            {participant.isHost && (
              <div className="flex shrink-0 items-center space-x-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[#2D3243]">
                <svg
                  className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="hidden sm:inline">Host</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 space-x-1 sm:space-x-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 md:h-8 md:w-8',
                participant.isMicOn ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              <svg
                className="h-3 w-3 text-white sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {participant.isMicOn ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                ) : (
                  <>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 말하는 중 효과 */}
      {participant.isMicOn && (
        <div className="absolute inset-0 animate-pulse rounded-2xl border-2 border-[#c4c8da] md:rounded-3xl" />
      )}
    </div>
  )
}
