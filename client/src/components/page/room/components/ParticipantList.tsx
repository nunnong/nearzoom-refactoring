'use client'

import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import StartButton from './StartButton'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'

interface ParticipantListProps {
  showStartButton?: boolean
  onStartCall?: () => void
}

export default function ParticipantList({
  showStartButton = true,
  onStartCall = () => console.log('📞 Call started'),
}: ParticipantListProps) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  const roomName = usePhotoBoothStore(state => state.roomName)

  // 방장 이양 API 호출
  const handleTransferLeadership = async (newLeaderIdentity: string) => {
    if (!isRoomLeader || !roomName || !localParticipant) return

    try {
      console.log('🔄 Transferring leadership to:', newLeaderIdentity)
      
      const response = await fetch('/api/transfer-leadership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          fromParticipant: localParticipant.identity,
          toParticipant: newLeaderIdentity,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to transfer leadership')
      }

      const result = await response.json()
      console.log('✅ Leadership transfer successful:', result.message)
      
      // LiveKit will automatically sync the metadata changes
    } catch (error) {
      console.error('❌ Leadership transfer failed:', error)
      // TODO: Show error message to user
    }
  }
  return (
    <div className="flex-1 rounded-2xl border border-[#2D3243]/10 bg-white p-6 shadow-lg">
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
        {participants.map(participant => {
          const participantName = participant.name || participant.identity
          
          // LiveKit metadata를 직접 파싱하여 방장 확인 (더 정확함)
          const isCurrentParticipantLeader = (() => {
            try {
              const metadata = JSON.parse(participant.metadata || '{}')
              return metadata.role === 'host'
            } catch {
              return false
            }
          })()
          
          const isCurrentUser = participant.identity === localParticipant?.identity

          return (
            <div
              key={participant.identity}
              className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                isCurrentParticipantLeader
                  ? 'border-2 border-yellow-200 bg-gradient-to-r from-yellow-100 to-yellow-50'
                  : 'cursor-pointer bg-[#D0D6ED]/30 hover:translate-x-1 hover:scale-[1.02] hover:bg-[#D0D6ED]/50'
              }`}
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#2D3243] font-semibold text-white transition-transform hover:scale-110">
                {/* {participantName[0].toUpperCase()} */}
                {participant.connectionQuality !== 'unknown' && (
                  <div className="absolute -right-1 -bottom-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#C9D76D]" />
                )}
                {/* 방장 표시 */}
                {isCurrentParticipantLeader && (
                  <div className="absolute -top-1 -right-1 text-yellow-500">
                    <span className="text-lg">👑</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`truncate text-sm font-medium ${
                      isCurrentParticipantLeader
                        ? 'text-yellow-700'
                        : 'text-[#2D3243]'
                    }`}
                  >
                    {participantName}
                    {isCurrentUser && ' (나)'}
                    {isCurrentParticipantLeader && ' (방장)'}
                  </span>
                </div>
                <p className="truncate text-xs text-[#2D3243]/70">
                  {participant.identity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* 방장이 다른 사용자에게 권한을 넘겨줄 수 있는 버튼 */}
                {isRoomLeader &&
                  !isCurrentUser &&
                  !isCurrentParticipantLeader && (
                    <button
                      onClick={() => handleTransferLeadership(participant.identity)}
                      className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      방장 이양
                    </button>
                  )}

                {/* 마이크/카메라 상태 아이콘 */}
                <div className="flex items-center gap-1">
                  {participant.isMicrophoneEnabled === false && (
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
                  {participant.isCameraEnabled === false && (
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
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* START 버튼 */}
      {showStartButton && (
        <StartButton className="mt-6" onStartCall={onStartCall} />
      )}
    </div>
  )
}
