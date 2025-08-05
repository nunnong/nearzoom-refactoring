'use client'

import {
  useParticipants,
  useLocalParticipant,
  useTracks,
  TrackLoop,
  ParticipantTile,
} from '@livekit/components-react'
import Sidebar from '../Sidebar'
import VideoTile from '../VideoTile'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { Track } from 'livekit-client'

interface WaitingComponentProps {
  onStartCall?: () => void
  className?: string
}

export default function WaitingComponent({
  onStartCall = () => {},
  className,
}: WaitingComponentProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  const cameraTracks = useTracks([Track.Source.Camera])

  useEffect(() => {
    console.log('participants:', participants)
    console.log('localParticipant:', localParticipant)
    console.log('cameraTracks:', cameraTracks)
  }, [participants, localParticipant, cameraTracks])

  return (
    <div className={cn('flex flex-1 gap-6 bg-gray-100 px-8 py-6', className)}>
      {/* 왼쪽: 비디오 영역 */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#2D3243]">대기실</h2>
          <p className="text-sm text-[#2D3243]/70">
            참가자 {participants.length}명이 대기 중입니다
          </p>
        </div>

        <div className="flex-1 rounded-lg bg-white p-6 shadow-sm">
          <div
            className={cn(
              'grid h-full gap-4',
              participants.length === 1
                ? 'grid-cols-1'
                : participants.length === 2
                  ? 'grid-cols-2'
                  : participants.length <= 4
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
            )}
          >
            <TrackLoop tracks={cameraTracks}>
              <ParticipantTile className="min-h-[200px] overflow-hidden rounded-lg bg-[#2D3243]" />
            </TrackLoop>
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드바 */}
      {/* <Sidebar
        showStartButton={true}
        showLeaveButton={true}
        onStartCall={onStartCall}
      /> */}
    </div>
  )
}
