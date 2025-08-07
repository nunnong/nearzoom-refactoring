'use client'

import { useState } from 'react'
import CompletionModal from './CompletionModal'
import ProgressBar from './ProgressBar'
import Timer from './Timer'
import Sidebar from '../Sidebar'
import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import dynamic from 'next/dynamic'

// Konva 컴포넌트를 dynamic import로 로드 (SSR 방지)
const PhotoCanvas = dynamic(() => import('./PhotoCanvas'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] bg-gray-200 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">캔버스 로딩 중...</p>
      </div>
    </div>
  )
})


interface PhotoshootComponentProps {
  onComplete?: () => void
  className?: string
}

export default function PhotoshootComponent({
  onComplete = () => {},
  className,
}: PhotoshootComponentProps) {
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // PhotoBooth store에서 상태들 가져오기
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const isShooting = usePhotoBoothStore(state => state.isShooting)
  const shootingTimer = usePhotoBoothStore(state => state.shootingTimer)
  const isCapturing = usePhotoBoothStore(state => state.isCapturing)
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  
  // PhotoBooth actions
  const startShooting = usePhotoBoothStore(state => state.startShooting)
  const stopShooting = usePhotoBoothStore(state => state.stopShooting)
  const completeCapture = usePhotoBoothStore(state => state.completeCapture)

  // 촬영 시작 함수
  const handleStartShooting = () => {
    if (!isRoomLeader) {
      console.log('⚠️ Only room leader can start shooting')
      return
    }
    
    console.log('📸 Starting 5-second countdown for photo capture')
    startShooting(5) // 5초 카운트다운 시작
  }

  // 촬영 상태 리셋 함수
  const handleResetShooting = () => {
    if (!isRoomLeader) {
      console.log('⚠️ Only room leader can reset shooting')
      return
    }
    
    console.log('🔄 Resetting shooting state')
    stopShooting() // 모든 촬영 상태를 초기화
  }

  // 캔버스 캡쳐 완료 핸들러
  const handleCaptureComplete = async (imageData: string) => {
    console.log('📷 Photo captured, completing capture process')
    await completeCapture(imageData)
    // shootingSlice에서 자동으로 컷 증가 및 상태 전환 처리
  }

  const cutLabels = ['1컷', '2컷', '3컷', '4컷']

  // SELECTING 상태로의 전환은 shootingSlice에서 자동 처리됨
  // useEffect 제거 - 더 이상 수동으로 완료 모달을 표시하지 않음

  const handleNextStep = () => {
    setShowCompletionModal(false)
    onComplete()
  }

  return (
    <div className={cn('flex flex-1 gap-6 bg-gray-100 px-8 py-6', className)}>
      <div className="relative flex flex-1 flex-col">
        {/* 진행바 */}
        <div className="flex justify-center py-3">
          <ProgressBar
            currentStep={currentCutIndex}
            labels={cutLabels}
            className="mx-auto"
          />
        </div>

        {/* PhotoCanvas 영역 */}
        <div className="flex flex-1 items-center justify-center pb-3">
          <div className="relative w-full max-w-4xl">
            {/* 개선된 PhotoCanvas 사용 (DummyPhotoCanvas 로직 적용) */}
            <PhotoCanvas
              onCapture={handleCaptureComplete}
            />
            
            {/* 테스트용 DummyPhotoCanvas (주석처리) */}
            {/* <DummyPhotoCanvas /> */}

            {/* 타이머 오버레이 */}
            <Timer
              isActive={isShooting}
              seconds={shootingTimer}
            />

            {/* 방장 전용 촬영 버튼 */}
            {isRoomLeader && (
              <div className="absolute top-4 left-4 z-40">
                <div className="flex gap-2">
                  {/* 촬영 시작 버튼 */}
                  <button
                    onClick={handleStartShooting}
                    disabled={isShooting || isCapturing}
                    className={`rounded-lg px-4 py-2 font-semibold text-white shadow-lg transition-colors ${
                      isShooting || isCapturing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isCapturing ? '📸 촬영 중...' : isShooting ? '⏱️ 카운트다운...' : '📸 촬영하기'}
                  </button>
                  
                  {/* 리셋 버튼 (촬영 중일 때만 표시) */}
                  {(isShooting || isCapturing) && (
                    <button
                      onClick={handleResetShooting}
                      className="rounded-lg px-3 py-2 font-semibold text-white shadow-lg transition-colors bg-red-600 hover:bg-red-700"
                      title="촬영 상태 초기화"
                    >
                      🔄 리셋
                    </button>
                  )}
                </div>
                
                {/* 상태 표시 */}
                {(isShooting || isCapturing) && (
                  <div className="mt-2 rounded bg-black/70 px-3 py-1 text-sm text-white">
                    {isShooting ? `카운트다운: ${shootingTimer}초` : '캡쳐 중...'}
                  </div>
                )}
              </div>
            )}

            {/* 비방장 사용자 안내 */}
            {!isRoomLeader && (
              <div className="absolute top-4 left-4 z-40">
                <div className="rounded-lg bg-yellow-100 border border-yellow-300 px-4 py-2 text-sm">
                  <span className="text-yellow-800">방장이 촬영을 진행합니다</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드바 */}
      <Sidebar
        showStartButton={false}
        showLeaveButton={true}
      />

      {/* 완료 모달 */}
      <CompletionModal isOpen={showCompletionModal} onClose={handleNextStep} />
    </div>
  )
}
