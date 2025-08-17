'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import ControlPanel from '../ControlPanel'
import FrameColorSelector from '../photo-select/FrameColorSelector'
import PhotoCutSelector from '../photo-select/PhotoCutSelector'
import PhotoPicker from '../photo-select/PhotoPicker'
import Preview from '../photo-select/Preview'
import StartButton from '../photo-select/StartButton'
import WebCam from '../photo-select/WebCam'
import CompletionModal from '../photoshoot/CompletionModal'
import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../../stores/photobooth/stateSlice'
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'

interface PhotoSelectComponentProps {
  className?: string
}

export default function PhotoSelectComponent({
  className,
}: PhotoSelectComponentProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  // Local modal state (not synced via Yjs)
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)

  // Yjs store에서 상태 가져오기
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const selectedPhotos = usePhotoBoothStore(state => state.selectedPhotos) // Photo objects array
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const capturedImages = usePhotoBoothStore(state => state.capturedImages)
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  const roomName = usePhotoBoothStore(state => state.roomName)

  // Yjs store 액션들
  const setCutCount = usePhotoBoothStore(state => state.setCutCount)
  const setSelectedPhotos = usePhotoBoothStore(state => state.setSelectedPhotos)
  const setFrameColor = usePhotoBoothStore(state => state.setFrameColor)
  const setPhotoBoothState = usePhotoBoothStore(
    state => state.setPhotoBoothState
  )
  const initializeEditSession = usePhotoBoothStore(state => state.initializeEditSession)

  // 실제 촬영된 사진들 사용 - PhotoShoot에서 저장된 Photo 객체들에서 imgUrl 추출
  const capturedPhotos = useMemo(() => {
    console.log('📸 Raw selectedPhotos:', selectedPhotos)
    
    if (!selectedPhotos || !Array.isArray(selectedPhotos)) {
      console.log('📸 selectedPhotos is not an array:', selectedPhotos)
      return []
    }
    
    // selectedPhotos 배열에서 null이 아닌 Photo 객체들의 imgUrl 추출
    const photoUrls = selectedPhotos
      .filter(photo => photo !== null && photo !== undefined && typeof photo === 'object' && photo.imgUrl)
      .map(photo => photo.imgUrl)
    
    console.log('📸 Extracted photo URLs from selectedPhotos:', photoUrls)
    
    // 실제 촬영된 사진이 있으면 사용, 없으면 빈 배열 (fallback 제거)
    return photoUrls.length > 0 ? photoUrls : []
  }, [selectedPhotos])

  // 촬영된 사진 개수에 따라 최대 선택 가능한 컷 수 결정
  const maxAvailableCuts = useMemo(() => {
    const photoCount = capturedPhotos.length
    console.log('📸 Available photo count:', photoCount)
    
    // UI에서는 모든 옵션을 보여주되, 실제 제한은 PhotoPicker에서 처리
    return 4 // 항상 4 반환하여 1컷, 2컷, 4컷 모두 선택 가능하게 함
  }, [])

  // cutCount가 사용 가능한 사진 수를 초과하면 자동으로 조정
  useMemo(() => {
    const photoCount = capturedPhotos.length
    // 실제 제한: 사진 수보다 많은 컷을 선택할 수 없음
    if (cutCount > photoCount && photoCount > 0) {
      const adjustedCut = photoCount >= 4 ? 4 : photoCount >= 2 ? 2 : 1
      console.log(`📸 Adjusting cutCount from ${cutCount} to ${adjustedCut} (${photoCount} photos available)`)
      setCutCount(adjustedCut)
    }
  }, [cutCount, capturedPhotos.length, setCutCount])

  // PhotoPicker를 위한 선택된 이미지 URL 배열 (로컬 상태)
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  
  // API 호출 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false)

  // selectedPhotos가 변경되면 selectedImageUrls도 업데이트
  useMemo(() => {
    if (!selectedPhotos || !Array.isArray(selectedPhotos)) {
      setSelectedImageUrls([])
      return
    }
    
    const urls = selectedPhotos
      .filter(photo => photo !== null && photo !== undefined && typeof photo === 'object' && photo.imgUrl)
      .map(photo => photo!.imgUrl)
    setSelectedImageUrls(urls)
  }, [selectedPhotos])

  const frameColors = useMemo(() => [
    '#FFFFFF',
    '#000000',
    '#929292',
    '#73c0ef',
    '#293e85',
    '#2D3243',
  ], [])

  // 컷수 변경 핸들러
  const handleCutCountChange = useCallback((count: number) => {
    setCutCount(count)
    // 기존 선택 유지 - PhotoPicker가 자동으로 제한 처리
  }, [setCutCount])

  // PhotoPicker 선택 변경 핸들러
  const handlePhotoSelection = useCallback((urls: string[]) => {
    setSelectedImageUrls(urls)
  }, [])

  // 완료 핸들러
  const handleComplete = useCallback(async () => {
    if (selectedImageUrls.length !== cutCount) {
      alert('먼저 사진을 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    
    try {
      console.log('=== 사진 선택 API 호출 시작 ===')
      
      // 선택된 사진들의 인덱스 계산 (1-based)
      const selectedCutIds = selectedImageUrls.map(selectedUrl => 
        capturedPhotos.indexOf(selectedUrl) + 1 // 1-based index
      )

      const requestData = {
        roomId: parseInt(roomName),
        selectedCutIds: selectedCutIds,
        cutCount: selectedImageUrls.length,
        frameColor: frameColor
      }

      console.log('요청 데이터:', requestData)
      
      const response = await api.post(API_ENDPOINTS.PHOTO_SELECTION, requestData)
      
      console.log('사진 선택 API 성공:', response.data)

      alert('사진 선택이 성공적으로 전송되었습니다!')
      
      // 편집 세션 시작 - Photo 객체들 전달 (URL과 personIds 포함)
      const selectedPhotoObjects = selectedImageUrls.map(url => {
        // selectedPhotos에서 해당 URL을 가진 Photo 객체 찾기
        const photoObj = selectedPhotos.find(photo => photo && photo.imgUrl === url)
        return photoObj!
      }).filter(Boolean) // null/undefined 제거
      
      console.log('🎨 Passing Photo objects to edit session:', selectedPhotoObjects)
      initializeEditSession(selectedPhotoObjects)
      
      // EDITING 상태로 전환
      setPhotoBoothState(PhotoBoothState.EDITING)
      
    } catch (error: any) {
      console.error('사진 선택 API 실패:', error)
      alert('사진 선택 전송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedImageUrls, cutCount, frameColor, capturedPhotos, roomName, setPhotoBoothState, initializeEditSession])

  // 완료 버튼 비활성화 상태
  const isCompleteDisabled = useMemo(() => 
    selectedImageUrls.length !== cutCount || isSubmitting,
    [selectedImageUrls.length, cutCount, isSubmitting]
  )

  // Modal close handler
  const handleWelcomeModalClose = useCallback(() => {
    setShowWelcomeModal(false)
  }, [])

  return (
    <div className={cn('flex flex-1 flex-col gap-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:flex-row md:gap-6 md:p-6 lg:p-8', className)}>
      {/* 메인 영역 */}
      <section className="min-w-0 flex-1">
        <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-sm p-3 shadow-lg sm:p-4 lg:p-6">
          <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
            
            {/* 사진 선택과 프레임 선택 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8 xl:gap-12 mt-4 mb-8">
              
              {/* 왼쪽: 사진 선택 */}
              <div className="space-y-4 lg:col-span-3">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center sm:text-xl">
                  사진 선택
                </h2>
                
                <div className="flex justify-center">
                  <PhotoCutSelector 
                    cutCount={cutCount} 
                    onChange={handleCutCountChange}
                    maxAvailable={4}
                    availablePhotos={capturedPhotos.length}
                  />
                </div>
                
                <PhotoPicker
                  photos={capturedPhotos}
                  cutCount={cutCount}
                  selected={selectedImageUrls}
                  onSelect={handlePhotoSelection}
                />
              </div>

              {/* 오른쪽: 프레임 색상 + 미리보기 + 완료 버튼 */}
              <div className="space-y-4 lg:col-span-2 lg:space-y-6">
                
                <div className="space-y-3">
                  <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center sm:text-xl">
                    프레임 색상
                  </h2>
                  <FrameColorSelector
                    frameColor={frameColor}
                    onFrameColorChange={setFrameColor}
                    palette={frameColors}
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-center sm:p-4">
                  <div className="mb-2 text-sm text-gray-500 sm:text-base">미리보기</div>
                  <div className="flex justify-center">
                    <Preview
                      cutCount={cutCount}
                      selectedPhotos={selectedImageUrls}
                      frameColor={frameColor}
                      className="max-w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                  <StartButton
                    onClick={handleComplete}
                    disabled={isCompleteDisabled}
                    className="w-full max-w-xs sm:w-54"
                  >
                    {isSubmitting ? 'SENDING...' : 'COMPLETE'}
                  </StartButton>

                  {isCompleteDisabled && (
                    <p className="text-center text-xs text-gray-500 sm:text-base">
                      {isSubmitting ? (
                        <span>사진 선택을 전송 중입니다...</span>
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            {cutCount}장의 사진을 모두 선택해주세요
                          </span>
                          <span className="sm:hidden">
                            {cutCount}장 선택 필요
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-[300px] shrink-0 md:block lg:w-80">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Webcam 컴포넌트 */}
          <WebCam
            participants={participants}
            localParticipant={localParticipant}
          />
          
          {/* 컨트롤 패널 */}
          <ControlPanel
            showLeaveButton={true}
          />
        </div>
      </aside>

      {/* Welcome Modal */}
      <CompletionModal 
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        isRoomLeader={isRoomLeader}
      />
    </div>
  )
}
