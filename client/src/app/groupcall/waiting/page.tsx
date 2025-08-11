'use client'

import { useState, useCallback, useMemo } from 'react'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'

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

export default function WaitingPage() {
  // 예시 데이터 - 실제로는 props나 상태관리를 통해 받아올 데이터
  const [roomInfo] = useState<RoomInfo>({
    id: 'room-123',
    url: 'meet.example.com/room-123',
    createdAt: 'July 24th, 2024 14:39 PM',
  })

  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: 'user-1',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
  })

  const [participants] = useState<Participant[]>([
    {
      id: 'user-1',
      email: 'ssafy123.5@gmail.com',
      name: '김싸피',
      isHost: true,
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    },
    {
      id: 'user-2',
      email: 'park.4@gmail.com',
      name: '박싸피',
      isHost: false,
      isMicOn: false,
      isCameraOn: true,
      isConnected: true,
    },
    {
      id: 'user-3',
      email: 'lee.3@kakao.com',
      name: '이싸피',
      isHost: false,
      isMicOn: true,
      isCameraOn: false,
      isConnected: true,
    },
    {
      id: 'user-4',
      email: 'choi.2@kakao.com',
      name: '최싸피',
      isHost: false,
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    },
  ])

  // 반응형 그리드 컬럼 수 계산
  const gridCols = useMemo(() => {
    const count = participants.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }, [participants.length])

  // 핸들러 함수들 - useCallback으로 최적화
  const handleLeaveRoom = useCallback(() => {
    console.log('방 나가기')
    // 실제 구현: 방 나가는 로직
  }, [])

  const handleCopyRoomUrl = useCallback(() => {
    console.log('URL 복사됨')
    // 실제 구현: URL 복사 완료 처리
  }, [])

  const handleMicToggle = useCallback(() => {
    setCurrentUser(prev => ({
      ...prev,
      isMicOn: !prev.isMicOn,
    }))
  }, [])

  const handleCameraToggle = useCallback(() => {
    setCurrentUser(prev => ({
      ...prev,
      isCameraOn: !prev.isCameraOn,
    }))
  }, [])

  const handleStartCall = useCallback(() => {
    console.log('통화 시작')
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 헤더 */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 비디오 영역 */}
        <section className="min-w-0 flex-1">
          <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${gridCols}`}>
            {participants.map(participant => (
              <VideoTile
                key={participant.id}
                participant={participant}
                className="min-h-[180px] sm:min-h-[200px] lg:min-h-[240px]"
              />
            ))}
          </div>
        </section>

        {/* 사이드바 */}
        <aside className="w-full shrink-0 md:w-[300px]">
          <Sidebar
            participants={participants}
            currentUser={currentUser}
            roomUrl={roomInfo.url}
            showStartButton={true}
            showLeaveButton={true}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onStartCall={handleStartCall}
            onLeaveRoom={handleLeaveRoom}
            onCopyRoomUrl={handleCopyRoomUrl}
          />
        </aside>
      </main>
    </div>
  )
}
