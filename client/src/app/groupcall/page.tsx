'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

//타입 정의
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
}

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

interface WaitingPageProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  roomInfo?: RoomInfo
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onStartCall?: () => void
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
  className?: string
}

export default function WaitingPage({
  // Props 기본값 설정
  participants = [],
  currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
  },
  roomInfo = {
    id: 'a605',
    url: 'ssafynearzoom.store/a605',
    title: 'SSAFY 13기 A605팀 회의',
    createdAt: 'July 24th, 2024 14:39 PM',
  },
  onMicToggle = () => console.log('🎤 Mic toggled'),
  onCameraToggle = () => console.log('📹 Camera toggled'),
  onStartCall = () => console.log('📞 Call started'),
  onLeaveRoom = () => console.log('🚪 Left room'),
  onCopyRoomUrl = () => console.log('📋 URL copied'),
  className,
}: WaitingPageProps) {
  //더미데이터
  const mockParticipants: Participant[] = [
    {
      id: '1',
      name: '김싸피',
      email: 'ssafy123.5@gmail.com',
      isHost: true,
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    },
    {
      id: '2',
      name: '박싸피',
      email: 'park.4@gmail.com',
      isHost: false,
      isMicOn: false,
      isCameraOn: true,
      isConnected: true,
    },
    {
      id: '3',
      name: '이싸피',
      email: 'lee.3@kakao.com',
      isHost: false,
      isMicOn: true,
      isCameraOn: false,
      isConnected: true,
    },
    {
      id: '4',
      name: '최싸피',
      email: 'choi.2@kakao.com',
      isHost: false,
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    },
  ]

  // Props가 비어있으면 더미 데이터 사용
  const displayParticipants =
    participants.length > 0 ? participants : mockParticipants

  // 공통 스타일 변수들
  const buttonBaseClasses =
    'flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110'
  const cardBaseClasses =
    'rounded-2xl border border-[#2D3243]/10 bg-white shadow-lg'

  // 비디오 타일 렌더링 함수
  const renderVideoTile = (participant: Participant, index: number) => (
    <div
      key={participant.id}
      className={cn(
        'group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02]',
        'aspect-video', // ← Tailwind의 aspect-ratio 사용
        participant.isHost &&
          'shadow-xl ring-2 shadow-[#C9D76D]/20 ring-[#C9D76D]'
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

  // url 복사
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://${roomInfo.url}`)
      alert('URL이 복사되었습니다!')
    } catch (err) {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다.')
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-[#C9D76D] text-[#2D3243]',
        className
      )}
    >
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#2D3243]/80 bg-[#2D3243] px-8 py-4">
        <div className="flex w-full items-center justify-between">
          {/* 왼쪽: 로고 & 방 정보 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 transition-transform duration-200 hover:scale-105">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9D76D]">
                <svg
                  className="h-5 w-5 text-[#2D3243]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 12h8l-4-4-4 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">[Near-zoom]</h1>
                <p className="text-sm text-[#C9D76D]">{roomInfo.createdAt}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-white/40"></div>

            {/* Room URL */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-white">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                  />
                </svg>
                <span className="text-sm">친구들을 초대하세요!</span>
              </div>

              <button
                onClick={handleCopyUrl} // ← 간단한 복사 함수 사용
                className="group flex items-center gap-2 rounded-full border border-[#C9D76D]/30 bg-[#C9D76D]/20 px-4 py-2 transition-all hover:scale-105 hover:bg-[#C9D76D]/30"
              >
                <span className="font-mono text-sm text-[#C9D76D]">
                  {roomInfo.url}
                </span>
                <div className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4 text-[#C9D76D] group-hover:text-white"
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
                  <span className="text-xs text-[#C9D76D]">복사</span>
                </div>
              </button>
            </div>
          </div>

          {/* 오른쪽: 설정 버튼 */}
          <div className="flex items-center gap-4">
            <button
              onClick={onLeaveRoom}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:scale-110 hover:bg-white/10"
            >
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-1 gap-6 bg-gray-100 px-8 py-6">
        {/* 왼쪽: 비디오 영역 */}
        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-2 gap-6">
            {displayParticipants.map((participant, index) =>
              renderVideoTile(participant, index)
            )}
          </div>
        </div>

        {/* 오른쪽: 사이드바 */}
        <div className={cn('flex flex-col gap-6', 'w-80')}>
          {/* 참가자 목록 */}
          <div className={cn(cardBaseClasses, 'flex-1 p-6')}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2D3243]">참가자들</h3>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 animate-pulse rounded-full bg-[#F7DEFD]" />
                <span className="text-sm text-[#2D3243]/70">
                  {displayParticipants.length}명
                </span>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              {displayParticipants.map(participant => (
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
            <button
              onClick={onStartCall}
              className="w-full rounded-2xl bg-[#D86F4A] py-5 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#C9D76D]"
            >
              <span className="flex items-center justify-center gap-2">
                <span>START</span>
                <span>▶</span>
              </span>
            </button>
          </div>

          {/* 컨트롤 버튼들 */}
          <div className={cn(cardBaseClasses, 'p-4')}>
            <div className="flex justify-center gap-3">
              {/* 마이크 버튼 */}
              <button
                onClick={onMicToggle}
                className={cn(
                  buttonBaseClasses,
                  'h-12 w-12',
                  currentUser.isMicOn
                    ? 'bg-[#D0D6ED] hover:bg-[#D0D6ED]/80'
                    : 'bg-[#D86F4A] shadow-lg hover:bg-[#D86F4A]/80'
                )}
                title={currentUser.isMicOn ? '마이크 끄기' : '마이크 켜기'}
              >
                <svg
                  className={cn(
                    'h-5 w-5',
                    currentUser.isMicOn ? 'text-[#2D3243]' : 'text-white'
                  )}
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
                    ? 'bg-[#D0D6ED] hover:bg-[#D0D6ED]/80'
                    : 'bg-[#D86F4A] shadow-lg hover:bg-[#D86F4A]/80'
                )}
                title={currentUser.isCameraOn ? '카메라 끄기' : '카메라 켜기'}
              >
                <svg
                  className={cn(
                    'h-5 w-5',
                    currentUser.isCameraOn ? 'text-[#2D3243]' : 'text-white'
                  )}
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
              <button
                onClick={onLeaveRoom}
                className={cn(
                  buttonBaseClasses,
                  'h-12 w-12 bg-[#D86F4A] shadow-lg hover:bg-[#D86F4A]/80'
                )}
              >
                <svg
                  className="h-5 w-5 text-white"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
