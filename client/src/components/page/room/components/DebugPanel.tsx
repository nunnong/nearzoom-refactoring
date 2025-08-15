'use client'

import { useState } from 'react'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../stores/photobooth'

interface DebugPanelProps {
  className?: string
}

export default function DebugPanel({ className = '' }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // PhotoBooth store 상태들
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const selectedPhotos = usePhotoBoothStore(state => state.selectedPhotos)
  const capturedImages = usePhotoBoothStore(state => state.capturedImages)

  // Room leader 상태들
  const isRoomLeader = usePhotoBoothStore(state => state.isRoomLeader)
  const roomLeader = usePhotoBoothStore(state => state.roomLeader)
  const roomName = usePhotoBoothStore(state => state.roomName)

  // Actions
  const setPhotoBoothState = usePhotoBoothStore(
    state => state.setPhotoBoothState
  )
  const setFrameColor = usePhotoBoothStore(state => state.setFrameColor)
  const setCutCount = usePhotoBoothStore(state => state.setCutCount)
  const setCurrentCutIndex = usePhotoBoothStore(
    state => state.setCurrentCutIndex
  )
  const setSelectedPhotos = usePhotoBoothStore(state => state.setSelectedPhotos)
  const nextPhotoBoothState = usePhotoBoothStore(
    state => state.nextPhotoBoothState
  )
  const nextCut = usePhotoBoothStore(state => state.nextCut)
  const resetCutIndex = usePhotoBoothStore(state => state.resetCutIndex)
  const clearSelectedPhotos = usePhotoBoothStore(
    state => state.clearSelectedPhotos
  )
  const clearCapturedImages = usePhotoBoothStore(
    state => state.clearCapturedImages
  )

  // Canvas size 상태들
  const canvasSize = usePhotoBoothStore(state => state.canvasSize)
  const setCanvasSize = usePhotoBoothStore(state => state.setCanvasSize)
  const resetCanvasSize = usePhotoBoothStore(state => state.resetCanvasSize)

  // Frame & Background 상태들
  const frameVisible = usePhotoBoothStore(state => state.frameVisible)
  const setFrameVisible = usePhotoBoothStore(state => state.setFrameVisible)
  const backgroundColor = usePhotoBoothStore(state => state.backgroundColor)
  const setBackgroundColor = usePhotoBoothStore(
    state => state.setBackgroundColor
  )

  // Debug panel은 항상 표시

  const handleStateChange = (newState: PhotoBoothState) => {
    console.log(`🐛 Debug: Changing state to ${newState}`)
    setPhotoBoothState(newState)
  }

  const handleFrameColorChange = (color: string) => {
    console.log(`🐛 Debug: Changing frame color to ${color}`)
    setFrameColor(color)
  }

  const handleCutCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(8, cutCount + delta))
    console.log(`🐛 Debug: Changing cut count to ${newCount}`)
    setCutCount(newCount)
  }

  const handleCutIndexChange = (delta: number) => {
    const newIndex = Math.max(1, Math.min(cutCount, currentCutIndex + delta))
    console.log(`🐛 Debug: Changing cut index to ${newIndex}`)
    setCurrentCutIndex(newIndex)
  }

  const handleResetAll = () => {
    console.log('🐛 Debug: Resetting all states')
    setPhotoBoothState(PhotoBoothState.WAITING)
    setFrameColor('#FFFFFF')
    setCutCount(4)
    resetCutIndex()
    clearSelectedPhotos()
  }

  const handleLogState = () => {
    const currentState = {
      photoBoothState,
      frameColor,
      cutCount,
      currentCutIndex,
      selectedPhotos,
      roomInfo: { isRoomLeader, roomLeader, roomName },
      timestamp: new Date().toISOString(),
    }
    console.log('🐛 Debug: Current PhotoBooth State:', currentState)
  }

  const handleAddTestPhoto = () => {
    const testPhoto = {
      imgUrl: `test-photo-${Date.now()}.jpg`,
      personIds: [],
      cutIndex: currentCutIndex,
      roomId: roomName,
      timestamp: Date.now()
    }
    setSelectedPhotos([...selectedPhotos, testPhoto])
    console.log(`🐛 Debug: Added test photo:`, testPhoto)
  }

  const handleCanvasSizePreset = (width: number, height: number) => {
    setCanvasSize({ width, height })
    console.log(`🐛 Debug: Canvas size set to ${width}x${height}`)
  }

  const handleCanvasSizeChange = (
    dimension: 'width' | 'height',
    value: number
  ) => {
    const newSize = { ...canvasSize }
    newSize[dimension] = Math.max(256, Math.min(2048, value))
    setCanvasSize(newSize)
    console.log(`🐛 Debug: Canvas ${dimension} set to ${newSize[dimension]}`)
  }

  const handleFrameToggle = () => {
    setFrameVisible(!frameVisible)
    console.log(`🐛 Debug: Frame visibility set to ${!frameVisible}`)
  }

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color)
    console.log(`🐛 Debug: Background color set to ${color}`)
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="max-h-screen min-w-[280px] overflow-hidden rounded-lg bg-black/90 text-white shadow-lg">
        {/* Header */}
        <div
          className="flex cursor-pointer items-center justify-between border-b border-gray-700 p-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-semibold">🐛 Debug Panel</span>
          <span className="text-xs text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto p-4 text-xs">
            {/* Current State */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                🔍 Current State
              </h4>
              <div className="space-y-1 text-gray-300">
                <div>
                  State:{' '}
                  <span className="text-cyan-400">{photoBoothState}</span>
                </div>
                <div>
                  Frame: <span className="text-cyan-400">{frameColor}</span>
                </div>
                <div>
                  Cut:{' '}
                  <span className="text-cyan-400">
                    {cutCount}/{currentCutIndex}
                  </span>
                </div>
                <div>
                  Photos:{' '}
                  <span className="text-cyan-400">
                    {selectedPhotos.filter(p => p !== null).length}/{selectedPhotos.length} filled
                  </span>
                </div>
                <div>
                  Leader:{' '}
                  <span className="text-cyan-400">
                    {isRoomLeader ? 'Me' : roomLeader || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* State Controls */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                🎮 State Controls
              </h4>
              <div className="mb-2 grid grid-cols-3 gap-1">
                {Object.values(PhotoBoothState).map(state => (
                  <button
                    key={state}
                    onClick={() => handleStateChange(state)}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      photoBoothState === state
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {state.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={nextPhotoBoothState}
                className="w-full rounded bg-purple-600 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700"
              >
                Next State →
              </button>
            </div>

            {/* Canvas Settings */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                🖼️ Canvas Settings
              </h4>
              <div className="space-y-2">
                <div className="text-xs text-gray-300">
                  Current:{' '}
                  <span className="text-cyan-400">
                    {canvasSize.width}x{canvasSize.height}
                  </span>
                </div>

                {/* Preset sizes */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => handleCanvasSizePreset(256, 256)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                  >
                    256x256
                  </button>
                  <button
                    onClick={() => handleCanvasSizePreset(512, 512)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                  >
                    512x512
                  </button>
                  <button
                    onClick={() => handleCanvasSizePreset(768, 768)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                  >
                    768x768
                  </button>
                  <button
                    onClick={() => handleCanvasSizePreset(1024, 1024)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                  >
                    1024x1024
                  </button>
                </div>

                {/* Custom size inputs */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-12 text-gray-300">Width:</span>
                    <input
                      type="number"
                      value={canvasSize.width}
                      onChange={e =>
                        handleCanvasSizeChange(
                          'width',
                          parseInt(e.target.value) || 256
                        )
                      }
                      min="256"
                      max="2048"
                      className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-12 text-gray-300">Height:</span>
                    <input
                      type="number"
                      value={canvasSize.height}
                      onChange={e =>
                        handleCanvasSizeChange(
                          'height',
                          parseInt(e.target.value) || 256
                        )
                      }
                      min="256"
                      max="2048"
                      className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={resetCanvasSize}
                  className="w-full rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
                >
                  Reset to Default (512x512)
                </button>

                {/* Frame Controls */}
                <div className="border-t border-gray-600 pt-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-300">Frame:</span>
                    <button
                      onClick={handleFrameToggle}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        frameVisible
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {frameVisible ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Background Color */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-gray-300">
                      Background:
                    </span>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={e =>
                        handleBackgroundColorChange(e.target.value)
                      }
                      className="h-6 w-8 cursor-pointer rounded border-0"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={e =>
                        handleBackgroundColorChange(e.target.value)
                      }
                      className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Frame Color */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                🎨 Frame Color
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={frameColor}
                  onChange={e => handleFrameColorChange(e.target.value)}
                  className="h-6 w-8 cursor-pointer rounded border-0"
                />
                <input
                  type="text"
                  value={frameColor}
                  onChange={e => handleFrameColorChange(e.target.value)}
                  className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Cut Controls */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                📸 Cut Controls
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Count:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCutCountChange(-1)}
                      className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="px-2 text-cyan-400">{cutCount}</span>
                    <button
                      onClick={() => handleCutCountChange(1)}
                      className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Index:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCutIndexChange(-1)}
                      className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="px-2 text-cyan-400">
                      {currentCutIndex}
                    </span>
                    <button
                      onClick={() => handleCutIndexChange(1)}
                      className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={nextCut}
                    className="flex-1 rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                  >
                    Next Cut
                  </button>
                  <button
                    onClick={resetCutIndex}
                    className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Controls */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">🖼️ Photos</h4>
              <div className="space-y-1">
                <div className="max-h-20 overflow-y-auto rounded bg-gray-800 p-2">
                  {selectedPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="truncate text-xs text-gray-400"
                    >
                      {index + 1}. {
                        photo === null 
                          ? '[Empty]' 
                          : (typeof photo === 'string' ? photo : photo.imgUrl)
                      }
                      {photo && typeof photo === 'object' && (
                        <div className="ml-2 text-xs text-gray-500">
                          Cut: {photo.cutIndex}, Faces: {photo.personIds.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={handleAddTestPhoto}
                    className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                  >
                    Add Test Photo
                  </button>
                  <button
                    onClick={clearSelectedPhotos}
                    className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Captured Photos Gallery (Host Only) */}
            {isRoomLeader && (
              <div>
                <h4 className="mb-2 font-semibold text-yellow-400">
                  📷 Captured Photos (Host Only)
                </h4>
                {capturedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300">
                      {capturedImages.length} photo(s) in localStorage
                    </div>
                    <div className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto">
                      {capturedImages.map((imageData, index) => {
                        // Handle both string and Photo object
                        const imgSrc = typeof imageData === 'string' 
                          ? imageData 
                          : imageData.imgUrl
                        return (
                          <div key={index} className="group relative">
                            <img
                              src={imgSrc}
                              alt={`Captured ${index + 1}`}
                              className="h-16 w-full rounded border border-gray-600 object-cover transition-colors hover:border-cyan-400"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-xs text-white">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={clearCapturedImages}
                      className="w-full rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Clear All Captured Photos
                    </button>
                  </div>
                ) : (
                  <div className="rounded border border-gray-600 py-3 text-center text-xs text-gray-500">
                    No photos captured yet
                  </div>
                )}
              </div>
            )}

            {/* Debug Tools */}
            <div>
              <h4 className="mb-2 font-semibold text-yellow-400">
                🛠️ Debug Tools
              </h4>
              <div className="space-y-1">
                <button
                  onClick={handleLogState}
                  className="w-full rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                >
                  Log Current State
                </button>
                <button
                  onClick={handleResetAll}
                  className="w-full rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                >
                  Reset All States
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
