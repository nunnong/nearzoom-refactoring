'use client'

import { useState } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import FrameColorSelector from '@/components/page/groupcall/photo-select/FrameColorSelector'
import PhotoCutSelector from '@/components/page/groupcall/photo-select/PhotoCutSelector'
import PhotoPicker from '@/components/page/groupcall/photo-select/PhotoPicker'
import WebCam from '@/components/page/groupcall/photo-select/WebCam'
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
  onComplete = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: PhotoSelectPageProps) {
  // 상태 관리
  const [cutCount, setCutCount] = useState<number>(4)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [frameColor, setFrameColor] = useState<string>('#FFFFFF')

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

  const handleComplete = () => {
    if (selectedPhotos.length === cutCount) {
      onComplete({
        cutCount,
        selectedPhotos,
        frameColor,
      })
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
      <div className="flex flex-1 gap-4 bg-gray-100 px-8 py-6">
        {/* 왼쪽: 사진 선택 영역 */}
        <div className="flex-1 rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 text-center">
            <p className="text-sm font-bold text-gray-600">
              원하는 컷 수를 선택하고 사진을 골라주세요
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            {/* 컷 수 선택 */}
            <PhotoCutSelector cutCount={cutCount} onChange={setCutCount} />

            {/* 사진 선택 */}
            <PhotoPicker
              photos={capturedPhotos}
              cutCount={cutCount}
              selected={selectedPhotos}
              onSelect={setSelectedPhotos}
            />

            {/* 프레임 색상 선택 */}
            <FrameColorSelector
              frameColor={frameColor}
              onFrameColorChange={setFrameColor}
              palette={frameColors}
            />

            {/* 완료 버튼 */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleComplete}
                disabled={isCompleteDisabled}
                className={`rounded-lg px-8 py-3 text-lg font-semibold transition-all ${
                  isCompleteDisabled
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-[#2D3243] text-white shadow-lg hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95'
                }`}
              >
                선택 완료
              </button>
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