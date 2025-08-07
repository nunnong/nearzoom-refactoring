'use client'

import { cn } from '@/lib/utils'

interface CurrentUser {
  id: string
  email: string
  name?: string
  avatar?: string
  isMicOn: boolean
  isCameraOn: boolean
}

interface ControlPanelProps {
  currentUser: CurrentUser
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onLeaveRoom?: () => void
  showLeaveButton?: boolean
}

export default function ControlPanel({
  currentUser,
  onMicToggle = () => console.log('🎤 Mic toggled'),
  onCameraToggle = () => console.log('📹 Camera toggled'),
  onLeaveRoom = () => console.log('🚪 Left room'),
  showLeaveButton = true
}: ControlPanelProps) {
  const buttonBaseClasses =
    'flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-110 shadow-md'

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-white/30 shadow-lg p-4">
      <div className="flex justify-center gap-3">
        {/* 마이크 버튼 */}
        <button
          onClick={onMicToggle}
          className={cn(
            buttonBaseClasses,
            'h-12 w-12',
            currentUser.isMicOn
              ? 'bg-white/60 hover:bg-white/80 text-gray-700'
              : 'bg-red-500 hover:bg-red-600 text-white'
          )}
          title={currentUser.isMicOn ? '마이크 끄기' : '마이크 켜기'}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {currentUser.isMicOn ? (
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
        </button>

        {/* 카메라 버튼 */}
        <button
          onClick={onCameraToggle}
          className={cn(
            buttonBaseClasses,
            'h-12 w-12',
            currentUser.isCameraOn
              ? 'bg-white/60 hover:bg-white/80 text-gray-700'
              : 'bg-red-500 hover:bg-red-600 text-white'
          )}
          title={currentUser.isCameraOn ? '카메라 끄기' : '카메라 켜기'}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {currentUser.isCameraOn ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            ) : (
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
        </button>

        {/* 종료 버튼 */}
        {showLeaveButton && (
          <button
            onClick={onLeaveRoom}
            className={cn(
              buttonBaseClasses,
              'h-12 w-12 bg-red-500 hover:bg-red-600 text-white'
            )}
            title="통화 종료"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18m-5.058-5.058A7 7 0 118.942 8.942m0 0L3 3"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}