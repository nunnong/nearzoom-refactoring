'use client'

import { useState } from 'react'
import { usePhotoBoothStore } from '../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../stores/photobooth'
import { useParticipants, useLocalParticipant } from '@livekit/components-react'

interface DebugPanelProps {
  className?: string
}

export default function DebugPanel({ className = '' }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [showJsonView, setShowJsonView] = useState<Record<string, boolean>>({})

  // LiveKit 참가자 정보
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()

  // PhotoBooth store 상태들
  const photoBoothState = usePhotoBoothStore(state => state.photoBoothState)
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const selectedPhotos = usePhotoBoothStore(state => state.selectedPhotos)
  const capturedImages = usePhotoBoothStore(state => state.capturedImages)

  // PhotoCanvas 상태들
  const participants_canvas = usePhotoBoothStore(state => state.participants)
  const selectedParticipant = usePhotoBoothStore(state => state.selectedParticipant)

  // Edit 상태들  
  const selectedPhotoUrls = usePhotoBoothStore(state => state.selectedPhotoUrls)
  const photoPersonIds = usePhotoBoothStore(state => state.photoPersonIds)
  const processedPhotoUrls = usePhotoBoothStore(state => state.processedPhotoUrls)
  const currentEditIndex = usePhotoBoothStore(state => state.currentEditIndex)
  const backgroundType = usePhotoBoothStore(state => state.backgroundType)
  const selectedColor = usePhotoBoothStore(state => state.selectedColor)
  const promptText = usePhotoBoothStore(state => state.promptText)
  const photoBackgrounds = usePhotoBoothStore(state => state.photoBackgrounds)
  const editSessionStarted = usePhotoBoothStore(state => state.editSessionStarted)

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

  // Helper functions for collapsible sections
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const toggleJsonView = (sectionKey: string) => {
    setShowJsonView(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const SectionHeader = ({ 
    title, 
    sectionKey, 
    hasJsonView = false 
  }: { 
    title: string
    sectionKey: string
    hasJsonView?: boolean 
  }) => (
    <div className="flex items-center justify-between mb-2">
      <h4 
        className="font-semibold text-yellow-400 cursor-pointer flex items-center gap-1"
        onClick={() => toggleSection(sectionKey)}
      >
        <span className="text-xs">
          {collapsedSections[sectionKey] ? '▶' : '▼'}
        </span>
        {title}
      </h4>
      {hasJsonView && !collapsedSections[sectionKey] && (
        <button
          onClick={() => toggleJsonView(sectionKey)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            showJsonView[sectionKey]
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {showJsonView[sectionKey] ? 'UI' : 'JSON'}
        </button>
      )}
    </div>
  )

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

            {/* Participants & Metadata */}
            <div>
              <SectionHeader 
                title="👥 Participants & Metadata" 
                sectionKey="participants"
                hasJsonView={true}
              />
              {!collapsedSections.participants && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-300">
                    Total: <span className="text-cyan-400">{participants.length}</span> participant(s)
                  </div>
                  
                  {showJsonView.participants ? (
                    <div className="rounded bg-gray-800 p-2">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(
                          participants.map(p => ({
                            identity: p.identity,
                            name: p.name,
                            metadata: p.metadata ? JSON.parse(p.metadata) : {},
                            isLocal: p.identity === localParticipant?.identity
                          })), 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  ) : (
                    <div className="max-h-32 space-y-2 overflow-y-auto rounded bg-gray-800 p-2">
                      {participants.map((participant, index) => {
                        const isLocal = participant.identity === localParticipant?.identity
                        let metadata: any = {}
                        try {
                          metadata = JSON.parse(participant.metadata || '{}')
                        } catch (e) {
                          metadata = {}
                        }
                        
                        return (
                          <div
                            key={participant.identity}
                            className={`rounded border p-2 text-xs ${
                              isLocal 
                                ? 'border-cyan-400 bg-cyan-900/20' 
                                : 'border-gray-600 bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isLocal ? 'text-cyan-400' : 'text-white'}`}>
                                  {participant.name}
                                  {isLocal && ' (ME)'}
                                </span>
                                <span className={`rounded px-1 text-xs ${
                                  metadata.role === 'host' 
                                    ? 'bg-yellow-600 text-white' 
                                    : 'bg-gray-600 text-gray-300'
                                }`}>
                                  {metadata.role || 'unknown'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-gray-400">
                              <div>ID: <span className="text-gray-300">{participant.identity}</span></div>
                              {metadata.faceImageUrl && (
                                <div className="mt-1 flex items-center gap-2">
                                  <span>Face:</span>
                                  <img 
                                    src={metadata.faceImageUrl} 
                                    alt="Face" 
                                    className="h-6 w-6 rounded border border-gray-500 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                  <span className="text-xs text-gray-500 truncate max-w-20">
                                    {metadata.faceImageUrl.split('/').pop()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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

            {/* Selected Photos - Enhanced */}
            <div>
              <SectionHeader 
                title="📸 Selected Photos (Detailed)" 
                sectionKey="selectedPhotos"
                hasJsonView={true}
              />
              {!collapsedSections.selectedPhotos && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-300">
                    Filled: <span className="text-cyan-400">
                      {selectedPhotos.filter(p => p !== null && p !== undefined).length}
                    </span>/{selectedPhotos.length} slots
                  </div>
                  
                  {showJsonView.selectedPhotos ? (
                    <div className="rounded bg-gray-800 p-2">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(selectedPhotos, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded bg-gray-800 p-2">
                  {selectedPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className={`rounded border p-2 text-xs ${
                        photo ? 'border-green-600 bg-green-900/20' : 'border-gray-600 bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">Slot {index + 1}</span>
                        <span className={`rounded px-1 text-xs ${
                          photo ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {photo ? 'FILLED' : 'EMPTY'}
                        </span>
                      </div>
                      
                      {photo ? (
                        <div className="space-y-1 text-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Image:</span>
                            {photo.imgUrl && (
                              <img 
                                src={photo.imgUrl} 
                                alt={`Photo ${index + 1}`}
                                className="h-8 w-8 rounded border border-gray-500 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            )}
                            <span className="text-xs text-gray-500 truncate max-w-24">
                              {photo.imgUrl ? photo.imgUrl.split('/').pop() : '[No URL]'}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">Cut Index:</span>{' '}
                            <span className="text-cyan-400">{photo.cutIndex}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">Room ID:</span>{' '}
                            <span className="text-cyan-400">{photo.roomId}</span>
                          </div>
                          
                          {photo.timestamp && (
                            <div>
                              <span className="text-gray-400">Time:</span>{' '}
                              <span className="text-cyan-400">
                                {new Date(photo.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-gray-400">Face IDs:</span>{' '}
                            <span className="text-cyan-400">
                              {photo.personIds ? photo.personIds.length : 0} face(s)
                            </span>
                          </div>
                          
                          {photo.personIds && photo.personIds.length > 0 && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-400 mb-1">Face Images:</div>
                              <div className="flex flex-wrap gap-1">
                                {photo.personIds.map((faceUrl, faceIndex) => (
                                  <img 
                                    key={faceIndex}
                                    src={faceUrl} 
                                    alt={`Face ${faceIndex + 1}`}
                                    className="h-6 w-6 rounded border border-gray-500 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">No photo in this slot</div>
                      )}
                      </div>
                    ))}
                    </div>
                  )}

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
              )}
            </div>

            {/* PhotoCanvas Participants */}
            <div>
              <SectionHeader 
                title="🎭 PhotoCanvas Participants" 
                sectionKey="photoCanvas"
                hasJsonView={true}
              />
              {!collapsedSections.photoCanvas && (
                <div className="space-y-2">
                <div className="text-xs text-gray-300">
                  Canvas Participants: <span className="text-cyan-400">
                    {Object.keys(participants_canvas).length}
                  </span>
                  {selectedParticipant && (
                    <span className="ml-2">
                      | Selected: <span className="text-yellow-400">{selectedParticipant}</span>
                    </span>
                  )}
                </div>
                
                {showJsonView.photoCanvas ? (
                  <div className="rounded bg-gray-800 p-2">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify({
                        participants: participants_canvas,
                        selectedParticipant
                      }, null, 2)}
                    </pre>
                  </div>
                ) : Object.keys(participants_canvas).length > 0 ? (
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded bg-gray-800 p-2">
                    {Object.entries(participants_canvas).map(([id, transform]) => (
                      <div
                        key={id}
                        className={`rounded border p-2 text-xs ${
                          selectedParticipant === id 
                            ? 'border-yellow-400 bg-yellow-900/20' 
                            : 'border-gray-600 bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${
                            selectedParticipant === id ? 'text-yellow-400' : 'text-white'
                          }`}>
                            {id}
                            {selectedParticipant === id && ' (SELECTED)'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(transform.lastInteractionTime).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-300">
                          <div>
                            <span className="text-gray-400">Position:</span>{' '}
                            <span className="text-cyan-400">
                              ({Math.round(transform.x)}, {Math.round(transform.y)})
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">Size:</span>{' '}
                            <span className="text-cyan-400">
                              {transform.width}×{transform.height}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">Scale:</span>{' '}
                            <span className="text-cyan-400">
                              {transform.scaleX.toFixed(2)}×{transform.scaleY.toFixed(2)}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">Rotation:</span>{' '}
                            <span className="text-cyan-400">
                              {Math.round(transform.rotation)}°
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-gray-600 py-3 text-center text-xs text-gray-500">
                    No participants on canvas
                  </div>
                )}
                </div>
              )}
            </div>

            {/* Edit Session State */}
            <div>
              <SectionHeader 
                title="🎨 Edit Session State" 
                sectionKey="editSession"
                hasJsonView={true}
              />
              {!collapsedSections.editSession && (
                <div className="space-y-2">
                <div className="text-xs text-gray-300">
                  Session: <span className={`font-medium ${
                    editSessionStarted ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {editSessionStarted ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {editSessionStarted && (
                    <span className="ml-2">
                      | Current: <span className="text-cyan-400">{currentEditIndex + 1}</span>/
                      <span className="text-cyan-400">{selectedPhotoUrls.length}</span>
                    </span>
                  )}
                </div>
                
                {showJsonView.editSession ? (
                  <div className="rounded bg-gray-800 p-2">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify({
                        editSessionStarted,
                        selectedPhotoUrls,
                        photoPersonIds,
                        processedPhotoUrls,
                        currentEditIndex,
                        backgroundType,
                        selectedColor,
                        promptText,
                        photoBackgrounds
                      }, null, 2)}
                    </pre>
                  </div>
                ) : editSessionStarted ? (
                  <div className="space-y-2">
                    <div className="rounded bg-gray-800 p-2">
                      <div className="mb-2 text-xs font-medium text-yellow-400">Current Photo Settings</div>
                      <div className="space-y-1 text-xs text-gray-300">
                        <div>
                          <span className="text-gray-400">Background Type:</span>{' '}
                          <span className={`rounded px-1 text-xs ${
                            backgroundType === 'color' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                          }`}>
                            {backgroundType.toUpperCase()}
                          </span>
                        </div>
                        
                        {backgroundType === 'color' && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Selected Color:</span>
                            <div 
                              className="h-4 w-4 rounded border border-gray-500"
                              style={{ backgroundColor: selectedColor }}
                            />
                            <span className="text-cyan-400">{selectedColor}</span>
                          </div>
                        )}
                        
                        {backgroundType === 'prompt' && (
                          <div>
                            <span className="text-gray-400">Prompt:</span>{' '}
                            <span className="text-cyan-400">
                              {promptText || '[Empty]'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="rounded bg-gray-800 p-2">
                      <div className="mb-2 text-xs font-medium text-yellow-400">All Photos Status</div>
                      <div className="max-h-32 space-y-1 overflow-y-auto">
                        {selectedPhotoUrls.map((url, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between rounded border p-1 text-xs ${
                              index === currentEditIndex 
                                ? 'border-cyan-400 bg-cyan-900/20' 
                                : 'border-gray-600 bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                index === currentEditIndex ? 'text-cyan-400' : 'text-white'
                              }`}>
                                #{index + 1}
                                {index === currentEditIndex && ' (CURRENT)'}
                              </span>
                              {url && (
                                <img 
                                  src={url} 
                                  alt={`Edit Photo ${index + 1}`}
                                  className="h-6 w-6 rounded border border-gray-500 object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">
                                Faces: {photoPersonIds[index]?.length || 0}
                              </span>
                              <span className={`rounded px-1 text-xs ${
                                photoBackgrounds[index]?.completed 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-gray-600 text-gray-300'
                              }`}>
                                {photoBackgrounds[index]?.completed ? 'DONE' : 'PENDING'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="rounded bg-gray-800 p-2">
                      <div className="mb-2 text-xs font-medium text-yellow-400">Completed Backgrounds</div>
                      {photoBackgrounds.length > 0 ? (
                        <div className="space-y-1">
                          {photoBackgrounds.map((bg, index) => (
                            <div key={index} className="text-xs text-gray-300">
                              <span className="text-gray-400">Photo {bg.photoIndex + 1}:</span>{' '}
                              <span className={`rounded px-1 text-xs ${
                                bg.backgroundType === 'color' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-purple-600 text-white'
                              }`}>
                                {bg.backgroundType}
                              </span>
                              {bg.backgroundType === 'color' && (
                                <span className="ml-1">
                                  <div 
                                    className="inline-block h-3 w-3 rounded border border-gray-500 ml-1"
                                    style={{ backgroundColor: bg.backgroundValue }}
                                  />
                                </span>
                              )}
                              {bg.backgroundType === 'prompt' && (
                                <span className="ml-1 text-cyan-400 truncate max-w-32">
                                  "{bg.backgroundValue}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No backgrounds completed yet</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-gray-600 py-3 text-center text-xs text-gray-500">
                    Edit session not started
                  </div>
                )}
                </div>
              )}
            </div>

            {/* Captured Photos Gallery (Host Only) - Enhanced */}
            {isRoomLeader && (
              <div>
                <SectionHeader 
                  title="📷 Captured Photos (Host Only) - Enhanced" 
                  sectionKey="capturedPhotos"
                  hasJsonView={true}
                />
                {!collapsedSections.capturedPhotos && (
                  <>
                  {capturedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300">
                      {capturedImages.length} photo(s) in localStorage
                    </div>
                    
                    {showJsonView.capturedPhotos ? (
                      <div className="rounded bg-gray-800 p-2">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                          {JSON.stringify(capturedImages, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="max-h-40 space-y-2 overflow-y-auto">
                      {capturedImages.map((imageData, index) => {
                        // Handle both string and Photo object
                        const isPhotoObject = typeof imageData === 'object' && imageData !== null
                        const imgSrc = isPhotoObject ? imageData.imgUrl : imageData
                        
                        return (
                          <div key={index} className="rounded border border-gray-600 bg-gray-800 p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-white">
                                Captured #{index + 1}
                              </span>
                              <span className={`rounded px-1 text-xs ${
                                isPhotoObject 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-600 text-gray-300'
                              }`}>
                                {isPhotoObject ? 'PHOTO OBJECT' : 'STRING'}
                              </span>
                            </div>
                            
                            <div className="flex gap-2">
                              <img
                                src={imgSrc}
                                alt={`Captured ${index + 1}`}
                                className="h-16 w-16 rounded border border-gray-500 object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              
                              <div className="flex-1 space-y-1 text-xs">
                                <div>
                                  <span className="text-gray-400">Type:</span>{' '}
                                  <span className="text-cyan-400">
                                    {isPhotoObject ? 'Photo Object' : 'Base64 String'}
                                  </span>
                                </div>
                                
                                {isPhotoObject && (
                                  <>
                                    <div>
                                      <span className="text-gray-400">Cut Index:</span>{' '}
                                      <span className="text-cyan-400">{imageData.cutIndex}</span>
                                    </div>
                                    
                                    <div>
                                      <span className="text-gray-400">Room ID:</span>{' '}
                                      <span className="text-cyan-400">{imageData.roomId}</span>
                                    </div>
                                    
                                    {imageData.timestamp && (
                                      <div>
                                        <span className="text-gray-400">Time:</span>{' '}
                                        <span className="text-cyan-400">
                                          {new Date(imageData.timestamp).toLocaleTimeString()}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div>
                                      <span className="text-gray-400">Faces:</span>{' '}
                                      <span className="text-cyan-400">
                                        {imageData.personIds ? imageData.personIds.length : 0}
                                      </span>
                                    </div>
                                    
                                    {imageData.personIds && imageData.personIds.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {imageData.personIds.map((faceUrl, faceIndex) => (
                                          <img 
                                            key={faceIndex}
                                            src={faceUrl} 
                                            alt={`Face ${faceIndex + 1}`}
                                            className="h-4 w-4 rounded border border-gray-500 object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {!isPhotoObject && (
                                  <div>
                                    <span className="text-gray-400">Size:</span>{' '}
                                    <span className="text-cyan-400">
                                      {Math.round(imgSrc.length / 1024)} KB
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                        })}
                      </div>
                    )}
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
                </>
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
