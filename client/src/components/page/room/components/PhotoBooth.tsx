'use client'

import Header from './Header'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../stores/photoboothStore'
import WaitingComponent from './waiting/WaitingComponent'
import PhotoshootComponent from './photoshoot/PhotoshootComponent'
import PhotoSelectComponent from './photo-select/PhotoSelectComponent'

export default function PhotoBooth() {
  const { photoBoothState, nextPhotoBoothState, setPhotoBoothState } =
    usePhotoBoothStore(state => state)

  // 공통 룸 정보
  const roomInfo = {
    id: 'a605',
    url: 'ssafynearzoom.store/a605',
    title: 'SSAFY 13기 A605팀 포토부스',
    createdAt: new Date().toLocaleString(),
  }

  const currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
    isHost: true,
  }

  const handleStartCall = () => {
    if (photoBoothState === PhotoBoothState.WAITING) {
      nextPhotoBoothState()
    }
  }

  const handleCompletePhotoshoot = () => {
    if (photoBoothState === PhotoBoothState.SHOOTING) {
      nextPhotoBoothState()
    }
  }

  const handleCompletePhotoSelect = () => {
    if (photoBoothState === PhotoBoothState.SELECTING) {
      // 다시 대기 상태로 돌아감
      setPhotoBoothState(PhotoBoothState.WAITING)
    }
  }

  const handleLeaveRoom = () => {
    // 방 나가기 로직
    console.log('방 나가기')
  }

  const handleCopyRoomUrl = () => {
    // URL 복사 로직
    navigator.clipboard.writeText(roomInfo.url)
  }

  const handleMicToggle = () => {
    // 마이크 토글 로직
    console.log('마이크 토글')
  }

  const handleCameraToggle = () => {
    // 카메라 토글 로직
    console.log('카메라 토글')
  }

  const renderCurrentState = () => {
    switch (photoBoothState) {
      case PhotoBoothState.WAITING:
        return (
          <WaitingComponent
            currentUser={currentUser}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onStartCall={handleStartCall}
            onLeaveRoom={handleLeaveRoom}
          />
        )

      case PhotoBoothState.SHOOTING:
        return (
          <PhotoshootComponent
            currentUser={currentUser}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onLeaveRoom={handleLeaveRoom}
            onComplete={handleCompletePhotoshoot}
          />
        )

      case PhotoBoothState.SELECTING:
        return (
          <PhotoSelectComponent
            currentUser={currentUser}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onLeaveRoom={handleLeaveRoom}
            onComplete={handleCompletePhotoSelect}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#C9D76D] text-[#2D3243]">
      {/* 공통 Header */}
      <Header
        roomInfo={roomInfo}
        onLeaveRoom={handleLeaveRoom}
        onCopyRoomUrl={handleCopyRoomUrl}
      />

      {/* 상태별 컴포넌트 렌더링 */}
      {renderCurrentState()}

      {/* 개발용 상태 전환 버튼 */}
      <div className="fixed right-4 bottom-4 z-50 flex gap-2">
        <button
          onClick={() => setPhotoBoothState(PhotoBoothState.WAITING)}
          className={`rounded-lg px-4 py-2 font-semibold text-white ${
            photoBoothState === PhotoBoothState.WAITING
              ? 'bg-blue-600'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          대기
        </button>
        <button
          onClick={() => setPhotoBoothState(PhotoBoothState.SHOOTING)}
          className={`rounded-lg px-4 py-2 font-semibold text-white ${
            photoBoothState === PhotoBoothState.SHOOTING
              ? 'bg-green-600'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          촬영
        </button>
        <button
          onClick={() => setPhotoBoothState(PhotoBoothState.SELECTING)}
          className={`rounded-lg px-4 py-2 font-semibold text-white ${
            photoBoothState === PhotoBoothState.SELECTING
              ? 'bg-purple-600'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          선택
        </button>
      </div>
    </div>
  )
}
