'use client'

import StartButton from '@/components/page/groupcall/StartButton'

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

interface ParticipantListProps {
  participants: Participant[]
  showStartButton?: boolean
  onStartCall?: () => void
  startButtonText?: string
}

export default function ParticipantList({
  participants,
  showStartButton = true,
  onStartCall = () => {},
  startButtonText = 'START',
}: ParticipantListProps) {
  return (
    <div className="flex-1 rounded-3xl border border-white/30 bg-white/60 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">참가자들</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#C9D76D]" />
          <span className="text-sm text-gray-600">{participants.length}명</span>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-3 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/60"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 font-semibold text-white transition-transform hover:scale-110">
              {(participant.name || participant.email)[0].toUpperCase()}
              {participant.isConnected && (
                <div className="absolute -right-1 -bottom-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#C9D76D]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-800">
                  {participant.name || participant.email}
                </span>
                {participant.isHost && (
                  <div className="flex items-center space-x-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[#2D3243]">
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Host</span>
                  </div>
                )}
              </div>
              {participant.email && (
                <p className="truncate text-xs text-gray-600">
                  {participant.email}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {participant.isMicOn ? (
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
                </svg>
              )}
              {participant.isCameraOn ? (
                <svg
                  className="h-4 w-4 text-green-600"
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
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-red-500"
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* START 버튼 */}
      {showStartButton && (
        <StartButton onClick={onStartCall} className="mt-6">
          {startButtonText}
        </StartButton>
      )}
    </div>
  )
}
