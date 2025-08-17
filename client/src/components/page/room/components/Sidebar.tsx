'use client'

import { cn } from '@/lib/utils'
import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import ControlPanel from './ControlPanel'
import ParticipantList from './ParticipantList'

interface SidebarProps {
  showStartButton?: boolean
  showLeaveButton?: boolean
  onStartCall?: () => void
  className?: string
}

export default function Sidebar({
  showStartButton = true,
  showLeaveButton = true,
  onStartCall = () => {},
  className,
}: SidebarProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()
  return (
    <div className={cn('flex flex-col gap-6 w-80', className)}>
      {/* 참가자 목록 */}
      <ParticipantList
        showStartButton={showStartButton}
        onStartCall={onStartCall}
      />

      {/* 컨트롤 버튼들 */}
      <ControlPanel
        showLeaveButton={showLeaveButton}
      />
    </div>
  )
}