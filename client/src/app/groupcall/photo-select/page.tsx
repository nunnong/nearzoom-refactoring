'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useMemo } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import FrameColorSelector from '@/components/page/groupcall/photo-select/FrameColorSelector'
import PhotoPicker from '@/components/page/groupcall/photo-select/PhotoPicker'
import Preview from '@/components/page/groupcall/photo-select/Preview'
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

interface PhotoSelectPageProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  roomInfo?: RoomInfo
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
  onMicToggle = () => {},
  onCameraToggle = () => {},
  className,
}: PhotoSelectPageProps) {
  // 상태 관리
  const [cutCount, setCutCount] = useState<number>(4)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [frameColor, setFrameColor] = useState<string>('#FFFFFF')
  const [currentUserState, setCurrentUserState] = useState(currentUser)

  const router = useRouter()

  // useCallback으로 최적화된 핸들러들
  const handleMicToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isMicOn: !prev.isMicOn
    }))
    onMicToggle()
  }, [onMicToggle])

  const handleCameraToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isCameraOn: !prev.isCameraOn
    }))
    onCameraToggle()
  }, [onCameraToggle])

  const handleLeaveRoom = useCallback(() => {
    onLeaveRoom()
  }, [onLeaveRoom])


  // 더미 데이터
  const mockParticipants: Participant[] = useMemo(() => [
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
  ], [])

  const capturedPhotos = useMemo(() => [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
  ], [])

  const frameColors = useMemo(() => [
    '#FFFFFF',
    '#000000',
    '#929292',
    '#73c0ef',
    '#293e85',
    '#2D3243',
  ], [])

  const displayParticipants = useMemo(() => 
    participants.length > 0 ? participants : mockParticipants,
    [participants, mockParticipants]
  )

  // 컷수 변경 핸들러
  const handleCutCountChange = useCallback((value: string | number) => {
    setCutCount(Number(value))
    setSelectedPhotos([]) 
  }, [])

  // 완료 핸들러
  const handleComplete = useCallback(() => {
    if (selectedPhotos.length === cutCount) {
      const selections = {
        cutCount,
        selectedPhotos,
        frameColor
      }
      
      localStorage.setItem('photoSelectData', JSON.stringify(selections))
      onComplete(selections)
      router.push('/groupcall/background-select')
    }
  }, [selectedPhotos, cutCount, frameColor, onComplete, router])

  // 완료 버튼 비활성화 상태
  const isCompleteDisabled = useMemo(() => 
    selectedPhotos.length !== cutCount,
    [selectedPhotos.length, cutCount]
  )

  return (
    <div className={cn('flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50', className)}>
      {/* Header */}
      <Header
        roomInfo={roomInfo}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Zoom 스타일 웹캠 바 - 모바일에서만 표시 */}
      <div className="block md:hidden">
        <WebcamBar
          participants={displayParticipants}
          currentUser={currentUserState}
          position="bottom"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <main className={cn(
        'flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8',
      
        'pb-24 md:pb-4'
      )}>
        {/* 메인 영역 */}
        <section className="min-w-0 flex-1">
          <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-sm p-3 shadow-lg sm:p-4 lg:p-6">
            <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
              
              {/* 사진 선택과 프레임 선택 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8 xl:gap-12 mt-4 mb-8">
                
                {/* 왼쪽: 사진 선택 */}
                <div className="space-y-4 lg:col-span-3">
                  <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center sm:text-xl">
                    Select Photos
                  </h2>
                  
                  <div className="flex justify-center">
                    <ToggleSwitch
                      options={[
                        { value: 1, label: '1컷' },
                        { value: 2, label: '2컷' },
                        { value: 4, label: '4컷' },
                      ]}
                      value={cutCount}
                      onChange={handleCutCountChange} 
                    />
                  </div>
                  
                  <PhotoPicker
                    photos={capturedPhotos}
                    cutCount={cutCount}
                    selected={selectedPhotos}
                    onSelect={setSelectedPhotos}
                  />
                </div>

                {/* 오른쪽: 프레임 색상 + 미리보기 + 완료 버튼 */}
                <div className="space-y-4 lg:col-span-2 lg:space-y-6">
                  
                  <div className="space-y-3">
                    <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center sm:text-xl">
                      Frame Color
                    </h2>
                    <FrameColorSelector
                      frameColor={frameColor}
                      onFrameColorChange={setFrameColor}
                      palette={frameColors}
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-center sm:p-4">
                    <div className="mb-2 text-sm text-gray-500 sm:text-base">Preview</div>
                    <div className="flex justify-center">
                      <Preview
                        cutCount={cutCount}
                        selectedPhotos={selectedPhotos}
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
                      DONE
                    </StartButton>

                    {isCompleteDisabled && (
                      <p className="text-center text-xs text-gray-500 sm:text-base">
                        <span className="hidden sm:inline">
                          {cutCount}장의 사진을 모두 선택해주세요
                        </span>
                        <span className="sm:hidden">
                          {cutCount}장 선택 필요
                        </span>
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
    </div>
  )
}