'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import FrameColorSelector from '@/components/page/groupcall/photo-select/FrameColorSelector'
import PhotoPicker from '@/components/page/groupcall/photo-select/PhotoPicker'
import Preview from '@/components/page/groupcall/photo-select/Preview'
import ToggleSwitch from '@/components/page/groupcall/photo-select/ToggleSwitch'
import WebCam from '@/components/page/groupcall/photo-select/WebCam'
import StartButton from '@/components/page/groupcall/StartButton'
import { cn } from '@/lib/utils'


// 메인 페이지 컴포넌트
interface PhotoSelectPageProps {
  participants?: any[]
  currentUser?: any
  roomInfo?: any
  onComplete?: (selections: {
    cutCount: number
    selectedPhotos: string[]
    frameColor: string
  }) => void
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
  onMicToggle?: () => void
  onCameraToggle?: () => void
  className?: string
}

export default function PhotoSelectPage({
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
  // onComplete = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: PhotoSelectPageProps) {

  const [cutCount, setCutCount] = useState<number>(4)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [frameColor, setFrameColor] = useState<string>('#FFFFFF')

  const router = useRouter()

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

  // 더미 사진 데이터 (실제로는 촬영된 4컷 이미지)
  const capturedPhotos = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
  ]

  const frameColors = [
    '#FFFFFF',
    '#000000',
    '#929292',
    '#73c0ef',
    '#293e85',
    '#2D3243',
  ]

  const displayParticipants =
    participants.length > 0 ? participants : mockParticipants

  // 컷수 변경 시 선택된 사진 초기화
  const handleCutCountChange = (value: string | number) => {
    setCutCount(Number(value))
    setSelectedPhotos([]) 
  }

  const handleComplete = () => {
  if (selectedPhotos.length === cutCount) {
    localStorage.setItem('photoSelectData', JSON.stringify({
      cutCount,
      selectedPhotos,
      frameColor
    }))
    router.push('/groupcall/background-select')
  }
}


  const isCompleteDisabled = selectedPhotos.length !== cutCount


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
        <div className="flex-1 rounded-2xl bg-white/90 p-6 shadow-sm mb-6">
          <div className="mx-auto max-w-6xl space-y-8 mt-7 mb-10">

            {/* 사진 선택과 프레임 선택 - 좌우 배치 */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
              {/* 왼쪽: 사진 선택 */}
              <div className="space-y-4 lg:col-span-3">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center">
                      Select Photos
               </h2>
                <ToggleSwitch
                  options={[
                    { value: 1, label: '1컷' },
                    { value: 2, label: '2컷' },
                    { value: 4, label: '4컷' },
                  ]}
                  value={cutCount}
                  onChange={handleCutCountChange} 
                />
                <PhotoPicker
                  photos={capturedPhotos}
                  cutCount={cutCount}
                  selected={selectedPhotos}
                  onSelect={setSelectedPhotos}
                />
              </div>

              {/* 오른쪽: 프레임 색상 + 미리보기 + 완료 버튼 */}
              <div className="space-y-6 lg:col-span-2">
                {/* 프레임 색상 선택 */}
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center mb-6">
                      Frame Color
               </h2>
                <div>
                  <FrameColorSelector
                    frameColor={frameColor}
                    onFrameColorChange={setFrameColor}
                    palette={frameColors}
                  />
                </div>

                {/* 🔥 수정된 미리보기 영역 */}
                <div className="rounded-lg border-gray-300 p-1 text-center">
                  <div className="mb-2 text-sm text-gray-500">preview</div>
                  <Preview
                    cutCount={cutCount}
                    selectedPhotos={selectedPhotos}
                    frameColor={frameColor}
                  />
                </div>

                {/* 완료 버튼 */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <StartButton
                    onClick={handleComplete}
                    disabled={isCompleteDisabled}
                    className="w-54"
                  >
                    선택 완료
                  </StartButton>

                  {isCompleteDisabled && (
                    <p className="mt-3 text-center text-sm text-gray-500">
                      {cutCount}장의 사진을 모두 선택해주세요
                    </p>
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