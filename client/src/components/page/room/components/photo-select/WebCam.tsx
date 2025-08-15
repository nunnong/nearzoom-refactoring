
'use client'

import {
  useTracks,
  TrackLoop,
} from '@livekit/components-react'
import VideoTile from '../VideoTile'
import { cn } from '@/lib/utils'
import { Track } from 'livekit-client'
import type { Participant } from 'livekit-client'

interface WebcamProps {
  participants: Participant[]
  localParticipant: Participant
  className?: string
}

export default function Webcam({ participants, localParticipant, className }: WebcamProps) {
  const cameraTracks = useTracks([Track.Source.Camera])
  
  // 최대 4개의 트랙만 처리
  const displayTrackCount = Math.min(cameraTracks.length, 4)
  const participantCount = participants.length + 1 // +1 for local participant

  return (
    <div className={cn('bg-white rounded-xl p-4 shadow-sm', className)}>
      <h3 className="text-lg font-semibold text-[#2D3243] mb-4">
        참가자 ({participantCount})
        {participantCount > 4 && ' (최대 4명 표시)'}
      </h3>
      
      {/* 세로로 1개씩 웹캠 표시 */}
      <div className="space-y-3">
        {/* 최대 4개의 트랙만 렌더링 */}
        <TrackLoop tracks={cameraTracks.slice(0, 4)}>
          <VideoTile className="h-40 min-h-[10rem]" aspect={false} />
        </TrackLoop>
      </div>
    </div>
  )
}