'use client'

import {
  useParticipants,
  useLocalParticipant,
  useTracks,
  TrackLoop,
  ParticipantTile,
  useGridLayout,
  GridLayoutDefinition,
} from '@livekit/components-react'
import Sidebar from '../Sidebar'
import VideoTile from '../VideoTile'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'

// 최대 4명을 위한 커스텀 그리드 레이아웃 정의
const FOUR_PERSON_LAYOUTS: GridLayoutDefinition[] = [
  {
    columns: 1,
    rows: 1,
  },
  {
    columns: 2,
    rows: 1,
  },
  {
    columns: 2,
    rows: 2,
  },
]

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

  // Grid 컨테이너를 위한 ref 생성
  const gridRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLDivElement>

  // 최대 4개의 트랙만 처리
  const displayTrackCount = Math.min(cameraTracks.length, 4)

  // useGridLayout 훅 사용 - 커스텀 레이아웃 적용
  const { layout, containerWidth, containerHeight } = useGridLayout(
    gridRef,
    displayTrackCount,
    { gridLayouts: FOUR_PERSON_LAYOUTS }
  )

  useEffect(() => {
    console.log('participants:', participants)
    console.log('localParticipant:', localParticipant)
    console.log('cameraTracks:', cameraTracks)
    console.log('layout:', layout)

    console.log('Grid layout updated:', {
      containerWidth,
      containerHeight,
      layout,
    })
  }, [participants, localParticipant, cameraTracks, layout])

  return (
    <div className={cn('flex flex-1 gap-6 bg-gray-100 px-8 py-6', className)}>
      {/* 왼쪽: 비디오 영역 */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#2D3243]">대기실</h2>
          <p className="text-sm text-[#2D3243]/70">
            참가자 {participants.length}명이 대기 중입니다
            {participants.length > 4 && ' (최대 4명 표시)'}
          </p>
        </div>

        <div className="flex-1 rounded-lg bg-white p-6 shadow-sm">
          <div
            ref={gridRef}
            className="grid h-full gap-4"
            style={{
              gridTemplateColumns: `repeat(var(--lk-col-count, 1), 1fr)`,
              gridTemplateRows: `repeat(var(--lk-row-count, 1), 1fr)`,
            }}
          >
            {/* 최대 4개의 트랙만 렌더링 */}
            <TrackLoop tracks={cameraTracks.slice(0, 4)}>
              <div className="relative min-h-0 min-w-0">
                <ParticipantTile className="absolute inset-0 h-full w-full overflow-hidden rounded-lg bg-[#2D3243]" />
              </div>
            </TrackLoop>
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드바 */}
      <Sidebar
        showStartButton={true}
        showLeaveButton={true}
        onStartCall={onStartCall}
      />
    </div>
  )
}
