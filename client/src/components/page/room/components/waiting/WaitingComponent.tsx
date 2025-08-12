'use client'

import {
  useParticipants,
  useLocalParticipant,
  useTracks,
  TrackLoop,
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
    columns: 2,
    rows: 2,
  },
  {
    columns: 2,
    rows: 2,
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

  // Console error interception for stream closed errors
  useEffect(() => {
    const originalError = console.error

    console.error = (...args: any[]) => {
      const message = args.join(' ')
      // Stream closed, InvalidStateError 등을 조용히 처리
      if (
        message.includes('Stream closed') ||
        message.includes('InvalidStateError') ||
        message.includes('error when trying to pipe') ||
        message.includes('intercept-console-error')
      ) {
        console.warn('🔇 Stream error intercepted:', message.substring(0, 100))
        return
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

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
    <div
      className={cn(
        'flex flex-1 flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
        className
      )}
    >
      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 비디오 영역 */}
        <section className="flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">대기실</h2>
            <p className="text-sm text-white/70">
              참가자 {participants.length}명이 대기 중입니다
              {participants.length > 4 && ' (최대 4명 표시)'}
            </p>
          </div>
          <div
            ref={gridRef}
            className="grid h-full gap-3 sm:gap-4 lg:gap-6"
            style={{
              gridTemplateColumns: `repeat(var(--lk-col-count, 1), 1fr)`,
              gridTemplateRows: `repeat(var(--lk-row-count, 1), 1fr)`,
            }}
          >
            {/* 최대 4개의 트랙만 렌더링 */}
            <TrackLoop tracks={cameraTracks.slice(0, 4)}>
              <VideoTile />
            </TrackLoop>
          </div>
        </section>

        {/* 사이드바 */}
        <aside className="w-full shrink-0 md:w-[300px]">
          <Sidebar
            showStartButton={true}
            showLeaveButton={true}
            onStartCall={onStartCall}
          />
        </aside>
      </main>
    </div>
  )
}
