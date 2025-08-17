'use client'

import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../../stores/photobooth'

interface PhotoShootButtonProps {
  className?: string
  disabled?: boolean
}

export default function PhotoShootButton({ className }: PhotoShootButtonProps) {
  // PhotoBooth 관련 상태
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  const isShooting = usePhotoBoothStore(state => state.isShooting)
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const startShooting = usePhotoBoothStore(state => state.startShooting)
  const stopShooting = usePhotoBoothStore(state => state.stopShooting)
  const shootingTimer = usePhotoBoothStore(state => state.shootingTimer)
  const isCapturing = usePhotoBoothStore(state => state.isCapturing)
  const isFlashing = usePhotoBoothStore(state => state.isFlashing)
  const isSaving = usePhotoBoothStore(state => state.isSaving)
  const setPhotoBoothState = usePhotoBoothStore(state => state.setPhotoBoothState)
  const resetCutIndex = usePhotoBoothStore(state => state.resetCutIndex)
  const roomName = usePhotoBoothStore(state => state.roomName)

  // 버튼 클릭 핸들러
  const handleClick = () => {
    if (!isRoomLeader) return

    console.log('🔵 Button clicked:', { currentCutIndex, cutCount, isEqual: currentCutIndex === cutCount })

    // 모든 컷이 완료되었으면 SELECTING 상태로 직접 전환
    if (currentCutIndex === cutCount) {
      console.log('🎉 All cuts completed - transitioning to SELECTING')
      resetCutIndex() // 다음 촬영 세션을 위해 인덱스를 0으로 리셋
      setPhotoBoothState(PhotoBoothState.SELECTING)
      return
    }

    // 카운트다운 중이면 리셋
    if (isShooting && shootingTimer > 0) {
      console.log('🔄 Resetting shooting countdown')
      stopShooting()
      return
    }

    // SHOOTING 상태일 때만 촬영 시작
    if (photoBoothState === PhotoBoothState.SHOOTING) {
      console.log('📸 Starting PhotoShoot countdown')
      startShooting(5) // 5초 카운트다운
    }
  }

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (!isRoomLeader) return 'Waiting...'

    // 모든 컷이 완료되었으면 "촬영 완료" 텍스트
    if (currentCutIndex === cutCount) {
      return '📸 Shooting Complete'
    }

    // 카운트다운 중이면 "취소" 텍스트
    if (isShooting && shootingTimer > 0) {
      return `❌ Cancel (${shootingTimer}s)`
    }

    // 기타 촬영 상태들
    if (isFlashing) return '✨ Flash!'
    if (isCapturing) return '📸 Capturing...'
    if (isSaving) return '💾 Saving...'

    // PhotoBooth 상태별 텍스트
    switch (photoBoothState) {
      case PhotoBoothState.WAITING:
        return 'Waiting Room'
      case PhotoBoothState.SHOOTING:
        return '📸 Start Shooting'
      case PhotoBoothState.SELECTING:
        return '🎨 Photo Select'
      default:
        return '📸 Shoot'
    }
  }

  // 버튼 비활성화 조건 - 방장이 아니거나 (SHOOTING 상태가 아니고 모든 컷이 완료되지도 않은 경우)
  const isDisabled = !isRoomLeader || (photoBoothState !== PhotoBoothState.SHOOTING && currentCutIndex !== cutCount)

  console.log('isRoomLeader', isRoomLeader)
  console.log('isShooting', isShooting)
  console.log('isCapturing', isCapturing)
  console.log('isFlashing', isFlashing)
  console.log('isSaving', isSaving)
  console.log('photoBoothState', photoBoothState)

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'transition-filter relative w-full cursor-pointer rounded-full px-0 py-0 outline-offset-4 duration-250 select-none',
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
          front.style.background =
            'linear-gradient(90deg, #6264fb 0%, #ae58f8 100%)'
          front.style.boxShadow = '0 2px 32px 0 #ae58f8, 0 0 0 #fff'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #4837b1 0%, #7e3ff2 100%)'
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
          front.style.background =
            'linear-gradient(90deg, #5149c3 0%, #a238d2 100%)'
          front.style.boxShadow = '0 2px 18px 0 #ae58f866'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #443484 0%, #8442f7 100%)'
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
      <span className="box-shadow-[0_0_18px_4px_rgba(174,88,248,0.4)] absolute top-0 left-0 z-0 h-full w-full translate-y-0.5 transform rounded-full bg-transparent shadow transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(.3,.7,.4,1)] will-change-[box-shadow,transform]" />
      {/* Edge */}
      <span className="edge absolute top-0 left-0 z-10 h-full w-full rounded-full bg-gradient-to-l from-[#443484] to-[#8442f7] transition-colors duration-250 ease-linear" />
      {/* Front */}
      <span
        className="front relative z-20 block -translate-y-1.5 scale-100 transform rounded-full bg-gradient-to-r from-[#5149c3] to-[#a238d2] py-4 text-[1.25rem] font-extrabold tracking-wide text-[#1d063d] shadow-[0_2px_18px_0_rgba(174,88,248,0.4)] transition-all duration-300 ease-[cubic-bezier(.3,.7,.4,1)] will-change-transform select-none text-shadow-[0_1px_10px_rgba(174,88,248,0.8),_0_0_0_rgba(255,255,255,1)]"
        style={{
          WebkitTextStroke: '1px #fff',
        }}
      >
        <span
          className="flex items-center justify-center gap-3 text-[1.3rem] font-extrabold"
          style={{ filter: 'none' }}
        >
          {getButtonText()}
        </span>
      </span>
    </button>
  )
}
