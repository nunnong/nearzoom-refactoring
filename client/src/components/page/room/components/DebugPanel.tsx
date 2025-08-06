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
  const setPhotoBoothState = usePhotoBoothStore(state => state.setPhotoBoothState)
  const setFrameColor = usePhotoBoothStore(state => state.setFrameColor)
  const setCutCount = usePhotoBoothStore(state => state.setCutCount)
  const setCurrentCutIndex = usePhotoBoothStore(state => state.setCurrentCutIndex)
  const setSelectedPhotos = usePhotoBoothStore(state => state.setSelectedPhotos)
  const nextPhotoBoothState = usePhotoBoothStore(state => state.nextPhotoBoothState)
  const nextCut = usePhotoBoothStore(state => state.nextCut)
  const resetCutIndex = usePhotoBoothStore(state => state.resetCutIndex)
  const clearSelectedPhotos = usePhotoBoothStore(state => state.clearSelectedPhotos)
  const clearCapturedImages = usePhotoBoothStore(state => state.clearCapturedImages)
  
  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

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
      timestamp: new Date().toISOString()
    }
    console.log('🐛 Debug: Current PhotoBooth State:', currentState)
  }

  const handleAddTestPhoto = () => {
    const testPhoto = `test-photo-${Date.now()}.jpg`
    setSelectedPhotos([...selectedPhotos, testPhoto])
    console.log(`🐛 Debug: Added test photo: ${testPhoto}`)
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-black/90 text-white rounded-lg shadow-lg min-w-[280px]">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer border-b border-gray-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-semibold">🐛 Debug Panel</span>
          <span className="text-xs text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4 space-y-4 text-xs">
            {/* Current State */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">🔍 Current State</h4>
              <div className="space-y-1 text-gray-300">
                <div>State: <span className="text-cyan-400">{photoBoothState}</span></div>
                <div>Frame: <span className="text-cyan-400">{frameColor}</span></div>
                <div>Cut: <span className="text-cyan-400">{cutCount}/{currentCutIndex}</span></div>
                <div>Photos: <span className="text-cyan-400">{selectedPhotos.length} selected</span></div>
                <div>Leader: <span className="text-cyan-400">{isRoomLeader ? 'Me' : roomLeader || 'None'}</span></div>
              </div>
            </div>

            {/* State Controls */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">🎮 State Controls</h4>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {Object.values(PhotoBoothState).map(state => (
                  <button
                    key={state}
                    onClick={() => handleStateChange(state)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
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
                className="w-full px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
              >
                Next State →
              </button>
            </div>

            {/* Frame Color */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">🎨 Frame Color</h4>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={frameColor}
                  onChange={(e) => handleFrameColorChange(e.target.value)}
                  className="w-8 h-6 rounded border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={frameColor}
                  onChange={(e) => handleFrameColorChange(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Cut Controls */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">📸 Cut Controls</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Count:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCutCountChange(-1)}
                      className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="px-2 text-cyan-400">{cutCount}</span>
                    <button
                      onClick={() => handleCutCountChange(1)}
                      className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
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
                      className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="px-2 text-cyan-400">{currentCutIndex}</span>
                    <button
                      onClick={() => handleCutIndexChange(1)}
                      className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={nextCut}
                    className="flex-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                  >
                    Next Cut
                  </button>
                  <button
                    onClick={resetCutIndex}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Controls */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">🖼️ Photos</h4>
              <div className="space-y-1">
                {selectedPhotos.length > 0 ? (
                  <div className="max-h-20 overflow-y-auto bg-gray-800 p-2 rounded">
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} className="text-gray-400 text-xs truncate">
                        {index + 1}. {photo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs text-center py-2">No photos selected</div>
                )}
                
                <div className="flex gap-1">
                  <button
                    onClick={handleAddTestPhoto}
                    className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    Add Test Photo
                  </button>
                  <button
                    onClick={clearSelectedPhotos}
                    className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Captured Photos Gallery (Host Only) */}
            {isRoomLeader && (
              <div>
                <h4 className="text-yellow-400 font-semibold mb-2">📷 Captured Photos (Host Only)</h4>
                {capturedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-gray-300 text-xs">
                      {capturedImages.length} photo(s) in localStorage
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {capturedImages.map((imageData, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageData}
                            alt={`Captured ${index + 1}`}
                            className="w-full h-16 object-cover rounded border border-gray-600 hover:border-cyan-400 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <span className="text-white text-xs">#{index + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={clearCapturedImages}
                      className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Clear All Captured Photos
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs text-center py-3 border border-gray-600 rounded">
                    No photos captured yet
                  </div>
                )}
              </div>
            )}

            {/* Debug Tools */}
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">🛠️ Debug Tools</h4>
              <div className="space-y-1">
                <button
                  onClick={handleLogState}
                  className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Log Current State
                </button>
                <button
                  onClick={handleResetAll}
                  className="w-full px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
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