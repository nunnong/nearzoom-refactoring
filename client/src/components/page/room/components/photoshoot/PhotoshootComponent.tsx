'use client'

import { useState, useEffect } from 'react'
import ProgressBar from './ProgressBar'
import Timer from './Timer'
import PhotoShootSidebar from './PhotoShootSidebar'
import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../../stores/photobooth/stateSlice'
import dynamic from 'next/dynamic'

// Konva 컴포넌트를 dynamic import로 로드 (SSR 방지)
const PhotoCanvas = dynamic(() => import('./PhotoCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-xl bg-gray-200">
      <div className="text-center">
        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">캔버스 로딩 중...</p>
      </div>
    </div>
  ),
})

interface PhotoshootComponentProps {
  onComplete?: () => void
  className?: string
}

export default function PhotoshootComponent({
  onComplete = () => {},
  className,
}: PhotoshootComponentProps) {
  // PhotoBooth store에서 상태들 가져오기
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const isShooting = usePhotoBoothStore(state => state.isShooting)
  const shootingTimer = usePhotoBoothStore(state => state.shootingTimer)
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)

  // PhotoBooth actions
  const completeCapture = usePhotoBoothStore(state => state.completeCapture)
  const setPhotoBoothState = usePhotoBoothStore(state => state.setPhotoBoothState)
  const resetCutIndex = usePhotoBoothStore(state => state.resetCutIndex)

  // 캔버스 캡쳐 완료 핸들러
  const handleCaptureComplete = async (imageData: string, personIds?: string[]) => {
    console.log('📷 Photo captured, completing capture process')
    console.log('🎭 Person IDs received:', personIds)
    await completeCapture(imageData, personIds)
    // shootingSlice에서 자동으로 컷 증가 및 상태 전환 처리
  }

  const cutLabels = ['1컷', '2컷', '3컷', '4컷']



  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8',
        className
      )}
    >
      {/* 메인 영역 */}
      <section className="min-w-0 flex-1">
        <div className="relative flex h-full min-h-[400px] flex-col rounded-2xl border border-white/20 bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:p-4 lg:p-6">
          {/* 진행바 */}
          <div className="flex justify-center py-2 sm:py-3 lg:py-4">
            <ProgressBar
              currentStep={currentCutIndex}
              labels={cutLabels}
              className="mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md"
            />
          </div>

          {/* PhotoCanvas 영역 */}
          <div className="flex flex-1 items-center justify-center">
            <div className="relative">
              {/* 개선된 PhotoCanvas 사용 (DummyPhotoCanvas 로직 적용) */}
              <PhotoCanvas onCapture={handleCaptureComplete} />

              {/* 테스트용 DummyPhotoCanvas (주석처리) */}
              {/* <DummyPhotoCanvas /> */}

              {/* 타이머 오버레이 */}
              <Timer isActive={isShooting} seconds={shootingTimer} />

              {/* 비방장 사용자 안내 */}
              {/* {!isRoomLeader && (
                <div className="absolute top-2 left-2 z-40 sm:top-4 sm:left-4">
                  <div className="rounded-lg border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">
                    <span className="text-yellow-800">
                      방장이 촬영을 진행합니다
                    </span>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </section>

      {/* PhotoShoot 전용 사이드바 */}
      <aside className="w-full shrink-0 md:w-[300px] lg:w-80">
        <PhotoShootSidebar showStartButton={true} showLeaveButton={true} />
      </aside>

    </div>
  )
}
