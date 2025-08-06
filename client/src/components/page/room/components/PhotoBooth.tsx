'use client'

import Header from './Header'
import WaitingComponent from './waiting/WaitingComponent'
import PhotoshootComponent from './photoshoot/PhotoshootComponent'
import CursorOverlay from './CursorOverlay'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../stores/photoboothStore'
import { useRoomInfo } from '@livekit/components-react'
import { useEffect } from 'react'

interface PhotoBoothProps {}

export default function PhotoBooth({}: PhotoBoothProps = {}) {
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)

  const { name, metadata } = useRoomInfo()

  useEffect(() => {
    console.log('Room name:', name)
    console.log('Room metadata:', metadata)
  }, [name, metadata])

  const renderCurrentComponent = () => {
    switch (photoBoothState) {
      case PhotoBoothState.WAITING:
        return <WaitingComponent />
      case PhotoBoothState.SHOOTING:
        return <PhotoshootComponent />
      default:
        return <WaitingComponent />
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#C9D76D] text-[#2D3243]">
      {/* 공통 Header */}
      <Header />

      {/* 상태에 따른 컴포넌트 렌더링 */}
      {renderCurrentComponent()}

      {/* 커서 오버레이 */}
      <CursorOverlay />
    </div>
  )
}
