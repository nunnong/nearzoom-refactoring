'use client'

import { cn } from '@/lib/utils'
import { useLocalParticipant, useRoomContext } from '@livekit/components-react'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { useState } from 'react'

interface PhotoShootControlPanelProps {
  showLeaveButton?: boolean
}

export default function PhotoShootControlPanel({
  showLeaveButton = true
}: PhotoShootControlPanelProps) {
  const localParticipant = useLocalParticipant()
  const room = useRoomContext()
  
  // PhotoBooth 관련 상태
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const setFrameColor = usePhotoBoothStore(state => state.setFrameColor)
  const frameVisible = usePhotoBoothStore(state => state.frameVisible)
  const setFrameVisible = usePhotoBoothStore(state => state.setFrameVisible)
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)
  const canvasSize = usePhotoBoothStore(state => state.canvasSize)
  const setCanvasSize = usePhotoBoothStore(state => state.setCanvasSize)

  const handleMicToggle = () => {
    localParticipant.localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)
  }

  const handleCameraToggle = () => {
    localParticipant.localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)
  }

  const handleLeaveRoom = () => {
    if (room) {
      room.disconnect()
    }
  }

  // 프레임 색상 옵션들
  const frameColors = [
    { name: '화이트', color: '#FFFFFF' },
    { name: '블랙', color: '#000000' },
    { name: '골드', color: '#FFD700' },
    { name: '실버', color: '#C0C0C0' },
    { name: '로즈골드', color: '#E8B4A0' },
    { name: '퍼플', color: '#8B5CF6' },
    { name: '핑크', color: '#EC4899' },
    { name: '블루', color: '#3B82F6' },
  ]

  // 캔버스 크기 입력 상태
  const [inputWidth, setInputWidth] = useState(512)
  const [inputHeight, setInputHeight] = useState(512)
  const [sizeError, setSizeError] = useState('')

  // Accordion 상태
  const [accordionState, setAccordionState] = useState({
    frameSettings: false,
    canvasSize: false,
    photoBoothStatus: true, // 기본적으로 열림
  })

  const toggleAccordion = (section: keyof typeof accordionState) => {
    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const buttonBaseClasses =
    'flex items-center justify-center rounded-full transition-all duration-200 shadow-lg hover:scale-105 backdrop-blur-sm h-11 w-11'

  return (
    <div className="space-y-4">
      {/* PhotoBooth 설정 패널 - Accordion */}
      <div className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
        <h4 className="mb-3 text-sm font-semibold text-gray-800">📸 촬영 설정</h4>
        
        {/* PhotoBooth 상태 - Accordion */}
        <div className="mb-3 border-b border-gray-200">
          <button
            onClick={() => toggleAccordion('photoBoothStatus')}
            className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-700 hover:text-purple-600"
          >
            <span>📊 촬영 상태</span>
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                accordionState.photoBoothStatus ? 'rotate-180' : ''
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {accordionState.photoBoothStatus && (
            <div className="pb-3">
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-3 w-3 rounded-full',
                    photoBoothState === 'WAITING' ? 'bg-gray-400' :
                    photoBoothState === 'SHOOTING' ? 'bg-red-500 animate-pulse' :
                    'bg-green-500'
                  )} />
                  <span className="text-sm font-medium text-gray-700">
                    {photoBoothState === 'WAITING' && '대기 중'}
                    {photoBoothState === 'SHOOTING' && '촬영 중'}
                    {photoBoothState === 'SELECTING' && '사진 선택'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 프레임 설정 - Accordion */}
        <div className="mb-3 border-b border-gray-200">
          <button
            onClick={() => toggleAccordion('frameSettings')}
            className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-700 hover:text-purple-600"
          >
            <span>🖼️ 프레임 설정</span>
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                accordionState.frameSettings ? 'rotate-180' : ''
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {accordionState.frameSettings && (
            <div className="pb-3">
              {/* 프레임 표시 토글 */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">프레임 표시</span>
                <button
                  onClick={() => setFrameVisible(!frameVisible)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    frameVisible ? 'bg-purple-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      frameVisible ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* 프레임 색상 선택 */}
              {frameVisible && (
                <div>
                  <span className="mb-2 block text-sm text-gray-700">프레임 색상</span>
                  <div className="grid grid-cols-4 gap-2">
                    {frameColors.map((option) => (
                      <button
                        key={option.color}
                        onClick={() => setFrameColor(option.color)}
                        className={cn(
                          'h-8 w-8 rounded-full border-2 transition-all hover:scale-110',
                          frameColor === option.color
                            ? 'border-purple-600 ring-2 ring-purple-300'
                            : 'border-gray-300 hover:border-gray-400'
                        )}
                        style={{ backgroundColor: option.color }}
                        title={option.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 캔버스 크기 - Accordion */}
        <div className="mb-3">
          <button
            onClick={() => toggleAccordion('canvasSize')}
            className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-700 hover:text-purple-600"
          >
            <span>📐 캔버스 크기</span>
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                accordionState.canvasSize ? 'rotate-180' : ''
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {accordionState.canvasSize && (
            <div className="pb-3">
              {/* 입력 필드들 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">너비</label>
                  <input
                    type="number"
                    min="100"
                    max="1200"
                    value={inputWidth}
                    onChange={(e) => {
                      setInputWidth(Number(e.target.value))
                      setSizeError('')
                    }}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="512"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">높이</label>
                  <input
                    type="number"
                    min="100"
                    max="1200"
                    value={inputHeight}
                    onChange={(e) => {
                      setInputHeight(Number(e.target.value))
                      setSizeError('')
                    }}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="512"
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {sizeError && (
                <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-2 py-1">
                  <span className="text-xs text-red-600">{sizeError}</span>
                </div>
              )}

              {/* 적용 버튼 */}
              <button
                onClick={() => {
                  // 유효성 검사
                  if (inputWidth < 100 || inputWidth > 1200) {
                    setSizeError('너비는 100-1200px 사이여야 합니다')
                    return
                  }
                  if (inputHeight < 100 || inputHeight > 1200) {
                    setSizeError('높이는 100-1200px 사이여야 합니다')
                    return
                  }
                  
                  // 크기 적용
                  setCanvasSize({ width: inputWidth, height: inputHeight })
                  setSizeError('')
                }}
                disabled={
                  inputWidth < 100 || inputWidth > 1200 || 
                  inputHeight < 100 || inputHeight > 1200
                }
                className={cn(
                  'w-full rounded-md px-3 py-2 text-sm font-medium transition-all',
                  inputWidth >= 100 && inputWidth <= 1200 && inputHeight >= 100 && inputHeight <= 1200
                    ? 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                크기 적용
              </button>
              
              {/* 현재 크기 표시 */}
              <div className="mt-2 rounded-md bg-gray-100 px-2 py-1 text-center">
                <span className="text-xs text-gray-600">
                  현재: {canvasSize.width}×{canvasSize.height}px
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 기본 컨트롤 패널 */}
      <div className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
        <h4 className="mb-3 text-sm font-semibold text-gray-800">🎮 컨트롤</h4>
        
        {/* 컨트롤 버튼들 */}
        <div className="flex justify-center gap-4">
          {/* 마이크 버튼 */}
          <button
            onClick={handleMicToggle}
            className={cn(
              buttonBaseClasses,
              localParticipant.isMicrophoneEnabled
                ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 shadow-purple-200/30 hover:shadow-purple-300/40 hover:from-purple-100 hover:to-purple-200'
                : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/40 hover:from-red-400 hover:to-red-500'
            )}
            title={localParticipant.isMicrophoneEnabled ? '마이크 끄기' : '마이크 켜기'}
          >
            <svg
              className="h-6 w-6 stroke-current"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.3}
              viewBox="0 0 24 24"
            >
              {localParticipant.isMicrophoneEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              ) : (
                <>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </>
              )}
            </svg>
          </button>

          {/* 카메라 버튼 */}
          <button
            onClick={handleCameraToggle}
            className={cn(
              buttonBaseClasses,
              localParticipant.isCameraEnabled
                ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 shadow-purple-300/30 hover:shadow-purple-300/40 hover:from-purple-100 hover:to-purple-200'
                : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/40 hover:from-red-400 hover:to-red-500'
            )}
            title={localParticipant.isCameraEnabled ? '카메라 끄기' : '카메라 켜기'}
          >
            <svg
              className="h-6 w-6 stroke-current"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.3}
              viewBox="0 0 24 24"
            >
              {localParticipant.isCameraEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              ) : (
                <>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
          </button>

          {/* 종료 버튼 */}
          {showLeaveButton && (
            <button
              onClick={handleLeaveRoom}
              className={cn(
                buttonBaseClasses,
                'bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow-gray-600/30 hover:shadow-gray-600/40 hover:from-gray-500 hover:to-gray-600'
              )}
              title="통화 종료"
            >
              <svg
                className="h-6 w-6 stroke-current"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.3}
                viewBox="0 0 24 24"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}