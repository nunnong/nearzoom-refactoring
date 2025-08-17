'use client'

import { cn } from '@/lib/utils'
import { VideoTrack, TrackRefContext } from '@livekit/components-react'
import { Component, ReactNode } from 'react'

interface VideoTileProps {
  className?: string
  aspect?: boolean
}

// React Error Boundary for VideoTrack
class VideoTrackErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    // Stream closed, InvalidStateError 등을 조용히 처리
    if (error.message?.includes('Stream closed') || 
        error.message?.includes('InvalidStateError') ||
        error.name === 'InvalidStateError') {
      console.warn('🔇 Video stream error handled by Error Boundary:', error.message)
      return { hasError: true }
    }
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // 에러 로그를 최소화하고 조용히 처리
    console.warn('🔇 VideoTrack Error Boundary caught:', {
      message: error.message,
      name: error.name
    })
  }

  componentDidUpdate(prevProps: { children: ReactNode; fallback: ReactNode }) {
    // children이 변경되면 에러 상태 리셋 (track이 새로 연결된 경우)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// 에러 핸들링을 위한 Safe VideoTrack 컴포넌트
function SafeVideoTrack({ trackRef, className }: { trackRef: any, className: string }) {
  const fallbackUI = (
    <div className={cn(className, 'bg-gray-200 flex items-center justify-center')}>
      <div className="text-gray-500 text-xs">Video reconnecting...</div>
    </div>
  )

  return (
    <VideoTrackErrorBoundary fallback={fallbackUI}>
      <VideoTrack 
        {...trackRef}
        className={className}
      />
    </VideoTrackErrorBoundary>
  )
}

export default function VideoTile({
  className,
  aspect = true,
}: VideoTileProps) {
  return (
    <TrackRefContext.Consumer>
      {(trackRef) => {
        if (!trackRef) {
          return (
            <div className={cn(
              'group relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-lg transition-all duration-300 hover:scale-[1.02] md:rounded-3xl flex items-center justify-center',
              aspect && 'aspect-video',
              className
            )}>
              <div className="text-gray-500 text-sm">No track available</div>
            </div>
          )
        }

        // trackRef.participant에서 참가자 정보 추출 (try-catch로 보호)
        let participantData
        try {
          const participant = trackRef.participant
          participantData = {
            id: participant.identity,
            email: participant.identity,
            name: participant.name || participant.identity,
            isHost: participant.metadata 
              ? JSON.parse(participant.metadata).role === 'host' 
              : false,
            isMicOn: participant.isMicrophoneEnabled,
            isCameraOn: participant.isCameraEnabled,
            isConnected: true,
          }
        } catch (error) {
          // participant 정보 추출 실패 시 기본값 사용
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn('🔇 Participant data extraction error handled:', errorMessage)
          participantData = {
            id: 'unknown',
            email: 'unknown',
            name: 'Unknown Participant',
            isHost: false,
            isMicOn: false,
            isCameraOn: false,
            isConnected: false,
          }
        }

        return (
          <div
            className={cn(
              'group relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-lg transition-all duration-300 hover:scale-[1.02] md:rounded-3xl',
              aspect && 'aspect-video',
              participantData.isHost && 'shadow-xl ring-2 ring-[#C9D76D]/60',
              className
            )}
          >
            {/* Safe VideoTrack 컴포넌트 (에러 핸들링 포함) */}
            <SafeVideoTrack 
              trackRef={trackRef}
              className="h-full w-full object-cover"
            />

            {/* GroupCall 스타일 UI 오버레이 */}
            <div className="absolute right-0 bottom-0 left-0 border-t border-gray-200/60 bg-white/95 p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
                  <span className="truncate text-sm font-medium text-gray-800 sm:text-base">
                    {participantData.name || participantData.email}
                  </span>
                  {participantData.isHost && (
                    <div className="flex shrink-0 items-center space-x-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[#2D3243]">
                      <svg
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="hidden sm:inline">Host</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 space-x-1 sm:space-x-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 md:h-8 md:w-8',
                      participantData.isMicOn ? 'bg-green-500' : 'bg-red-500'
                    )}
                  >
                    <svg
                      className="h-3 w-3 text-white sm:h-4 sm:w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {participantData.isMicOn ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      ) : (
                        <>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                          />
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* 말하는 중 효과 */}
            {participantData.isMicOn && (
              <div className="absolute inset-0 animate-pulse rounded-2xl border-2 border-[#c4c8da] md:rounded-3xl" />
            )}
          </div>
        )
      }}
    </TrackRefContext.Consumer>
  )
}
