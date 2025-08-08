
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
    <div className={cn('bg-white/90 rounded-2xl p-4 py-4 shadow-sm', className)}>
      <h3 className="text-rg font-extrabold tracking-tight text-gray-900 mb-2">
        Participants ({allParticipants.length})
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