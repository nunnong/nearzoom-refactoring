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
        className={cn(
          'relative w-full rounded-full px-0 py-0 cursor-pointer outline-offset-4 select-none transition-filter duration-250',
          isDisabled && 'cursor-not-allowed opacity-60',
          className
        )}
        onMouseEnter={e => {
          if (isDisabled) return
          const front = e.currentTarget.querySelector('.front') as HTMLElement
          const edge = e.currentTarget.querySelector('.edge') as HTMLElement
          const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

          if (front) {
            front.style.transform = 'translateY(-10px) scale(1.04)'
            front.style.background = 'linear-gradient(90deg, #6264fb 0%, #ae58f8 100%)'
            front.style.boxShadow = '0 2px 32px 0 #ae58f8, 0 0 0 #fff'
          }
          if (edge) {
            edge.style.background = 'linear-gradient(to left, #4837b1 0%, #7e3ff2 100%)'
          }
          if (shadow) {
            shadow.style.boxShadow = '0 0 32px 10px #ae58f899'
          }
          e.currentTarget.style.filter = 'brightness(110%)'
        }}
        onMouseLeave={e => {
          if (isDisabled) return
          const front = e.currentTarget.querySelector('.front') as HTMLElement
          const edge = e.currentTarget.querySelector('.edge') as HTMLElement
          const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

          if (front) {
            front.style.transform = 'translateY(-6px) scale(1)'
            front.style.background = 'linear-gradient(90deg, #5149c3 0%, #a238d2 100%)'
            front.style.boxShadow = '0 2px 18px 0 #ae58f866'
          }
          if (edge) {
            edge.style.background = 'linear-gradient(to left, #443484 0%, #8442f7 100%)'
          }
          if (shadow) {
            shadow.style.boxShadow = '0 0 16px 6px #ae58f860'
          }
          e.currentTarget.style.filter = 'none'
        }}
        onMouseDown={e => {
          if (isDisabled) return
          const front = e.currentTarget.querySelector('.front') as HTMLElement
          const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

          if (front) {
            front.style.transform = 'translateY(-2px) scale(0.98)'
            front.style.boxShadow = '0 2px 8px 0 #ae58f899'
          }
          if (shadow) {
            shadow.style.boxShadow = '0 0 8px 2px #ae58f849'
          }
        }}
        onMouseUp={e => {
          if (isDisabled) return
          // 눌림 해제시 hover 상태 유지
          e.currentTarget.dispatchEvent(new Event('mouseleave'))
        }}
      >
        {/* Shadow */}
        <span
          className="shadow absolute top-0 left-0 w-full h-full rounded-full bg-transparent
            box-shadow-[0_0_18px_4px_rgba(174,88,248,0.4)]
            will-change-[box-shadow,transform]
            transform translate-y-0.5
            transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(.3,.7,.4,1)]
            z-0"
        />
        {/* Edge */}
        <span
          className="edge absolute top-0 left-0 w-full h-full rounded-full
            bg-gradient-to-l from-[#443484] to-[#8442f7]
            transition-colors duration-250 ease-linear
            z-10"
        />
        {/* Front */}
        <span
          className="front relative block rounded-full py-4 text-[1.25rem]
            font-extrabold tracking-wide text-[#1d063d]
            bg-gradient-to-r from-[#5149c3] to-[#a238d2]
            shadow-[0_2px_18px_0_rgba(174,88,248,0.4)]
            will-change-transform
            transform -translate-y-1.5 scale-100
            transition-transform transition-bg transition-shadow duration-360 ease-[cubic-bezier(.3,.7,.4,1)]
            z-20
            select-none
            text-shadow-[0_1px_10px_rgba(174,88,248,0.8),_0_0_0_rgba(255,255,255,1)]"
          style={{
            WebkitTextStroke: '1px #fff',
          }}
        >
          <span
            className="flex items-center justify-center gap-3 font-extrabold text-[1.7rem]"
            style={{ filter: 'none' }}
          >
            <span>START</span>
            <span
              className="text-white"
              style={{
                WebkitTextStroke: '1px #ae58f8',
                textShadow: '0 0 8px rgba(174,88,248,0.6), 0 0 0 #fff',
              }}
            >
              ▶
            </span>
          </span>
        </span>
      </button>
    </div>
  )
}
