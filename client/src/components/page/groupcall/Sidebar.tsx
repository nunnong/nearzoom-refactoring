'use client'

import { cn } from '@/lib/utils'

import ControlPanel from './ControlPanel'
import ParticipantList from './ParticipantList'

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

interface SidebarProps {
  participants: Participant[]
  currentUser: CurrentUser
  roomUrl?: string
  showStartButton?: boolean
  showLeaveButton?: boolean
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onStartCall?: () => void
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
  className?: string
}

export default function Sidebar({
  participants,
  currentUser,
  roomUrl,
  showStartButton = true,
  showLeaveButton = true,
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onStartCall = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  className,
}: SidebarProps) {
  return (
    <div className={cn('flex w-full flex-col gap-4 md:w-80', className)}>
      {/* 참가자 목록 */}
      <ParticipantList
        participants={participants}
        roomUrl={roomUrl}
        showStartButton={showStartButton}
        onStartCall={onStartCall}
        onCopyRoomUrl={onCopyRoomUrl}
      />

      {/* 컨트롤 버튼들 */}
      <ControlPanel
        currentUser={currentUser}
        onMicToggle={onMicToggle}
        onCameraToggle={onCameraToggle}
        onLeaveRoom={onLeaveRoom}
        showLeaveButton={showLeaveButton}
      />
    </div>
  )
}
