'use client'

import Sidebar from '../Sidebar'
import VideoTile from '../VideoTile'
import { cn } from '@/lib/utils'

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

interface WaitingComponentProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onStartCall?: () => void
  onLeaveRoom?: () => void
  className?: string
}

export default function WaitingComponent({
  participants = [],
  currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
  },
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onStartCall = () => {},
  onLeaveRoom = () => {},
  className,
}: WaitingComponentProps) {
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

  const displayParticipants =
    participants.length > 0 ? participants : mockParticipants

  return (
    <div className={cn('flex flex-1 gap-6 bg-gray-100 px-8 py-6', className)}>
      {/* 왼쪽: 비디오 영역 */}
      <div className="flex flex-1 flex-col">
        <div className="grid flex-1 grid-cols-2 gap-6">
          {displayParticipants.map(participant => (
            <VideoTile key={participant.id} participant={participant} />
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
  )
}
