'use client'

import { useState, useEffect } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import PhotoNavigator from '@/components/page/groupcall/photo-select/PhotoNavigator'
import Preview from '@/components/page/groupcall/photo-select/Preview'
import PromptSection from '@/components/page/groupcall/photo-select/PromptSection'
import ToggleSwitch from '@/components/page/groupcall/photo-select/ToggleSwitch'
import WebCam from '@/components/page/groupcall/photo-select/WebCam'
import StartButton from '@/components/page/groupcall/StartButton'
import { cn } from '@/lib/utils'

// 배경 선택 타입
type BackgroundType = 'color' | 'prompt'

// 개별 사진의 배경 설정
interface PhotoBackground {
  photoIndex: number
  backgroundType: BackgroundType
  backgroundValue: string
}

// 배경 선택 페이지 컴포넌트
interface BackgroundSelectPageProps {
  participants?: any[]
  currentUser?: any
  roomInfo?: any
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
  onCopyRoomUrl = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: BackgroundSelectPageProps) {
  // localStorage에서 데이터 가져오기
  const [photoData, setPhotoData] = useState<any>(null)
  // 상태 관리
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('color')
  const [selectedColor, setSelectedColor] = useState('#C8B5FF')
  const [promptText, setPromptText] = useState('')

  // 각 사진의 배경 설정 상태
  const [photoBackgrounds, setPhotoBackgrounds] = useState<PhotoBackground[]>(
    []
  )

  useEffect(() => {
    const data = localStorage.getItem('photoSelectData')
    if (data) {
      const parsedData = JSON.parse(data)
      setPhotoData(parsedData)

      // photoBackgrounds 초기화 - parsedData 사용
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

  // 로딩 중이면 로딩 화면 표시
  if (!photoData) return <div>Loading...</div>

  // localStorage에서 가져온 데이터
  const { selectedPhotos, frameColor } = photoData

  // 더미 데이터
  const mockParticipants = [
    {
      id: '1',
      name: '김싸피',
      email: 'ssafy123.5@gmail.com',
      isHost: true,
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    },
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
  ]

  // 배경 색상 팔레트
  const backgroundColors = [
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
  ]

  const displayParticipants =
    participants.length > 0 ? participants : mockParticipants

  // 현재 설정 저장
  const saveCurrentSettings = () => {
    const backgroundValue =
      backgroundType === 'color' ? selectedColor : promptText
    const newBackgrounds = [...photoBackgrounds]
    newBackgrounds[currentPhotoIndex] = {
      photoIndex: currentPhotoIndex,
      backgroundType,
      backgroundValue,
    }
    setPhotoBackgrounds(newBackgrounds)
  }

  // 특정 사진의 설정 로드
  const loadPhotoSettings = (photoIndex: number) => {
    const background = photoBackgrounds[photoIndex]
    setBackgroundType(background.backgroundType)
    if (background.backgroundType === 'color') {
      setSelectedColor(background.backgroundValue)
      setPromptText('')
    } else {
      setPromptText(background.backgroundValue)
      setSelectedColor('#C8B5FF')
    }
  }

  // 다음 사진으로 이동 (선택 완료 후)
  const handleNextPhoto = () => {
    saveCurrentSettings()
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1
      setCurrentPhotoIndex(nextIndex)
      loadPhotoSettings(nextIndex)
    }
  }

  // 완료 핸들러
  const handleComplete = () => {
    saveCurrentSettings() // 마지막 설정도 저장
    onComplete(photoBackgrounds)
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-[#F5F6EF]', className)}>
      {/* Header */}
      <Header
        roomInfo={roomInfo}
        onLeaveRoom={onLeaveRoom}
        onCopyRoomUrl={onCopyRoomUrl}
      />

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 gap-4 bg-[#2d3243] px-8 py-6">
        <div className="mb-4 flex-1 rounded-2xl bg-white/90 p-6 shadow-sm">
          <div className="mx-auto mt-7 mb-10 max-w-6xl space-y-8">
            {/* 제목 */}
            <div className="text-center">
              {/* <p className="text-sm font-bold text-gray-600">
                사진별 원하는 배경 옵션을 선택하세요
              </p> */}
            </div>

            {/* 배경 설정과 옵션 선택 - 좌우 배치 */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
              {/* 왼쪽: 사진 네비게이터 */}
              <div className="space-y-4 lg:col-span-2">
                {/* PhotoNavigator */}
                <PhotoNavigator
                  photos={selectedPhotos}
                  currentIndex={currentPhotoIndex}
                />
              </div>

              {/* 오른쪽: 배경 옵션 + 미리보기 + 완료 버튼 */}
              <div className="space-y-4 lg:col-span-3">
                {/* 배경 옵션 제목 */}
                <h2 className="text-center text-lg font-extrabold tracking-tight text-gray-900">
                  Select Background
                </h2>

                {/* 배경 타입 선택 토글 */}
                <div className="flex justify-center mb-6">
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

                {/* 배경 설정 옵션 */}
                <div>
                  {backgroundType === 'color' ? (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <div className="grid grid-cols-5 justify-items-center gap-6 mb-4 mt-3">
                          {backgroundColors.map(color => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`h-8 w-8 rounded-lg border-2 transition-all hover:scale-110 ${
                                selectedColor === color
                                  ? 'border-[#2D3243] shadow-lg'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      {/* 미리보기 영역 */}
                      <div className="rounded-lg border-gray-300 p-1 text-center">
                        <div className="mb-4 text-sm text-gray-500">
                          preview
                        </div>
                        <Preview
                          cutCount={selectedPhotos.length}
                          selectedPhotos={selectedPhotos}
                          frameColor={frameColor}
                          backgroundColor={
                            backgroundType === 'color'
                              ? selectedColor
                              : undefined
                          }
                          currentPhotoIndex={currentPhotoIndex}
                          showPhotos={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <PromptSection
                        promptText={promptText}
                        setPromptText={setPromptText}
                      />
                    </div>
                  )}
                </div>

                {/* 완료 버튼 */}
                <div className="flex flex-col items-center justify-center pt-2">
                  {currentPhotoIndex < selectedPhotos.length - 1 ? (
                    <StartButton onClick={handleNextPhoto} className="w-54">
                      다음 사진으로
                    </StartButton>
                  ) : (
                    <StartButton onClick={handleComplete} className="w-54">
                      선택 완료
                    </StartButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 사이드바 (참가자 웹캠) */}
        <div className="flex w-80 flex-col gap-4">
          <WebCam
            participants={displayParticipants}
            currentUser={currentUser}
          />
          <ControlPanel
            currentUser={currentUser}
            onMicToggle={onMicToggle}
            onCameraToggle={onCameraToggle}
            onLeaveRoom={onLeaveRoom}
            showLeaveButton={true}
          />
        </div>
      </div>
    </div>
  )
}
