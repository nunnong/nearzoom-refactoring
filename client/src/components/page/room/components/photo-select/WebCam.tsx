
'use client'

import VideoTile from '@/components/page/groupcall/VideoTile' 
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

interface WebcamProps {
  participants: Participant[]
  currentUser: any
  className?: string
}

export default function Webcam({ participants, currentUser, className }: WebcamProps) {
  const allParticipants = [currentUser, ...participants.filter(p => p.id !== currentUser.id)].slice(0, 4)

  return (
    <div className={cn('bg-white rounded-xl p-4 shadow-sm', className)}>
      <h3 className="text-lg font-semibold text-[#2D3243] mb-4">
        참가자 ({allParticipants.length})
      </h3>
      
      {/* 세로로 1개씩 웹캠 표시 */}
      <div className="space-y-3">
        {allParticipants.map((participant) => (
          <VideoTile 
            key={participant.id} 
            participant={participant}
            className="h-40 min-h-[10rem]"
            aspect={false} 
          />
        ))}
      </div>
    </div>
  )
}