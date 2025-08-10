
'use client'

import { useState, useCallback, useMemo } from 'react'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'
import { JoinRoomData, CreateRoomData } from '@/lib/api/room'

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
  roomData?: JoinRoomData | CreateRoomData // API에서 받은 실제 데이터
  isHost?: boolean // 방장 여부
  onStartCall?: () => void // 방 생성 함수 (방장만 사용)
}

export default function WaitingPage({ 
  roomData, 
  isHost = true, // 기본값: 방장 (기존 동작 유지)
  onStartCall 
}: WaitingPageProps) {
  
  // roomData가 있으면 실제 데이터로, 없으면 기존 Mock 데이터 사용
  const [roomInfo] = useState<RoomInfo>(() => {
    if (roomData) {
      return {
        id: roomData.roomId.toString(),
        url: `${typeof window !== 'undefined' ? window.location.origin : 'https://www.nearzoom.store'}/room/${roomData.roomId}`,
        createdAt: roomData.createdAt || (roomData as JoinRoomData).createdAt || '',
      }
    }
    // 기존 Mock 데이터 (WebRTC 팀원 작업용)
    return {
      id: 'room-123',
      url: 'meet.example.com/room-123',
      createdAt: 'July 24th, 2024 14:39 PM',
    }
  })

  // 현재 사용자 정보 (나중에 로그인 정보와 연동)
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    if (roomData) {
      // 실제 API 데이터에서 추출
      return {
        id: 'current-user',
        email: 'current@user.com', // TODO: 실제 로그인 사용자 정보로 변경
        name: roomData.participantName,
        isMicOn: true,
        isCameraOn: true,
      }
    }
    // 기존 Mock 데이터
    return {
      id: 'user-1',
      email: 'ssafy123.5@gmail.com',
      name: '김싸피',
      isMicOn: true,
      isCameraOn: true,
    }
  })

  // 참가자 목록 (현재는 Mock, 나중에 LiveKit에서 실제 데이터 가져와야 함)
  const [participants] = useState<Participant[]>(() => {
    if (roomData) {
      // 실제 API 데이터 기반 참가자 (현재 사용자만)
      return [
        {
          id: 'current-user',
          email: 'current@user.com',
          name: roomData.participantName,
          isHost: isHost,
          isMicOn: true,
          isCameraOn: true,
          isConnected: true,
        }
      ]
    }
    
    // 기존 Mock 데이터 (WebRTC 팀원 개발용)
    return [
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
    ]
  })

  // 반응형 그리드 컬럼 수 계산
  const gridCols = useMemo(() => {
    const count = participants.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }, [participants.length])

  // 핸들러 함수들
  const handleLeaveRoom = useCallback(() => {
    console.log('방 나가기')
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [])

  const handleCopyRoomUrl = useCallback(() => {
    if (roomInfo.url && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(roomInfo.url)
      console.log('URL 복사됨:', roomInfo.url)
      alert('방 URL이 복사되었습니다!')
    }
  }, [roomInfo.url])

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

  // 방장이 Start 버튼을 눌렀을 때 (방 생성)
  const handleStartCall = useCallback(() => {
    console.log('통화 시작')
    
    if (isHost && onStartCall) {
      // 부모 컴포넌트에서 전달받은 방 생성 함수 호출
      onStartCall()
    } else {
      // 참가자는 방장이 시작할 때까지 대기
      console.log('방장이 시작할 때까지 대기 중...')
    }
  }, [isHost, onStartCall])

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
            showStartButton={isHost} // 방장만 Start 버튼 표시
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