'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Line, Image as KonvaImage, Transformer } from 'react-konva'

interface LineData {
  points: number[]
  stroke: string
  strokeWidth: number
}

interface StickerData {
  id: string
  x: number
  y: number
  src: string
  width: number
  height: number
}

interface KonvaCanvasProps {
  stageRef: React.RefObject<any>
  stageSize: { width: number; height: number }
  originalImage: HTMLImageElement | null
  lines: LineData[]
  stickers: StickerData[]
  activeTool: 'brush'
  onMouseDown: (e: any) => void
  onMouseMove: (e: any) => void
  onMouseUp: () => void
  onStickerDelete: (stickerId: string) => void
  onStickerUpdate: (stickerId: string, updates: Partial<StickerData>) => void
}

const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  stageRef,
  stageSize,
  originalImage,
  lines,
  stickers,
  activeTool,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onStickerDelete,
  onStickerUpdate,
}) => {
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const transformerRef = useRef<any>(null)
  const stickerRefs = useRef<{ [key: string]: any }>({})

  useEffect(() => {
    if (selectedSticker && transformerRef.current && stickerRefs.current[selectedSticker]) {
      transformerRef.current.nodes([stickerRefs.current[selectedSticker]])
      transformerRef.current.getLayer().batchDraw()
    }
  }, [selectedSticker])

  const handleStickerSelect = (stickerId: string) => {
    setSelectedSticker(selectedSticker === stickerId ? null : stickerId)
  }

  const handleStageClick = (e: any) => {
    // 스테이지 배경 클릭 시 선택 해제
    if (e.target === e.target.getStage()) {
      setSelectedSticker(null)
    }
    
    // 그리기 이벤트 전달
    onMouseDown(e)
  }

  const handleStickerDragEnd = (e: any, stickerId: string) => {
    const container = e.target.getStage()?.container()
    if (container) {
      container.style.cursor = activeTool === 'brush' ? 'crosshair' : 'pointer'
    }
    
    // 위치 업데이트
    onStickerUpdate(stickerId, {
      x: e.target.x(),
      y: e.target.y()
    })
  }

  const handleStickerTransform = (e: any, stickerId: string) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // 스케일을 실제 width, height로 변환
    const sticker = stickers.find(s => s.id === stickerId)
    if (sticker) {
      onStickerUpdate(stickerId, {
        x: node.x(),
        y: node.y(),
        width: sticker.width * scaleX,
        height: sticker.height * scaleY
      })
      
      // 스케일을 1로 리셋
      node.scaleX(1)
      node.scaleY(1)
    }
  }
  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      onMouseDown={handleStageClick}
      onMousemove={onMouseMove}
      onMouseup={onMouseUp}
      className="border border-gray-300 cursor-crosshair"
    >
      <Layer>
        {/* Background Image */}
        {originalImage && (
          <KonvaImage
            image={originalImage}
            width={stageSize.width}
            height={stageSize.height}
          />
        )}

        {/* Drawing Lines */}
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            tension={0.3}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation="source-over"
            perfectDrawEnabled={false}
          />
        ))}
        
        {/* Stickers */}
        {stickers.map((sticker) => (
          <KonvaImage
            key={sticker.id}
            ref={(node) => {
              if (node) {
                stickerRefs.current[sticker.id] = node
              }
            }}
            x={sticker.x}
            y={sticker.y}
            width={sticker.width}
            height={sticker.height}
            image={(() => {
              const img = new Image()
              img.src = sticker.src
              return img
            })()}
            draggable={true}
            onClick={() => handleStickerSelect(sticker.id)}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'grab'
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'crosshair'
              }
            }}
            onDragStart={(e) => {
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'grabbing'
              }
            }}
            onDragEnd={(e) => handleStickerDragEnd(e, sticker.id)}
            onTransformEnd={(e) => handleStickerTransform(e, sticker.id)}
            onDblClick={() => {
              onStickerDelete(sticker.id)
            }}
          />
        ))}
        
        {/* Transformer for selected sticker */}
        {selectedSticker && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // 최소 크기 제한
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox
              }
              return newBox
            }}
            enabledAnchors={[
              'top-left',
              'top-right', 
              'bottom-left',
              'bottom-right'
            ]}
            rotateEnabled={false}
          />
        )}
      </Layer>
    </Stage>
  )
}

export default KonvaCanvas