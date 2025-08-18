'use client'

import { cn } from '@/lib/utils'
import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import PhotoShootControlPanel from './PhotoShootControlPanel'
import PhotoShootParticipantList from './PhotoShootParticipantList'

interface PhotoShootSidebarProps {
  showStartButton?: boolean
  showLeaveButton?: boolean
  onStartCall?: () => void
  className?: string
}

export default function PhotoShootSidebar({
  showStartButton = true,
  showLeaveButton = true,
  onStartCall = () => {},
  className,
}: PhotoShootSidebarProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  return (
    <div className={cn('flex w-80 flex-col gap-6', className)}>
      {/* PhotoShoot 전용 참가자 목록 */}
      <PhotoShootParticipantList />

      {/* PhotoShoot 전용 컨트롤 패널 */}
      <PhotoShootControlPanel showLeaveButton={showLeaveButton} />
    </div>
  )
}
