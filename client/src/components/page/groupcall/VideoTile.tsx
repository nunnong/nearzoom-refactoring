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
}

export default function VideoTile({ participant, className, aspect = true }: VideoTileProps & { aspect?: boolean }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02]',
        aspect && 'aspect-video',
        participant.isHost &&
          'shadow-xl ring-2 shadow-[#C9D76D]/20 ring-[#C9D76D]',
        className
      )}
    >
      {participant.isCameraOn ? (
        // 카메라 켜진 상태
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#D0D6ED]">
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D3243] text-xl font-semibold text-white transition-transform duration-200 hover:scale-110">
              {(participant.name || participant.email)[0].toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        // 카메라 꺼진 상태
        <div className="flex h-full w-full items-center justify-center bg-[#D0D6ED]">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D3243] text-xl font-semibold text-white">
              {(participant.name || participant.email)[0].toUpperCase()}
            </div>
            <svg
              className="mx-auto h-5 w-5 text-[#2D3243]"
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

      {/* 참가자 이름 및 상태 */}
      <div className="absolute right-0 bottom-0 left-0 border-t border-[#2D3243]/10 bg-white/90 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-[#2D3243]">
              {participant.name || participant.email}
            </span>
            {participant.isHost && (
              <div className="flex items-center space-x-1 rounded-full bg-[#C9D76D]/20 px-2 py-1 text-xs text-[#C9D76D]">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Host</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                participant.isMicOn ? 'bg-[#C9D76D]' : 'bg-[#D86F4A]'
              )}
            >
              <svg
                className={cn(
                  'h-4 w-4',
                  participant.isMicOn ? 'text-[#2D3243]' : 'text-white'
                )}
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
        <div className="absolute inset-0 animate-pulse rounded-2xl border-2 border-[#C9D76D]" />
      )}
    </div>
  )
}