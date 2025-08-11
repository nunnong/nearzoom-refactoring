'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import PhotoNavigator from '@/components/page/groupcall/photo-select/PhotoNavigator'
import Preview from '@/components/page/groupcall/photo-select/Preview'
import PromptSection from '@/components/page/groupcall/photo-select/PromptSection'
import RoomExitModal from '@/components/page/groupcall/photo-select/RoomExitModal' 
import ToggleSwitch from '@/components/page/groupcall/photo-select/ToggleSwitch'
import Webcam from '@/components/page/groupcall/photo-select/WebCam'
import WebcamBar from '@/components/page/groupcall/photo-select/WebcamBar'
import StartButton from '@/components/page/groupcall/StartButton'
import { cn } from '@/lib/utils'

// 타입 정의
interface Participant {
  id: string
  email: string
  name?: string
  avatar?: string
  isHost: boolean
  isMicOn: boolean
  isCameraOn: boolean
  isConnected: boolean
}

interface CurrentUser {
  id: string
  email: string
  name?: string
  avatar?: string
  isMicOn: boolean
  isCameraOn: boolean
  isHost: boolean
}

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

// 배경 선택 타입
type BackgroundType = 'color' | 'prompt'

// 개별 사진의 배경 설정
interface PhotoBackground {
  photoIndex: number
  backgroundType: BackgroundType
  backgroundValue: string
}

interface BackgroundSelectPageProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  roomInfo?: RoomInfo
  onComplete?: (backgrounds: PhotoBackground[]) => void
  onBack?: () => void
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
  onMicToggle?: () => void
  onCameraToggle?: () => void
  className?: string
}

export default function BackgroundSelectPage({
  participants = [],
  currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
    isHost: true,
  },
  roomInfo = {
    id: 'a605',
    url: 'ssafynearzoom.store/a605',
    title: 'SSAFY 13기 A605팀 4컷 촬영',
    createdAt: 'July 24th, 2024 14:39 PM',
  },
  onComplete = () => {},
  onLeaveRoom = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: BackgroundSelectPageProps) {
  // localStorage에서 데이터 가져오기
  const [photoData, setPhotoData] = useState<any>(null)
  const [currentUserState, setCurrentUserState] = useState(currentUser)
  
  // 모달 상태 추가
  const [showExitModal, setShowExitModal] = useState(false)

  // 상태 관리
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('color')
  const [selectedColor, setSelectedColor] = useState('#C8B5FF')
  const [promptText, setPromptText] = useState('')

  // 각 사진의 배경 설정 상태
  const [photoBackgrounds, setPhotoBackgrounds] = useState<PhotoBackground[]>(
    []
  )

  // useCallback으로 최적화된 핸들러들
  const handleMicToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isMicOn: !prev.isMicOn,
    }))
    onMicToggle()
  }, [onMicToggle])

  const handleCameraToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isCameraOn: !prev.isCameraOn,
    }))
    onCameraToggle()
  }, [onCameraToggle])

  const handleLeaveRoom = useCallback(() => {
    onLeaveRoom()
  }, [onLeaveRoom])

  // 더미 데이터 최적화
  const mockParticipants: Participant[] = useMemo(
    () => [
      {
        id: '2',
        name: '박싸피',
        email: 'park.4@gmail.com',
        isHost: false,
        isMicOn: true,
        isCameraOn: true,
        isConnected: true,
      },
      {
        id: '3',
        name: '이싸피',
        email: 'lee.3@kakao.com',
        isHost: false,
        isMicOn: false,
        isCameraOn: true,
        isConnected: true,
      },
      {
        id: '4',
        name: '최싸피',
        email: 'choi.2@kakao.com',
        isHost: false,
        isMicOn: true,
        isCameraOn: false,
        isConnected: true,
      },
    ],
    []
  )

  // 배경 색상 팔레트
  const backgroundColors = useMemo(
    () => [
      '#C8B5FF',
      '#E8E8FF',
      '#B5E8E8',
      '#B5C8FF',
      '#B5FFB5',
      '#FFFAB5',
      '#FFFFFF',
      '#FFE8B5',
      '#FFB5E8',
      '#F0F0F0',
    ],
    []
  )

  const displayParticipants = useMemo(
    () => (participants.length > 0 ? participants : mockParticipants),
    [participants, mockParticipants]
  )

  useEffect(() => {
    const data = localStorage.getItem('photoSelectData')
    if (data) {
      const parsedData = JSON.parse(data)
      setPhotoData(parsedData)

      // photoBackgrounds 초기화
      setPhotoBackgrounds(
        Array.from(
          { length: parsedData.selectedPhotos.length },
          (_, index) => ({
            photoIndex: index,
            backgroundType: 'color' as BackgroundType,
            backgroundValue: '#C8B5FF',
          })
        )
      )
    }
  }, [])

  // 현재 설정 저장
  const saveCurrentSettings = useCallback(() => {
    const backgroundValue =
      backgroundType === 'color' ? selectedColor : promptText
    setPhotoBackgrounds(prev => {
      const newBackgrounds = [...prev]
      newBackgrounds[currentPhotoIndex] = {
        photoIndex: currentPhotoIndex,
        backgroundType,
        backgroundValue,
      }
      return newBackgrounds
    })
  }, [currentPhotoIndex, backgroundType, selectedColor, promptText])

  // 특정 사진의 설정 로드
  const loadPhotoSettings = useCallback(
    (photoIndex: number) => {
      const background = photoBackgrounds[photoIndex]
      if (background) {
        setBackgroundType(background.backgroundType)
        if (background.backgroundType === 'color') {
          setSelectedColor(background.backgroundValue)
          setPromptText('')
        } else {
          setPromptText(background.backgroundValue)
          setSelectedColor('#C8B5FF')
        }
      }
    },
    [photoBackgrounds]
  )

  // 다음 사진으로 이동
  const handleNextPhoto = useCallback(() => {
    saveCurrentSettings()
    if (photoData && currentPhotoIndex < photoData.selectedPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1
      setCurrentPhotoIndex(nextIndex)
      loadPhotoSettings(nextIndex)
    }
  }, [saveCurrentSettings, photoData, currentPhotoIndex, loadPhotoSettings])

  // 완료 핸들러 - 모달 표시하도록 수정
  const handleComplete = useCallback(() => {
    saveCurrentSettings()
    // 배경 선택 완료 후 모달 표시
    setShowExitModal(true)
    // 기존 onComplete도 호출
    onComplete(photoBackgrounds)
  }, [saveCurrentSettings, photoBackgrounds, onComplete])

  // 실제 방 종료 핸들러
  const handleExitRoom = useCallback(() => {
    // 여기에 실제 방 종료 로직 추가
    console.log('방을 종료합니다...')
    handleLeaveRoom()
  }, [handleLeaveRoom])

  // 로딩 중이면 로딩 화면 표시
  if (!photoData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const { selectedPhotos, frameColor } = photoData

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
        className
      )}
    >
      {/* Header */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      <div className="block md:hidden">
        <WebcamBar
          participants={displayParticipants}
          currentUser={currentUserState}
          position="bottom"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <main
        className={cn(
          'flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8',
          // 모바일에서 웹캠 바 공간 확보
          'pb-24 md:pb-4'
        )}
      >
        {/* 메인 영역 */}
        <section className="min-w-0 flex-1">
          <div className="rounded-2xl border border-white/20 bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:p-4 lg:p-6">
            <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
              {/* 배경 설정과 옵션 선택  */}
              <div className="mt-4 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8 xl:gap-12">
                {/* 왼쪽: 사진 네비게이터 */}
                <div className="space-y-4 lg:col-span-2">
                  <h2 className="text-center text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl lg:hidden">
                    Photo Navigator
                  </h2>
                  <PhotoNavigator
                    photos={selectedPhotos}
                    currentIndex={currentPhotoIndex}
                  />
                  {/* 모바일에서 현재 사진 정보 */}
                  <div className="text-center text-sm text-gray-600 lg:hidden">
                    {currentPhotoIndex + 1} / {selectedPhotos.length}
                  </div>
                </div>

                {/* 오른쪽: 배경 옵션 + 미리보기 + 완료 버튼 - 반응형 개선 */}
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
                      onChange={value =>
                        setBackgroundType(value as BackgroundType)
                      }
                      name="backgroundType"
                    />
                  </div>

                  {/* AI 프롬프팅 섹션*/}
                  <div className="space-y-4">
                    {backgroundType === 'color' ? (
                      <div className="space-y-4">
                        {/* 색상 선택 팔레트 - 반응형 그리드 */}
                        <div className="flex justify-center">
                          <div className="grid grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                            {backgroundColors.map(color => (
                              <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={cn(
                                  'h-6 w-6 rounded-lg border-2 transition-all hover:scale-110 sm:h-6 sm:w-6 lg:h-8 lg:w-8',
                                  selectedColor === color
                                    ? 'scale-110 border-[#2D3243] shadow-lg'
                                    : 'border-gray-300 hover:border-gray-400'
                                )}
                                style={{ backgroundColor: color }}
                                aria-label={`배경색 ${color} 선택`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 미리보기 영역 */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-center sm:p-4">
                          <div className="mb-2 text-sm text-gray-500 sm:text-base">
                            Preview
                          </div>
                          <div className="flex justify-center">
                            <Preview
                              cutCount={selectedPhotos.length}
                              selectedPhotos={selectedPhotos}
                              frameColor={frameColor}
                              backgroundColor={selectedColor}
                              currentPhotoIndex={currentPhotoIndex}
                              showPhotos={false}
                              className="max-w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* AI 프롬프팅 섹션  */
                      <div className="flex justify-center">
                        <div className="w-full max-w-lg lg:max-w-xl">
                          <PromptSection
                            promptText={promptText}
                            setPromptText={setPromptText}
                          />
                        </div>
                      </div>
                    )}

                    {/* 완료 버튼  */}
                    <div className="flex flex-col items-center justify-center space-y-3 pt-6">
                      {currentPhotoIndex < selectedPhotos.length - 1 ? (
                        <StartButton
                          onClick={handleNextPhoto}
                          className="w-full max-w-xs sm:w-54"
                        >
                          NEXT
                        </StartButton>
                      ) : (
                        <StartButton
                          onClick={handleComplete}
                          className="w-full max-w-xs sm:w-54"
                        >
                          DONE
                        </StartButton>
                      )}

                      {/* 진행 상황 표시 */}
                      <p className="text-center text-xs text-gray-500 sm:text-sm">
                        <span className="hidden sm:inline">
                          {currentPhotoIndex + 1}번째 사진 / 총{' '}
                          {selectedPhotos.length}컷
                        </span>
                        <span className="sm:hidden">
                          {currentPhotoIndex + 1}/{selectedPhotos.length}
                        </span>
                      </p>
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
            {/* 기존 Webcam 컴포넌트 사용 - VideoTile로 세로 나열 */}
            <Webcam
              participants={displayParticipants}
              currentUser={currentUserState}
            />

            {/* 컨트롤 패널 */}
            <ControlPanel
              currentUser={currentUserState}
              onMicToggle={handleMicToggle}
              onCameraToggle={handleCameraToggle}
              onLeaveRoom={handleLeaveRoom}
              showLeaveButton={true}
            />
          </div>
        </aside>
      </main>

      {/* RoomExitModal */}
      <RoomExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onExitRoom={handleExitRoom}
      />
    </div>
  )
}