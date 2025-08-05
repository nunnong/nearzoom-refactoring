'use client'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'
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
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onStartCall = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
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

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-[#C9D76D] text-[#2D3243]',
        className
      )}
    >
      {/* Header */}
      <Header 
        roomInfo={roomInfo}
        onLeaveRoom={onLeaveRoom}
        onCopyRoomUrl={onCopyRoomUrl}
      />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-1 gap-6 bg-gray-100 px-8 py-6">
        {/* 왼쪽: 비디오 영역 */}
        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-2 gap-6">
            {displayParticipants.map((participant) => (
              <VideoTile 
                key={participant.id}
                participant={participant}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽: 사이드바 */}
        <Sidebar
          participants={displayParticipants}
          currentUser={currentUser}
          showStartButton={true}
          showLeaveButton={true}
          onMicToggle={onMicToggle}
          onCameraToggle={onCameraToggle}
          onStartCall={onStartCall}
          onLeaveRoom={onLeaveRoom}
        />
      </div>
    </div>
  )
}