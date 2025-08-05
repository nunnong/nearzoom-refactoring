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
}

export default function ParticipantList({ 
  participants, 
  showStartButton = true,
  onStartCall = () => console.log('📞 Call started')
}: ParticipantListProps) {
  return (
    <div className="rounded-2xl border border-[#2D3243]/10 bg-white shadow-lg flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#2D3243]">참가자들</h3>
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 animate-pulse rounded-full bg-[#F7DEFD]" />
          <span className="text-sm text-[#2D3243]/70">
            {participants.length}명
          </span>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#D0D6ED]/30 p-3 transition-all hover:translate-x-1 hover:scale-[1.02] hover:bg-[#D0D6ED]/50"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#2D3243] font-semibold text-white transition-transform hover:scale-110">
              {(participant.name || participant.email)[0].toUpperCase()}
              {participant.isConnected && (
                <div className="absolute -right-1 -bottom-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#C9D76D]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="truncate text-sm font-medium text-[#2D3243]">
                  {participant.name || participant.email}
                </span>
                {participant.isHost && (
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-[#C9D76D]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              {participant.email && (
                <p className="truncate text-xs text-[#2D3243]/70">
                  {participant.email}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!participant.isMicOn && (
                <svg
                  className="h-4 w-4 text-[#D86F4A]"
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
              {!participant.isCameraOn && (
                <svg
                  className="h-4 w-4 text-[#D86F4A]"
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
        <StartButton
          onClick={onStartCall}
          className="mt-6"
        />
      )}
    </div>
  )
}