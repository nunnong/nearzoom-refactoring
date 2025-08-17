'use client'

import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import PhotoShootButton from './PhotoShootButton'

interface PhotoShootParticipantListProps {}

export default function PhotoShootParticipantList({}: PhotoShootParticipantListProps) {
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
        }),
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

  const handleCopyUrl = async () => {
    try {
      const currentUrl = window.location.href
      await navigator.clipboard.writeText(currentUrl)
      alert('URL이 복사되었습니다!')
    } catch (err) {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다.')
    }
  }

  return (
    <div className="flex-1 rounded-2xl border border-white/30 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
      {/* 친구 초대 섹션 - 알약 스타일 */}
      <div className="mb-3">
        <button
          onClick={handleCopyUrl}
          className="group mx-auto flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white/90 px-7 py-2 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
              />
            </svg>
            <span className="text-sm text-[#2D3243] group-hover:text-gray-800">
              친구를 초대해주세요!
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-[#2D3243] px-3 py-1.5 text-white transition-all group-hover:bg-[#1a1f2e]">
            <svg
              className="h-3.5 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-semibold">복사</span>
          </div>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-rg font-extrabold tracking-tight text-gray-900">
          Participants ({participants.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">실시간</span>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {participants.length === 0 ? (
          // 참가자가 없을 때 표시
          <div className="py-8 text-center">
            <div className="mb-2 text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500">아직 참가자가 없습니다</p>
            <p className="mt-1 text-xs text-gray-400">친구들을 초대해보세요!</p>
          </div>
        ) : (
          participants.map(participant => {
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

            const isCurrentUser =
              participant.identity === localParticipant?.identity

            return (
              <div
                key={participant.identity}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-3 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/60"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 font-semibold text-white transition-transform hover:scale-110">
                  {/* {participantName[0].toUpperCase()} */}
                  {participant.connectionQuality !== 'unknown' && (
                    <div className="absolute -right-1 -bottom-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-800">
                      {participantName}
                      {isCurrentUser && ' (나)'}
                    </span>
                    {isCurrentParticipantLeader && (
                      <div className="flex items-center space-x-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
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
                    {/* 새로 들어온 참가자 표시 */}
                    {!isCurrentUser && (
                      <div className="flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                        <span>Online</span>
                      </div>
                    )}
                  </div>
                  {participant.identity && (
                    <p className="truncate text-xs text-gray-600">
                      {participant.identity}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* 마이크/카메라 상태 아이콘 */}
                  {participant.isMicrophoneEnabled ? (
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
                  {participant.isCameraEnabled ? (
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

                  {/* 방장이 다른 사용자에게 권한을 넘겨줄 수 있는 버튼 */}
                  {isRoomLeader &&
                    !isCurrentUser &&
                    !isCurrentParticipantLeader && (
                      <button
                        onClick={() =>
                          handleTransferLeadership(participant.identity)
                        }
                        className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200"
                      >
                        방장 이양
                      </button>
                    )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PhotoShoot 촬영 버튼 */}
      <div className="mt-6">
        <PhotoShootButton className="w-full" />
      </div>
    </div>
  )
}
