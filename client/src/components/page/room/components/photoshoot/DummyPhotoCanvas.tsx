'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Transformer, Text, Image } from 'react-konva'
import { CANVAS_CONFIG } from '../../types/photoCanvas'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { updatePhotoCanvasState } from '../../stores/photobooth'
import { 
  useParticipants,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track, VideoTrack } from 'livekit-client'
import { useVirtualBackgroundReady } from '../../providers/PhotoBoothProvider'

export default function DummyPhotoCanvas() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const transformerRef = useRef<any>(null)
  
  // PhotoBooth store에서 상태들 가져오기
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const isCapturing = usePhotoBoothStore(state => state.isCapturing)
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const roomName = usePhotoBoothStore(state => state.roomName)
  const selectedParticipant = usePhotoBoothStore(state => state.selectedParticipant)
  const participants = usePhotoBoothStore(state => state.participants)
  
  // LiveKit 훅들
  const allParticipants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const cameraTrackRefs = useTracks([Track.Source.Camera])
  
  // VirtualBackground 상태
  const virtualBackgroundReady = useVirtualBackgroundReady()
  
  // 비디오 엘리먼트 상태 관리
  const [videoElements, setVideoElements] = useState<Record<string, HTMLVideoElement>>({})
  const [processedCanvases, setProcessedCanvases] = useState<Record<string, HTMLCanvasElement>>({})
  
  // 비디오 업데이트용 refs
  const stageRef = useRef<any>(null)
  const videoUpdateIntervalRef = useRef<NodeJS.Timeout>()
  
  console.log('📊 DummyPhotoCanvas state:', {
    frameColor,
    isCapturing,
    currentCutIndex,
    cutCount,
    roomName,
    selectedParticipant,
    participantCount: Object.keys(participants).length,
    livekitParticipants: allParticipants.length,
    cameraTracks: cameraTrackRefs.length,
    virtualBackgroundReady
  })

  // 클라이언트 사이드 마운트 체크
  useEffect(() => {
    setMounted(true)
  }, [])

  // LiveKit 비디오 트랙 설정 (VirtualBackground 상태 변경 감지)
  useEffect(() => {
    let isCurrentEffect = true // React Strict Mode 중복 실행 방지
    
    const setupVideoTracks = async () => {
      if (!isCurrentEffect) return // 이미 정리된 effect면 실행하지 않음
      
      console.log(`🔄 Setting up video tracks, VirtualBackground: ${virtualBackgroundReady}`)
      
      const newVideoElements: Record<string, HTMLVideoElement> = {}
      const newProcessedCanvases: Record<string, HTMLCanvasElement> = {}
      
      for (const trackRef of cameraTrackRefs) {
        const participantId = trackRef.participant.identity
        const track = trackRef.publication?.track as VideoTrack | undefined
        
        if (!track || track.kind !== Track.Kind.Video) {
          console.log(`⚠️ No video track for ${participantId}`)
          continue
        }

        // VirtualBackground 상태가 변경되면 기존 비디오도 재생성
        if (videoElements[participantId] && !virtualBackgroundReady) {
          // VirtualBackground가 비활성화되면 기존 비디오 재사용
          newVideoElements[participantId] = videoElements[participantId]
          console.log(`♻️ Reusing existing video for ${participantId} (no VB)`)
          continue
        }

        // 기존 비디오 정리
        if (videoElements[participantId]) {
          videoElements[participantId].remove()
          console.log(`🧹 Removed old video for ${participantId}`)
        }

        // 새 비디오 엘리먼트 생성
        const video = document.createElement('video')
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.style.display = 'none'
        
        try {
          track.attach(video)
          document.body.appendChild(video)
          
          newVideoElements[participantId] = video
          
          // VirtualBackground가 활성화된 경우 Canvas 생성
          if (virtualBackgroundReady) {
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 480
            newProcessedCanvases[participantId] = canvas
            console.log(`✅ Video + Canvas created for ${participantId} (with VB)`)
          } else {
            console.log(`✅ Video created for ${participantId} (no VB)`)
          }
        } catch (error) {
          console.error(`❌ Failed to attach video for ${participantId}:`, error)
        }
      }
      
      // 제거된 참가자의 비디오 정리
      Object.keys(videoElements).forEach(participantId => {
        if (!newVideoElements[participantId]) {
          const video = videoElements[participantId]
          video.remove()
          console.log(`🧹 Removed video for ${participantId}`)
        }
      })
      
      setVideoElements(newVideoElements)
      setProcessedCanvases(newProcessedCanvases)
    }

    setupVideoTracks()
    
    // Cleanup
    return () => {
      isCurrentEffect = false // 이 effect가 정리됨을 표시
      Object.values(videoElements).forEach(video => {
        video.remove()
      })
    }
  }, [cameraTrackRefs, virtualBackgroundReady]) // virtualBackgroundReady 의존성 추가

  // 크로마키 처리 함수 (VirtualBackground가 활성화된 경우에만)
  const processVideoFrame = useCallback((participantId: string) => {
    const videoElement = videoElements[participantId]
    const canvas = processedCanvases[participantId]
    
    if (!videoElement || !canvas || !virtualBackgroundReady) return
    
    // 비디오가 준비되지 않았으면 처리하지 않음
    if (videoElement.readyState < 2) {
      console.log(`⚠️ Video not ready for ${participantId}, readyState: ${videoElement.readyState}`)
      return
    }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    
    // 비디오 현재 프레임 그리기
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    
    // 크로마키 처리
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // 초록색 감지 (G > R && G > B && G > threshold)
      if (g > 100 && g > r * 1.4 && g > b * 1.4) {
        data[i + 3] = 0 // 투명하게
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }, [videoElements, processedCanvases, virtualBackgroundReady])

  // 실시간 비디오 프레임 업데이트 (batchDraw + 크로마키 처리)
  useEffect(() => {
    if (Object.keys(videoElements).length === 0) return
    
    // 기존 인터벌이 있으면 먼저 정리
    if (videoUpdateIntervalRef.current) {
      clearInterval(videoUpdateIntervalRef.current)
      videoUpdateIntervalRef.current = undefined
    }
    
    console.log('🎞️ Starting video update loop with batchDraw + ChromaKey')
    
    // 30 FPS로 비디오 프레임 업데이트
    videoUpdateIntervalRef.current = setInterval(() => {
      // VirtualBackground가 활성화된 경우 크로마키 처리
      if (virtualBackgroundReady) {
        Object.keys(processedCanvases).forEach(participantId => {
          processVideoFrame(participantId)
        })
      }
      
      // Konva Stage 업데이트
      if (stageRef.current) {
        stageRef.current.batchDraw()
      }
    }, 1000 / 30) // 30 FPS
    
    return () => {
      if (videoUpdateIntervalRef.current) {
        clearInterval(videoUpdateIntervalRef.current)
        videoUpdateIntervalRef.current = undefined
        console.log('⏹️ Stopped video update loop')
      }
    }
  }, [videoElements, processedCanvases, virtualBackgroundReady, processVideoFrame])

  // Transformer 연결
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      const selectedNode = stage.findOne(`#${selectedId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      // 선택 해제 시 Transformer 제거
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId])

  // Yjs 상태 변경을 DOM 노드에 반영 (LiveKit 비디오만)
  useEffect(() => {
    if (!stageRef.current) return

    const stage = stageRef.current
    
    // 모든 참가자의 상태를 DOM 노드에 적용
    Object.entries(participants).forEach(([participantId, transform]) => {
      const node = stage.findOne(`#video-${participantId}`)
      if (node && transform) {
        // 현재 노드 값과 비교하여 다른 경우에만 업데이트 (무한 루프 방지)
        const currentX = node.x()
        const currentY = node.y()
        const currentRotation = node.rotation()
        const currentWidth = node.width()
        const currentHeight = node.height()
        
        let needsUpdate = false
        
        if (Math.abs(currentX - transform.x) > 0.1) {
          node.x(transform.x)
          needsUpdate = true
        }
        if (Math.abs(currentY - transform.y) > 0.1) {
          node.y(transform.y)
          needsUpdate = true
        }
        if (Math.abs(currentRotation - (transform.rotation || 0)) > 0.01) {
          node.rotation(transform.rotation || 0)
          needsUpdate = true
        }
        if (Math.abs(currentWidth - transform.width) > 0.1) {
          node.width(transform.width)
          needsUpdate = true
        }
        if (Math.abs(currentHeight - transform.height) > 0.1) {
          node.height(transform.height)
          needsUpdate = true
        }
        
        if (needsUpdate) {
          console.log(`🔄 [DummyCanvas] Syncing DOM node for ${participantId}:`, {
            from: { x: currentX, y: currentY, rotation: currentRotation, width: currentWidth, height: currentHeight },
            to: { x: transform.x, y: transform.y, rotation: transform.rotation, width: transform.width, height: transform.height }
          })
        }
      }
    })
  }, [participants])

  // Z-Index 관리: lastInteractionTime 순서로 정렬 (최근 것이 위에)
  const sortedCameraTracksByZIndex = useMemo(() => {
    return [...cameraTrackRefs].sort((a, b) => {
      const aTime = participants[a.participant.identity]?.lastInteractionTime || 0
      const bTime = participants[b.participant.identity]?.lastInteractionTime || 0
      return aTime - bTime // 오래된 것부터 렌더링 (최근 것이 위에)
    })
  }, [cameraTrackRefs, participants])

  // 선택 핸들러 (Yjs로 업데이트 - PhotoCanvas 로직 모방)
  const handleSelect = useCallback(
    (id: string) => {
      if (roomName) {
        // Mock participant 데이터 업데이트
        const updatedParticipants = {
          ...participants,
          [id]: {
            ...participants[id],
            id,
            x: participants[id]?.x || 100,
            y: participants[id]?.y || 100,
            width: participants[id]?.width || 200,
            height: participants[id]?.height || 150,
            rotation: participants[id]?.rotation || 0,
            scaleX: 1,
            scaleY: 1,
            lastInteractionTime: Date.now(),
          },
        }
        updatePhotoCanvasState(roomName, {
          selectedParticipant: id,
          participants: updatedParticipants,
        })
        console.log('🎯 Selected via Yjs:', id)
      }
      setSelectedId(id)
    },
    [roomName, participants]
  )

  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
      setSelectedId(null)
      if (roomName) {
        updatePhotoCanvasState(roomName, { selectedParticipant: null })
      }
      console.log('📍 Empty stage clicked - deselecting via Yjs')
    }
  }

  // SSR 중이거나 마운트되지 않았으면 로딩 표시
  if (!mounted) {
    return (
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-xl bg-gray-200"
          style={{ width: CANVAS_CONFIG.width, height: CANVAS_CONFIG.height }}
        >
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">DummyCanvas Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Stage 
        ref={stageRef}
        width={CANVAS_CONFIG.width} 
        height={CANVAS_CONFIG.height}
        className="border-2 border-gray-300 rounded-xl"
        onClick={handleStageClick}
      >
        {/* 배경 레이어 */}
        <Layer>
          {/* 배경 */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_CONFIG.width}
            height={CANVAS_CONFIG.height}
            fill="#f0f0f0"
            listening={false}
          />

          {/* 그리드 가이드라인 (PhotoCanvas에서 가져옴) */}
          {[1, 2, 3].map(i => (
            <Rect
              key={`v-line-${i}`}
              x={CANVAS_CONFIG.width * (i / 4)}
              y={0}
              width={1}
              height={CANVAS_CONFIG.height}
              fill="rgba(0,0,0,0.1)"
              listening={false}
            />
          ))}
          {[1, 2, 3].map(i => (
            <Rect
              key={`h-line-${i}`}
              x={0}
              y={CANVAS_CONFIG.height * (i / 4)}
              width={CANVAS_CONFIG.width}
              height={1}
              fill="rgba(0,0,0,0.1)"
              listening={false}
            />
          ))}
        </Layer>

        {/* 테스트 박스 레이어 */}
        <Layer>
          {/* LiveKit 참가자 비디오들 (VirtualBackground 지원) - Z-Index 정렬됨 */}
          {sortedCameraTracksByZIndex.map((trackRef, index) => {
            const participantId = trackRef.participant.identity
            const videoElement = videoElements[participantId]
            const processedCanvas = processedCanvases[participantId]
            const currentTransform = participants[participantId] || {
              x: 50 + index * 200,
              y: 50 + index * 100,
              width: 300,
              height: 225,
              rotation: 0,
            }
            
            if (!videoElement) {
              // 비디오 로딩 중일 때 placeholder
              return (
                <Rect
                  key={`loading-${participantId}`}
                  x={currentTransform.x}
                  y={currentTransform.y}
                  width={currentTransform.width}
                  height={currentTransform.height}
                  fill="rgba(200,200,200,0.5)"
                  stroke="#ccc"
                  strokeWidth={2}
                  cornerRadius={8}
                  listening={false}
                />
              )
            }
            
            // VirtualBackground가 활성화되면 처리된 Canvas 사용, 아니면 원본 비디오 사용
            const displayImage = virtualBackgroundReady && processedCanvas ? processedCanvas : videoElement
            const bgStatus = virtualBackgroundReady ? (processedCanvas ? 'ChromaKey' : 'VB-NoCanvas') : 'Original'
            
            return (
              <>
                <Image
                  key={`video-${participantId}`}
                  id={`video-${participantId}`}
                  draggable
                  x={currentTransform.x}
                  y={currentTransform.y}
                  width={currentTransform.width}
                  height={currentTransform.height}
                  rotation={currentTransform.rotation || 0}
                  image={displayImage}
                  stroke={selectedId === `video-${participantId}` ? '#4ECDC4' : undefined}
                  strokeWidth={selectedId === `video-${participantId}` ? 3 : 0}
                  onClick={(e) => {
                    e.cancelBubble = true
                    console.log(`📹 Video clicked: ${participantId} (${bgStatus}) - bringing to front`)
                    handleSelect(`video-${participantId}`)
                  }}
                  onDragEnd={(e) => {
                    const newX = e.target.x()
                    const newY = e.target.y()
                    console.log(`📹 Video moved: ${participantId} to (${newX}, ${newY})`)
                    
                    // Yjs로 위치 업데이트
                    if (roomName) {
                      const updatedParticipants = {
                        ...participants,
                        [participantId]: {
                          ...participants[participantId],
                          x: newX,
                          y: newY,
                          width: currentTransform.width,
                          height: currentTransform.height,
                          rotation: currentTransform.rotation || 0,
                          lastInteractionTime: Date.now()
                        }
                      }
                      updatePhotoCanvasState(roomName, { participants: updatedParticipants })
                    }
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    
                    console.log(`🔄 Video transformed: ${participantId}`, {
                      x: node.x(),
                      y: node.y(),
                      width: Math.max(5, (participants[participantId]?.width || 300) * scaleX),
                      height: Math.max(5, (participants[participantId]?.height || 225) * scaleY),
                      rotation: node.rotation()
                    })
                    
                    // Transform 완료 시 Yjs에 최종 상태 저장
                    if (roomName) {
                      const updatedParticipants = {
                        ...participants,
                        [participantId]: {
                          ...participants[participantId],
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                          width: Math.max(5, (participants[participantId]?.width || 300) * scaleX),
                          height: Math.max(5, (participants[participantId]?.height || 225) * scaleY),
                          lastInteractionTime: Date.now()
                        }
                      }
                      updatePhotoCanvasState(roomName, { participants: updatedParticipants })
                      
                      // Transform 완료 후 스케일 리셋
                      node.scaleX(1)
                      node.scaleY(1)
                    }
                  }}
                />
                
                {/* 개발용 상태 표시 */}
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Text
                      x={currentTransform.x + 5}
                      y={currentTransform.y + 5}
                      text={bgStatus}
                      fontSize={10}
                      fill="lime"
                      stroke="black"
                      strokeWidth={1}
                      listening={false}
                    />
                    <Text
                      x={currentTransform.x + 5}
                      y={currentTransform.y + 20}
                      text={`Z:${index + 1}`}
                      fontSize={10}
                      fill="orange"
                      stroke="black"
                      strokeWidth={1}
                      listening={false}
                    />
                  </>
                )}
              </>
            )
          })}


          {/* Transformer */}
          {selectedId && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              borderStroke="#4ECDC4"
              borderStrokeWidth={2}
              anchorStroke="#4ECDC4"
              anchorFill="white"
              anchorSize={8}
              anchorCornerRadius={2}
              boundBoxFunc={(oldBox, newBox) => {
                // 최소 크기 제한
                if (newBox.width < 50 || newBox.height < 50) {
                  return oldBox
                }
                return newBox
              }}
            />
          )}
        </Layer>

        {/* 프레임 레이어 (PhotoCanvas에서 가져옴) */}
        <Layer>
          <Rect
            x={10}
            y={10}
            width={CANVAS_CONFIG.width - 20}
            height={CANVAS_CONFIG.height - 20}
            stroke={frameColor}
            strokeWidth={12}
            cornerRadius={20}
            fill="transparent"
            listening={false}
          />

          {/* 컷 정보 */}
          <Rect
            x={CANVAS_CONFIG.width - 150}
            y={20}
            width={120}
            height={40}
            fill="rgba(0,0,0,0.7)"
            cornerRadius={8}
            listening={false}
          />
          <Text
            x={CANVAS_CONFIG.width - 90}
            y={35}
            text={`${currentCutIndex + 1}/${cutCount} 컷`}
            fontSize={16}
            fontFamily="Arial"
            fill="white"
            align="center"
            listening={false}
          />
        </Layer>

        {/* 캡쳐 효과 레이어 */}
        {isCapturing && (
          <Layer>
            <Rect
              x={0}
              y={0}
              width={CANVAS_CONFIG.width}
              height={CANVAS_CONFIG.height}
              fill="white"
              opacity={0.8}
              listening={false}
            />
            <Text
              x={CANVAS_CONFIG.width / 2}
              y={CANVAS_CONFIG.height / 2}
              text="📸 촬영 중..."
              fontSize={24}
              fontFamily="Arial"
              fill="#2D3243"
              align="center"
              offsetX={60}
              listening={false}
            />
          </Layer>
        )}
      </Stage>

      {/* 상태 표시 */}
      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-sm rounded">
        Selected: {selectedId || 'None'}
      </div>

      {/* 테스트 버튼들 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            // PhotoBooth store의 shooting 상태 토글 (테스트용)
            const shootingSlice = usePhotoBoothStore.getState()
            if (roomName) {
              // Mock shooting toggle
              console.log('📸 Toggling capture state via store')
            }
          }}
          className={`px-4 py-2 rounded font-semibold ${
            isCapturing 
              ? 'bg-red-600 text-white' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCapturing ? '📸 촬영 중지' : '📸 촬영 효과 테스트'}
        </button>
        
        <button
          onClick={() => {
            console.log('🎯 Current PhotoBooth State:', {
              frameColor,
              roomName,
              selectedParticipant,
              participantCount: Object.keys(participants).length
            })
          }}
          className="px-4 py-2 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
        >
          📊 상태 로그
        </button>
        
        <button
          onClick={() => {
            if (stageRef.current) {
              stageRef.current.batchDraw()
              console.log('🎨 Manual batchDraw called')
            }
          }}
          className="px-4 py-2 rounded font-semibold bg-purple-600 text-white hover:bg-purple-700"
        >
          🎨 수동 업데이트
        </button>
      </div>

      {/* 설명 */}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">테스트 기능:</h3>
        <ul className="text-sm space-y-1">
          <li>📹 **LiveKit 비디오**: 클릭 + 드래그 + 회전/크기조절 + **Yjs 실시간 동기화**</li>
          <li>📍 빈 공간 클릭: 선택 해제</li>
          <li>📸 촬영 효과: 흰색 오버레이 + 텍스트</li>
          <li>🖼️ 프레임: 흰색 테두리 + 컷 정보</li>
          <li>🎨 수동 업데이트: batchDraw() 수동 호출</li>
          <li>🔄 **Transform 동기화**: 위치, 크기, 회전이 모든 클라이언트에 실시간 반영</li>
        </ul>
        <div className="mt-2 text-xs text-gray-600">
          LiveKit 참가자: {allParticipants.length} | 카메라 트랙: {cameraTrackRefs.length} | 비디오 엘리먼트: {Object.keys(videoElements).length}
          <br />
          VirtualBackground: {virtualBackgroundReady ? 'ON' : 'OFF'} | 처리된 Canvas: {Object.keys(processedCanvases).length}
          <br />
          Z-Index 순서: {sortedCameraTracksByZIndex.map(t => t.participant.identity.slice(-4)).join(' → ')} (최근 상호작용 순)
        </div>
      </div>
    </div>
  )
}