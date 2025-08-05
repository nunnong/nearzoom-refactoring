'use client'

import Image from 'next/image'
import { useState } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
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
  selectedPhotos: string[] // 이전 단계에서 선택한 사진들
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
  selectedPhotos = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop',
  ],
  onComplete = () => {},
  onBack = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: BackgroundSelectPageProps) {
  // 상태 관리
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('color')
  const [selectedColor, setSelectedColor] = useState('#C8B5FF')
  const [promptText, setPromptText] = useState('')

  // 각 사진의 배경 설정 상태
  const [photoBackgrounds, setPhotoBackgrounds] = useState<PhotoBackground[]>(
    selectedPhotos.map((_, index) => ({
      photoIndex: index,
      backgroundType: 'color',
      backgroundValue: '#C8B5FF',
    }))
  )

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
  const currentPhoto = selectedPhotos[currentPhotoIndex]
  const currentBackground = photoBackgrounds[currentPhotoIndex]

  // 사진 이동 핸들러
  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      saveCurrentSettings()
      setCurrentPhotoIndex(currentPhotoIndex - 1)
      loadPhotoSettings(currentPhotoIndex - 1)
    }
  }

  const handleNextPhoto = () => {
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      saveCurrentSettings()
      setCurrentPhotoIndex(currentPhotoIndex + 1)
      loadPhotoSettings(currentPhotoIndex + 1)
    }
  }

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
      <div className="flex flex-1 gap-4 bg-gray-100 px-8 py-6">
        {/* 왼쪽: 배경 설정 영역 */}
        <div className="flex-1 rounded-lg bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* 제목 */}
            <div className="mb-4 text-center">
              <p className="text-sm font-bold text-gray-600">
                사진별 원하는 배경 옵션을 선택하세요
              </p>
            </div>

            {/* 배경 타입 선택 */}
            <div className="text-center">
              <div className="relative mx-auto flex w-64 flex-wrap rounded-lg bg-gray-200 p-0.5 text-sm shadow-sm">
                {[
                  { value: 'color', label: '단색' },
                  { value: 'prompt', label: 'AI 프롬프팅' },
                ].map(option => (
                  <label
                    key={option.value}
                    className="flex-1 cursor-pointer text-center"
                  >
                    <input
                      type="radio"
                      name="backgroundType"
                      checked={backgroundType === option.value}
                      onChange={() =>
                        setBackgroundType(option.value as BackgroundType)
                      }
                      className="hidden"
                    />
                    <span
                      className={`relative flex items-center justify-center rounded-md py-2 transition-all duration-150 ease-in-out ${
                        backgroundType === option.value
                          ? 'bg-white font-semibold text-slate-700 shadow-md'
                          : 'text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 현재 사진 표시 */}
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-lg font-bold text-gray-700">
                  {currentPhotoIndex + 1} / {selectedPhotos.length}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-8">
                {/* 이전 버튼 */}
                <button
                  onClick={handlePreviousPhoto}
                  disabled={currentPhotoIndex === 0}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    currentPhotoIndex === 0
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-[#2D3243] text-white hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95 shadow-lg'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* 현재 사진 */}
                <div className="relative">
                  <div className="relative overflow-hidden rounded-lg shadow-lg">
                    {/* 배경 미리보기 */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor:
                          currentBackground.backgroundType === 'color'
                            ? currentBackground.backgroundValue
                            : '#f3f4f6',
                      }}
                    />

                    {/* 프롬프트 배경인 경우 텍스트 표시 */}
                    {currentBackground.backgroundType === 'prompt' &&
                      currentBackground.backgroundValue && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 p-4 text-sm text-white">
                          <span className="line-clamp-4 text-center">
                            {currentBackground.backgroundValue}
                          </span>
                        </div>
                      )}

                    {/* 사진 */}
                    <Image
                      src={currentPhoto}
                      alt={`사진 ${currentPhotoIndex + 1}`}
                      width={288}
                      height={288}
                      className="relative z-10 object-cover mix-blend-multiply rounded-lg"
                      quality={95}
                      priority
                      unoptimized
                    />
                  </div>
                </div>

                {/* 다음 버튼 */}
                <button
                  onClick={handleNextPhoto}
                  disabled={currentPhotoIndex === selectedPhotos.length - 1}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    currentPhotoIndex === selectedPhotos.length - 1
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-[#2D3243] text-white hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95 shadow-lg'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 배경 설정 옵션 */}
            {backgroundType === 'color' ? (
              <div className="space-y-4">
                <h3 className="text-center text-lg font-semibold text-gray-700">
                  색상 선택
                </h3>
                <div className="flex justify-center">
                  <div className="grid grid-cols-5 gap-3 justify-items-center">
                    {backgroundColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${
                          selectedColor === color
                            ? 'border-[#2D3243] shadow-lg'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-center text-lg font-semibold text-gray-700">
                  프롬프트 입력
                </h3>
                <div className="flex justify-center">
                  <textarea
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    placeholder="원하는 배경을 설명해주세요..."
                    className="h-24 w-full max-w-md rounded-lg border border-gray-300 p-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 완료 버튼 */}
            <div className="flex justify-center pt-6">
              <div className="flex items-center gap-4">
                {/* 이전 버튼 */}
                <button
                  onClick={onBack}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 px-8 py-4 text-white transition-all duration-300 hover:from-gray-500 hover:to-gray-600 hover:scale-105 active:scale-95 shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-bold text-lg">이전</span>
                </button>

                {/* 선택 완료 버튼*/}
                <div className="w-48">
                  <StartButton onClick={handleComplete}>
                    선택 완료
                  </StartButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 사이드바 (참가자 웹캠) */}
        <div className="flex w-80 flex-col gap-6">
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