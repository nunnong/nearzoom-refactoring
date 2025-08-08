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
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onLeaveRoom = () => {},
  showLeaveButton = true,
}: ControlPanelProps) {
  const buttonBaseClasses =
    'flex items-center justify-center rounded-full transition-all duration-200 shadow-lg hover:scale-105 backdrop-blur-sm h-11 w-11'

  return (
    <div className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex justify-center gap-4">
        {/* 마이크 버튼 */}
        <button
          onClick={onMicToggle}
          className={cn(
            buttonBaseClasses,
            currentUser.isMicOn
              ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 shadow-purple-200/30 hover:shadow-purple-300/40 hover:from-purple-100 hover:to-purple-200'
              : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/40 hover:from-red-400 hover:to-red-500'
          )}
          title={currentUser.isMicOn ? '마이크 끄기' : '마이크 켜기'}
        >
          <svg
            className="h-6 w-6 stroke-current"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.3}
            viewBox="0 0 24 24"
          >
            {currentUser.isMicOn ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            ) : (
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
            currentUser.isCameraOn
              ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 shadow-purple-300/30 hover:shadow-purple-300/40 hover:from-purple-100 hover:to-purple-200'
              : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/40 hover:from-red-400 hover:to-red-500'
          )}
          title={currentUser.isCameraOn ? '카메라 끄기' : '카메라 켜기'}
        >
          <svg
            className="h-6 w-6 stroke-current"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.3}
            viewBox="0 0 24 24"
          >
            {currentUser.isCameraOn ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            ) : (
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
              'bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow-gray-600/30 hover:shadow-gray-600/40 hover:from-gray-500 hover:to-gray-600'
            )}
            title="통화 종료"
          >
            <svg
              className="h-6 w-6 stroke-current"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.3}
              viewBox="0 0 24 24"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}