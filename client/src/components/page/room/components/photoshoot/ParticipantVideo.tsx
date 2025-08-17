'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Image, Rect, Text } from 'react-konva'
import { Track, VideoTrack } from 'livekit-client'
import { ParticipantVideoProps } from '../../types/photoCanvas'
import { useVirtualBackgroundReady } from '../../providers/PhotoBoothProvider'
import { updatePhotoCanvasState } from '../../stores/photobooth'
import Konva from 'konva'

export default function ParticipantVideo({
  trackReference,
  roomName,
  index,
  isSelected,
  onSelect,
  transform,
  participants,
}: ParticipantVideoProps) {
  const imageRef = useRef<Konva.Image>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | undefined>()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [, setForceUpdate] = useState(0) // 강제 리렌더링용

  const participant = trackReference.participant
  const publication = trackReference.publication
  const track = publication?.track as VideoTrack | undefined

  // VirtualBackground 준비 상태 가져오기
  const virtualBackgroundReady = useVirtualBackgroundReady()

  // Canvas 초기화 (한 번만 생성)
  const initCanvas = useCallback(() => {
    if (!canvasRef.current && videoElement) {
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth || 640
      canvas.height = videoElement.videoHeight || 480
      canvasRef.current = canvas
      console.log(`🎨 Canvas initialized for ${participant.identity}:`, {
        width: canvas.width,
        height: canvas.height
      })
    }
    return canvasRef.current
  }, [videoElement, participant.identity])

  // 조건부 크로마키 처리 함수
  const processVideoFrame = useCallback(() => {
    if (!videoElement || !canvasRef.current) return
    
    // 비디오가 준비되지 않았으면 처리하지 않음
    if (videoElement.readyState < 2) {
      return
    }
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    
    // 비디오 현재 프레임 그리기
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    
    // virtualBackgroundReady일 때만 크로마키 처리
    if (virtualBackgroundReady) {
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
    }
  }, [videoElement, virtualBackgroundReady])

  // 실시간 비디오처리용 displayImage
  const displayImage = useMemo(() => {
    if (!videoElement || !isVideoReady) {
      return null // 비디오 준비 전
    }
    
    // Canvas 초기화
    const canvas = initCanvas()
    if (!canvas) return null
    
    console.log(`🎬 Display image ready for ${participant.identity}:`, {
      hasVideo: !!videoElement,
      virtualBackgroundReady,
      canvasSize: `${canvas.width}x${canvas.height}`
    })
    
    return canvas
  }, [videoElement, isVideoReady, initCanvas, participant.identity, virtualBackgroundReady])

  // 비디오 트랙 설정
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let isCurrentEffect = true // React Strict Mode 중복 실행 방지
    
    const setupVideoTrack = async () => {
      if (!isCurrentEffect) return // 이미 정리된 effect면 실행하지 않음
      console.log(`🔧 Setting up video track for ${participant.identity}:`, {
        hasTrack: !!track,
        trackKind: track?.kind,
        publication: !!publication,
        publicationKind: publication?.kind,
        publicationState: publication?.subscribed
      })
      
      if (!track || track.kind !== Track.Kind.Video) {
        console.log(`⚠️ No video track for participant ${participant.identity}`)
        return
      }

      // 비디오 엘리먼트 생성
      const video = document.createElement('video')
      video.autoplay = true
      video.muted = true
      video.playsInline = true
      video.style.display = 'none' // 실제로는 보이지 않게
      video.crossOrigin = 'anonymous'
      
      try {
        // LiveKit Track의 attach 메소드 사용
        track.attach(video)
        document.body.appendChild(video)
        
        console.log(`✅ Video track attached for ${participant.identity}`)
        
        // 비디오가 준비되면
        video.onloadedmetadata = () => {
          setIsVideoReady(true)
          console.log(`🎥 Video ready for participant ${participant.identity}`, {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          })
        }

        video.onplay = () => {
          console.log(`▶️ Video playing for participant ${participant.identity}`)
        }
        
        video.onerror = (error) => {
          console.error(`❌ Video error for participant ${participant.identity}:`, error)
        }
        
        setVideoElement(video)

        return () => {
          console.log(`🧹 Cleaning up video for ${participant.identity}`)
          track.detach(video)
          video.remove()
          setVideoElement(null)
          setIsVideoReady(false)
        }
      } catch (error) {
        console.error(`❌ Failed to attach video track for ${participant.identity}:`, error)
        return () => {}
      }
    }

    setupVideoTrack().then((cleanupFn) => {
      cleanup = cleanupFn
    })

    return () => {
      isCurrentEffect = false // 이 effect가 정리됨을 표시
      if (cleanup) cleanup()
    }
  }, [track, participant.identity, publication])

  // 효율적인 비디오 프레임 업데이트 (setInterval 사용)
  useEffect(() => {
    if (!displayImage || !videoElement || !isVideoReady) return
    
    // 기존 인터벌이 있으면 먼저 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
    
    console.log(`🎞️ Starting render loop for ${participant.identity}`)

    // 30 FPS로 업데이트
    intervalRef.current = setInterval(() => {
      processVideoFrame()
      imageRef.current?.getLayer()?.batchDraw()
    }, 1000 / 30)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = undefined
        console.log(`⏹️ Stopped render loop for ${participant.identity}`)
      }
    }
  }, [displayImage, videoElement, isVideoReady, processVideoFrame, participant.identity])


  // 직접적인 Yjs 연동 - 드래그&변환 핸들러
  const onTransform = useCallback((e: any) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const participantId = participant.identity
    
    console.log(`🔄 Transform for ${participantId}:`, {
      position: { x: node.x(), y: node.y() },
      rotation: node.rotation(),
      scale: { scaleX, scaleY }
    })
    
    // 바로 Yjs에 업데이트 (중간 핸들러 제거)
    const updatedParticipants = {
      ...participants,
      [participantId]: {
        ...participants[participantId],
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(5, (participants[participantId]?.width || 320) * scaleX),
        height: Math.max(5, (participants[participantId]?.height || 240) * scaleY),
        lastInteractionTime: Date.now()
      }
    }
    
    updatePhotoCanvasState(roomName, { participants: updatedParticipants })
    
    // 스케일 리셋
    node.scaleX(1)
    node.scaleY(1)
  }, [participant.identity, participants, roomName])

  // transform이 undefined일 경우 기본값 사용
  const currentTransform = transform || {
    id: participant.identity,
    x: 100 + index * 50,
    y: 100 + index * 50,
    width: 320,
    height: 240,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    lastInteractionTime: Date.now()
  }
  
  // 디버그 로그
  useEffect(() => {
    console.log(`🎬 ParticipantVideo ${participant.identity}:`, {
      hasTransform: !!transform,
      hasVideo: !!videoElement,
      isVideoReady,
      virtualBackgroundReady,
      hasDisplayImage: !!displayImage,
      imageType: displayImage?.constructor.name || 'null',
      draggable: true,
      isSelected
    })
  }, [participant.identity, transform, videoElement, isVideoReady, virtualBackgroundReady, displayImage, isSelected])

  return (
    <>
      {/* 선택 테두리 */}
      {isSelected && (
        <Rect
          x={currentTransform.x - 2}
          y={currentTransform.y - 2}
          width={currentTransform.width + 4}
          height={currentTransform.height + 4}
          stroke="#4ECDC4"
          strokeWidth={3}
          dash={[10, 5]}
          listening={false}
        />
      )}

      {/* 간소화된 단일 Image 컴포넌트 */}
      <Image
        ref={imageRef}
        name="participant-video"
        draggable
        x={currentTransform.x}
        y={currentTransform.y}
        width={currentTransform.width}
        height={currentTransform.height}
        rotation={currentTransform.rotation}
        image={displayImage || undefined}
        onDragStart={() => {
          console.log(`🚀 Drag started for ${participant.identity}`)
          onSelect(participant.identity)
        }}
        onDragEnd={onTransform}
        onTransform={onTransform}
        onTransformEnd={onTransform}
        onClick={() => {
          console.log(`🖱️ Clicked: ${participant.identity}`)
          onSelect(participant.identity)
        }}
        onTap={() => {
          console.log(`👆 Tapped: ${participant.identity}`)
          onSelect(participant.identity)
        }}
      />

      {/* 참가자 이름 */}
      <Rect
        x={currentTransform.x}
        y={currentTransform.y + currentTransform.height + 2}
        width={currentTransform.width}
        height={25}
        fill="rgba(0,0,0,0.7)"
        cornerRadius={4}
        listening={false}
      />
      <Text
        x={currentTransform.x}
        y={currentTransform.y + currentTransform.height + 8}
        width={currentTransform.width}
        text={`${participant.identity}${track ? '' : ' (No Video)'}`}
        fontSize={12}
        fill="white"
        align="center"
        listening={false}
      />

      {/* 트랙 상태 디버그 */}
      {process.env.NODE_ENV === 'development' && (
        <Text
          x={currentTransform.x + 5}
          y={currentTransform.y + 5}
          text={`Track: ${track ? 'Yes' : 'No'} | Ready: ${isVideoReady}`}
          fontSize={10}
          fill="lime"
          stroke="black"
          strokeWidth={1}
          listening={false}
        />
      )}
    </>
  )
}