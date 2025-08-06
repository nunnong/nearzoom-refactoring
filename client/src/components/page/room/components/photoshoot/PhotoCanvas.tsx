'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'

// Konva를 동적으로 import (Next.js SSR 방지)
import dynamic from 'next/dynamic'
import { Stage, Layer, Rect, Text } from 'react-konva'

interface PhotoCanvasProps {
  width?: number
  height?: number
  className?: string
  onCapture?: (imageData: string) => void
}

export default function PhotoCanvas({
  width = 800,
  height = 480,
  className = '',
  onCapture
}: PhotoCanvasProps) {
  const stageRef = useRef<any>(null)
  const [canvasSize, setCanvasSize] = useState({ width, height })
  const [mounted, setMounted] = useState(false)
  
  // PhotoBooth store에서 상태들 가져오기
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const isCapturing = usePhotoBoothStore(state => state.isCapturing)
  const currentCutIndex = usePhotoBoothStore(state => state.currentCutIndex)
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  
  // 캡쳐 함수
  const captureImage = useCallback(() => {
    if (stageRef.current && onCapture) {
      console.log('📸 Capturing canvas image...')
      
      try {
        // Konva Stage를 이미지로 변환
        const dataURL = stageRef.current.toDataURL({
          mimeType: 'image/png',
          quality: 1,
          pixelRatio: 1,
        })
        
        console.log('✅ Canvas captured successfully')
        onCapture(dataURL)
      } catch (error) {
        console.error('❌ Failed to capture canvas:', error)
      }
    }
  }, [onCapture])
  
  // isCapturing 상태 변화 감지하여 자동 캡쳐
  useEffect(() => {
    if (isCapturing) {
      // 약간의 딜레이 후 캡쳐 (렌더링 완료 대기)
      setTimeout(() => {
        captureImage()
      }, 100)
    }
  }, [isCapturing, captureImage])
  
  // 클라이언트 사이드 마운트 체크
  useEffect(() => {
    setMounted(true)
  }, [])

  // 반응형 크기 조정
  useEffect(() => {
    if (!mounted) return
    
    const updateSize = () => {
      const container = stageRef.current?.container()
      if (container) {
        const containerWidth = container.parentElement?.offsetWidth || width
        const aspectRatio = height / width
        const newWidth = Math.min(containerWidth, width)
        const newHeight = newWidth * aspectRatio
        
        setCanvasSize({ width: newWidth, height: newHeight })
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    
    return () => window.removeEventListener('resize', updateSize)
  }, [width, height, mounted])

  // SSR 중이거나 마운트되지 않았으면 로딩 표시
  if (!mounted) {
    return (
      <div className={`relative ${className}`}>
        <div 
          className="bg-gray-200 rounded-xl flex items-center justify-center"
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Canvas Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="rounded-xl overflow-hidden shadow-lg"
      >
        {/* 배경 레이어 */}
        <Layer>
          <Rect
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            fill="#f0f0f0"
          />
        </Layer>
        
        {/* 프레임 레이어 */}
        <Layer>
          {/* 프레임 테두리 */}
          <Rect
            x={10}
            y={10}
            width={canvasSize.width - 20}
            height={canvasSize.height - 20}
            stroke={frameColor || '#FFFFFF'}
            strokeWidth={8}
            cornerRadius={16}
            fill="transparent"
          />
          
          {/* 내부 배경 */}
          <Rect
            x={20}
            y={20}
            width={canvasSize.width - 40}
            height={canvasSize.height - 40}
            fill="#ffffff"
            cornerRadius={8}
          />
        </Layer>
        
        {/* 컨텐츠 레이어 */}
        <Layer>
          {/* 중앙 텍스트 */}
          <Text
            x={canvasSize.width / 2}
            y={canvasSize.height / 2 - 40}
            text="📸 PhotoBooth"
            fontSize={32}
            fontFamily="Arial"
            fill="#2D3243"
            align="center"
            offsetX={80} // 텍스트 중앙 정렬을 위한 오프셋
          />
          
          {/* 컷 정보 */}
          <Text
            x={canvasSize.width / 2}
            y={canvasSize.height / 2 + 20}
            text={`${currentCutIndex + 1}/${cutCount} 컷`}
            fontSize={20}
            fontFamily="Arial"
            fill="#666"
            align="center"
            offsetX={30} // 텍스트 중앙 정렬을 위한 오프셋
          />
        </Layer>
        
        {/* 캡쳐 효과 레이어 */}
        {isCapturing && (
          <Layer>
            <Rect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill="white"
              opacity={0.8}
            />
            <Text
              x={canvasSize.width / 2}
              y={canvasSize.height / 2}
              text="📸 촬영 중..."
              fontSize={24}
              fontFamily="Arial"
              fill="#2D3243"
              align="center"
              offsetX={60}
            />
          </Layer>
        )}
      </Stage>
      
      {/* 캔버스 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Canvas: {canvasSize.width}×{canvasSize.height}
          {isCapturing && ' | Capturing...'}
        </div>
      )}
    </div>
  )
}