'use client'

import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../stores/photobooth'

interface StartButtonProps {
  className?: string
  disabled?: boolean
  onStartCall?: () => void
}

export default function StartButton({
  className,
  disabled = false,
  onStartCall = () => {},
}: StartButtonProps) {
  const setPhotoBoothState = usePhotoBoothStore((state) => state.setPhotoBoothState)
  const isRoomLeader = usePhotoBoothStore((state) => state.isRoomLeader)
  const roomLeader = usePhotoBoothStore((state) => state.roomLeader)
  
  // 방장이 아니면 버튼 비활성화
  const isDisabled = disabled || !isRoomLeader
  
  const onClick = () => {
    // 방장만 시작할 수 있음
    if (!isRoomLeader) {
      console.log('⚠️ Only room leader can start the photobooth')
      return
    }
    
    console.log('🚀 Starting PhotoBooth shooting mode')
    
    // Yjs를 통해 상태 업데이트 (모든 참가자에게 자동 동기화됨)
    setPhotoBoothState(PhotoBoothState.SHOOTING)
    
    onStartCall()
  }
  return (
    <div className="w-full">
      {/* 비방장 사용자에게 메시지 표시 */}
      {!isRoomLeader && roomLeader && (
        <div className="mb-3 text-center">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{roomLeader}</span>님이 방장입니다
          </p>
          <p className="text-xs text-gray-500">방장만 PhotoBooth를 시작할 수 있습니다</p>
        </div>
      )}
      
      <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn('pushable-button w-full', className)}
      style={{
        position: 'relative',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        outlineOffset: '4px',
        transition: 'filter 250ms',
        userSelect: 'none',
        touchAction: 'manipulation',
        opacity: isDisabled ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (isDisabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-6px)'
          front.style.background = '#D86F4A'
          front.style.transition =
            'transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5), background 250ms ease'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #A85439 0%, #D86F4A 8%, #D86F4A 92%, #A85439 100%)'
        }
        if (shadow) {
          shadow.style.transform = 'translateY(4px)'
          shadow.style.transition =
            'transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5)'
        }
        e.currentTarget.style.filter = 'brightness(110%)'
      }}
      onMouseLeave={e => {
        if (isDisabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-4px)'
          front.style.background = '#C9D76D'
          front.style.transition =
            'transform 600ms cubic-bezier(.3, .7, .4, 1), background 250ms ease'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #B5C45A 0%, #C9D76D 8%, #C9D76D 92%, #B5C45A 100%)'
        }
        if (shadow) {
          shadow.style.transform = 'translateY(2px)'
          shadow.style.transition =
            'transform 600ms cubic-bezier(.3, .7, .4, 1)'
        }
        e.currentTarget.style.filter = 'none'
      }}
      onMouseDown={e => {
        if (isDisabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-2px)'
          front.style.transition = 'transform 34ms'
        }
        if (shadow) {
          shadow.style.transform = 'translateY(1px)'
          shadow.style.transition = 'transform 34ms'
        }
      }}
    >
      <span
        className="shadow"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background: 'hsl(0deg 0% 0% / 0.25)',
          willChange: 'transform',
          transform: 'translateY(2px)',
          transition: 'transform 600ms cubic-bezier(.3, .7, .4, 1)',
        }}
      />
      <span
        className="edge"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background:
            'linear-gradient(to left, #B5C45A 0%, #C9D76D 8%, #C9D76D 92%, #B5C45A 100%)',
          transition: 'background 250ms ease',
        }}
      />
      <span
        className="front"
        style={{
          display: 'block',
          position: 'relative',
          padding: '15px 27px',
          borderRadius: '12px',
          fontSize: '1.25rem',
          color: 'white',
          background: '#C9D76D',
          willChange: 'transform',
          transform: 'translateY(-4px)',
          transition:
            'transform 600ms cubic-bezier(.3, .7, .4, 1), background 250ms ease',
          fontWeight: 'bold',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <span>START</span>
          <span>▶</span>
        </span>
      </span>
      </button>
    </div>
  )
}
