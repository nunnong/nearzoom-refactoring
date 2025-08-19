'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import ControlPanel from '../ControlPanel'
import WebCam from '../photo-select/WebCam'
import Preview from '../photo-select/Preview'
import StartButton from '../photo-select/StartButton'
import PhotoNavigator from './PhotoNavigator'
import ToggleSwitch from './ToggleSwitch'
import ColorPalette from './ColorPalette'
import PromptSection from './PromptSection'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'
import type { BackgroundType } from '@/components/page/room/stores/photobooth/editSlice'

export default function PhotoEditComponent() {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  // 로딩 상태
  const [isProcessing, setIsProcessing] = useState(false)

  const {
    // Edit slice state
    selectedPhotoUrls,
    photoPersonIds,
    processedPhotoUrls,
    currentEditIndex,
    backgroundType,
    selectedColor,
    promptText,
    photoBackgrounds,
    editSessionStarted,
    frameColor,
    roomName,
    
    
    // Edit slice actions
    setBackgroundType,
    setSelectedColor, 
    setPromptText,
    saveAndProceedNext,
    completeEditing,
    isCurrentPhotoComplete,
    isAllPhotosComplete,
  } = usePhotoBoothStore()

  // 편집 세션이 시작되지 않았으면 표시하지 않음
  if (!editSessionStarted || selectedPhotoUrls.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-600">
          <p>편집할 사진이 없습니다.</p>
        </div>
      </div>
    )
  }

  // 완료된 사진들 표시 (PhotoNavigator에서 사용)
  const completedPhotos = useMemo(() => 
    photoBackgrounds.map(bg => bg.completed), 
    [photoBackgrounds]
  )

  // 배경 처리 API 호출
  const processBackground = useCallback(async () => {
    if (!isCurrentPhotoComplete()) {
      throw new Error('Background settings not complete')
    }

    const currentPhotoUrl = selectedPhotoUrls[currentEditIndex]
    const currentPersonIds = photoPersonIds[currentEditIndex] || []
    
    console.log('🎨 Processing background for photo:', {
      index: currentEditIndex,
      photoUrl: currentPhotoUrl,
      personIds: currentPersonIds,
      backgroundType,
      selectedColor,
      promptText
    })

    const requestData = {
      roomId: parseInt(roomName),
      imageUrl: currentPhotoUrl,
      backgroundType: backgroundType,
      personIds: currentPersonIds,
      ...(backgroundType === 'prompt' 
        ? { promptText: promptText }
        : { colorValue: selectedColor }
      )
    }

    const response = await api.post(API_ENDPOINTS.PHOTO_BACKGROUND, requestData)
    console.log('🎨 Background processing complete:', response.data)
    
    return response.data
  }, [
    currentEditIndex, 
    selectedPhotoUrls, 
    photoPersonIds, 
    backgroundType, 
    selectedColor, 
    promptText, 
    roomName, 
    isCurrentPhotoComplete
  ])

  const handleNext = useCallback(async () => {
    if (!isCurrentPhotoComplete()) return

    setIsProcessing(true)
    try {
      // 1. 백그라운드 API 호출
      const result = await processBackground()
      
      // 2. 처리된 URL 저장 (필요한 경우)
      // TODO: 처리 결과에 따라 processedPhotoUrls 업데이트
      
      // 3. 다음 사진으로 진행
      saveAndProceedNext()
      
    } catch (error: any) {
      console.error('🎨 Background processing failed:', error)
      alert(`배경 처리에 실패했습니다: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [isCurrentPhotoComplete, processBackground, saveAndProceedNext])

  const handleComplete = useCallback(async () => {
    if (!isCurrentPhotoComplete()) return

    setIsProcessing(true)
    try {
      // 1. 마지막 사진 백그라운드 API 호출
      const result = await processBackground()
      
      // 2. 마지막 사진 저장
      saveAndProceedNext()
      
      // 3. 편집 완료
      completeEditing()
      
    } catch (error: any) {
      console.error('🎨 Final background processing failed:', error)
      alert(`배경 처리에 실패했습니다: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [isCurrentPhotoComplete, processBackground, saveAndProceedNext, completeEditing])

  const isLastPhoto = useMemo(() => 
    currentEditIndex === selectedPhotoUrls.length - 1, 
    [currentEditIndex, selectedPhotoUrls.length]
  )
  
  const canProceed = useMemo(() => 
    isCurrentPhotoComplete() && !isProcessing, 
    [isCurrentPhotoComplete, isProcessing]
  )

  return (
    <div className={cn('flex flex-1 flex-col gap-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:flex-row md:gap-6 md:p-6 lg:p-8')}>
      {/* 메인 영역 */}
      <section className="min-w-0 flex-1">
        <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-sm p-3 shadow-lg sm:p-4 lg:p-6">
          <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
            
            {/* 배경 편집과 옵션 선택 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8 xl:gap-12 mt-4 mb-8">
              
              {/* 왼쪽: 사진 네비게이터 */}
              <div className="space-y-4 lg:col-span-2">
                <h2 className="text-center text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl lg:hidden">
                  Photo Navigator
                </h2>
                <PhotoNavigator
                  photos={selectedPhotoUrls}
                  currentIndex={currentEditIndex}
                  completedPhotos={completedPhotos}
                />
                {/* 모바일에서 현재 사진 정보 */}
                <div className="text-center text-sm text-gray-600 lg:hidden">
                  {currentEditIndex + 1} / {selectedPhotoUrls.length}
                </div>
              </div>

              {/* 오른쪽: 배경 옵션 + 미리보기 + 완료 버튼 */}
              <div className="space-y-4 lg:col-span-3 lg:space-y-6">
                {/* 배경 옵션 제목 */}
                <h2 className="text-center text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
                  Select Background
                </h2>

                {/* 배경 타입 선택 토글 */}
                <div className="mb-4 flex justify-center sm:mb-6">
                  <ToggleSwitch
                    options={[
                      { value: 'color', label: '단색' },
                      { value: 'prompt', label: 'AI 프롬프팅' },
                    ]}
                    value={backgroundType}
                    onChange={(value) => setBackgroundType(value as BackgroundType)}
                    name="backgroundType"
                  />
                </div>

                {/* 배경 설정 섹션 */}
                <div className="space-y-4">
                  {backgroundType === 'color' ? (
                    <div className="space-y-4">
                      {/* 색상 선택 팔레트 */}
                      <ColorPalette
                        selectedColor={selectedColor}
                        onColorSelect={setSelectedColor}
                      />

                      {/* 미리보기 영역 */}
                      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-center sm:p-4">
                        <div className="mb-2 text-sm text-gray-500 sm:text-base">
                          Preview
                        </div>
                        <div className="flex justify-center">
                          <Preview
                            cutCount={selectedPhotoUrls.length}
                            selectedPhotos={selectedPhotoUrls}
                            frameColor={frameColor}
                            backgroundColor={selectedColor}
                            currentPhotoIndex={currentEditIndex}
                            showPhotos={false}
                            className="max-w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* AI 프롬프팅 섹션 */
                    <div className="flex justify-center">
                      <div className="w-full max-w-lg lg:max-w-xl">
                        <PromptSection
                          promptText={promptText}
                          setPromptText={setPromptText}
                        />
                      </div>
                    </div>
                  )}

                  {/* 완료 버튼 */}
                  <div className="flex flex-col items-center justify-center space-y-3 pt-6">
                    {isLastPhoto ? (
                      <StartButton
                        onClick={handleComplete}
                        disabled={!canProceed}
                        className="w-full max-w-xs sm:w-54"
                      >
                        {isProcessing ? 'PROCESSING...' : '편집 완료'}
                      </StartButton>
                    ) : (
                      <StartButton
                        onClick={handleNext}
                        disabled={!canProceed}
                        className="w-full max-w-xs sm:w-54"
                      >
                        {isProcessing ? 'PROCESSING...' : 'NEXT'}
                      </StartButton>
                    )}

                    {/* 진행 상황 표시 */}
                    <p className="text-center text-xs text-gray-500 sm:text-sm">
                      <span className="hidden sm:inline">
                        {currentEditIndex + 1}번째 사진 / 총{' '}
                        {selectedPhotoUrls.length}컷
                      </span>
                      <span className="sm:hidden">
                        {currentEditIndex + 1}/{selectedPhotoUrls.length}
                      </span>
                    </p>

                    {/* 도움말 */}
                    {!canProceed && (
                      <div className="text-center text-xs text-red-500">
                        {isProcessing 
                          ? '배경을 처리하고 있습니다...'
                          : backgroundType === 'color' 
                          ? '색상을 선택해주세요' 
                          : '프롬프트를 입력해주세요'
                        }
                      </div>
                    )}
                  </div>
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
    </div>
  )
}