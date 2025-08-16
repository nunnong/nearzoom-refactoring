'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Stage,
  Layer,
  Line,
  Image as KonvaImage,
  Text,
  Transformer,
} from 'react-konva'

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
  rotation?: number
}

interface TextData {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fill: string
  rotation?: number
}

interface KonvaCanvasProps {
  stageRef: React.RefObject<any>
  stageSize: { width: number; height: number }
  originalImage: HTMLImageElement | null
  lines: LineData[]
  stickers: StickerData[]
  texts: TextData[]
  activeTool: 'brush' | 'eraser' | 'sticker' | 'text'
  stickerModalOpen: boolean
  onMouseDown: (e: any) => void
  onMouseMove: (e: any) => void
  onMouseUp: () => void
  onStickerDelete: (stickerId: string) => void
  onStickerUpdate: (stickerId: string, updates: Partial<StickerData>) => void
  onStickerSelect: (stickerId: string | null) => void
  onTextSelect: (textId: string | null) => void
  onTextDelete: (textId: string) => void
  onTextUpdate: (textId: string, updates: Partial<TextData>) => void
  onIncreaseFontSize: (textId: string) => void
  onDecreaseFontSize: (textId: string) => void
}

const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  stageRef,
  stageSize,
  originalImage,
  lines,
  stickers,
  texts,
  activeTool,
  stickerModalOpen,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onStickerUpdate, 
  onStickerSelect,
  onTextSelect,
  onTextDelete,
  onTextUpdate,
  onIncreaseFontSize,
  onDecreaseFontSize,
}) => {
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [isDraggingSticker, setIsDraggingSticker] = useState<boolean>(false)
  const [isTransformingSticker, setIsTransformingSticker] = useState<boolean>(false)
  const transformerRef = useRef<any>(null)
  const stickerRefs = useRef<{ [key: string]: any }>({})
  const textRefs = useRef<{ [key: string]: any }>({})

  useEffect(() => {
    if (transformerRef.current) {
      if (selectedSticker && stickerRefs.current[selectedSticker]) {
        // 스티커가 선택된 경우
        transformerRef.current.nodes([stickerRefs.current[selectedSticker]])
        transformerRef.current.getLayer().batchDraw()
      } else if (selectedText && textRefs.current[selectedText]) {
        // 텍스트가 선택된 경우
        transformerRef.current.nodes([textRefs.current[selectedText]])
        transformerRef.current.getLayer().batchDraw()
      } else {
        // 아무것도 선택되지 않은 경우
        transformerRef.current.nodes([])
        transformerRef.current.getLayer()?.batchDraw()
      }
    }
  }, [selectedSticker, selectedText, stickers, texts])

  const handleStickerSelect = (stickerId: string) => {
    const newSelection = selectedSticker === stickerId ? null : stickerId
    setSelectedSticker(newSelection)
    setSelectedText(null) // 텍스트 선택 해제
    onStickerSelect(newSelection)
    onTextSelect(null) // 텍스트 선택 콜백도 해제
  }

  const handleTextSelect = (textId: string) => {
    const newSelection = selectedText === textId ? null : textId
    setSelectedText(newSelection)
    setSelectedSticker(null) // 스티커 선택 해제
    onStickerSelect(null)
    onTextSelect(newSelection)
  }

  // 스티커 또는 텍스트가 삭제되었을 때 선택 상태 확인 및 해제
  useEffect(() => {
    if (selectedSticker && !stickers.find(s => s.id === selectedSticker)) {
      setSelectedSticker(null)
      onStickerSelect(null)
    }
    
    // 삭제된 스티커 참조 정리
    const currentStickerIds = stickers.map(s => s.id)
    Object.keys(stickerRefs.current).forEach(id => {
      if (!currentStickerIds.includes(id)) {
        delete stickerRefs.current[id]
      }
    })
  }, [stickers, selectedSticker])

  useEffect(() => {
    if (selectedText && !texts.find(t => t.id === selectedText)) {
      setSelectedText(null)
      onTextSelect(null)
    }
    
    // 삭제된 텍스트 참조 정리
    const currentTextIds = texts.map(t => t.id)
    Object.keys(textRefs.current).forEach(id => {
      if (!currentTextIds.includes(id)) {
        delete textRefs.current[id]
      }
    })
  }, [texts, selectedText])

  const handleStageClick = (e: any) => {
    // 스테이지 배경 클릭 시 선택 해제
    if (e.target === e.target.getStage()) {
      setSelectedSticker(null)
      setSelectedText(null)
      onStickerSelect(null)
      onTextSelect(null)
    }

    // 스티커 모드이거나 스티커 조작 중이면 그리기 비활성화 (모달 상태와 무관)
    if (activeTool === 'sticker' || isDraggingSticker || isTransformingSticker || selectedSticker || selectedText) {
      return
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
      y: e.target.y(),
    })
  }

  const handleStickerTransform = (e: any, stickerId: string) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation()

    // 스케일을 실제 width, height로 변환
    const sticker = stickers.find(s => s.id === stickerId)
    if (sticker) {
      onStickerUpdate(stickerId, {
        x: node.x(),
        y: node.y(),
        width: sticker.width * scaleX,
        height: sticker.height * scaleY,
        rotation: rotation,
      })

      // 스케일을 1로 리셋 (회전은 유지)
      node.scaleX(1)
      node.scaleY(1)
    }
  }

 const handleTextTransform = (e: any, textId: string) => {
  const node = e.target;
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const rotation = node.rotation();

  const textItem = texts.find(t => t.id === textId);
  if (textItem) {
    const currentFontSize = textItem.fontSize;
    const scaleFactor = Math.max(scaleX, scaleY);
    const newFontSize = Math.max(12, Math.round(currentFontSize * scaleFactor));

    // **fontSize를 state에 실제로 반영!**
    onTextUpdate(textId, {
      x: node.x(),
      y: node.y(),
      fontSize: newFontSize,
      rotation: rotation,
    });

    // 스케일을 1로 초기화
    node.scaleX(1);
    node.scaleY(1);
  }
};

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      onMouseDown={handleStageClick}
      onMousemove={activeTool === 'sticker' || isDraggingSticker || isTransformingSticker || selectedSticker ? undefined : onMouseMove}
      onMouseup={activeTool === 'sticker' || isDraggingSticker || isTransformingSticker ? undefined : onMouseUp}
      style={{
        cursor: activeTool === 'brush' ? 'default' : 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iNCIgZmlsbD0iI2Y4N2E3MSIvPgo8L3N2Zz4=") 10 10, auto'
      }}
      className="border border-gray-300"
    >
      <Layer>
        {/* Background Image */}
        {originalImage && (
          <KonvaImage
            image={originalImage}
            width={stageSize.width}
            height={stageSize.height}
            // 원본 이미지의 비율을 유지하면서 스테이지 크기에 맞게 조정
            scaleX={stageSize.width / (originalImage.naturalWidth || originalImage.width)}
            scaleY={stageSize.height / (originalImage.naturalHeight || originalImage.height)}
          />
        )}

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
        {stickers.map(sticker => (
          <KonvaImage
            key={sticker.id}
            ref={node => {
              if (node) {
                stickerRefs.current[sticker.id] = node
              }
            }}
            x={sticker.x}
            y={sticker.y}
            width={sticker.width}
            height={sticker.height}
            rotation={sticker.rotation || 0}
            image={(() => {
              const img = new Image()
              img.src = sticker.src
              return img
            })()}
            draggable={true}
            onClick={(e) => {
              e.cancelBubble = true
              handleStickerSelect(sticker.id)
            }}
            onMouseEnter={e => {
              e.cancelBubble = true
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'grab'
              }
            }}
            onMouseLeave={e => {
              e.cancelBubble = true
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'crosshair'
              }
            }}
            onDragStart={e => {
              e.cancelBubble = true
              setIsDraggingSticker(true)
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'grabbing'
              }
            }}
            onDragEnd={e => {
              e.cancelBubble = true
              setIsDraggingSticker(false)
              handleStickerDragEnd(e, sticker.id)
            }}
            onTransformStart={() => setIsTransformingSticker(true)}
            onTransformEnd={e => {
              e.cancelBubble = true
              setIsTransformingSticker(false)
              handleStickerTransform(e, sticker.id)
            }}
          />
        ))}

        {/* Texts */}
        {texts.map(textItem => (
          <Text
            key={textItem.id}
            ref={node => {
              if (node) {
                textRefs.current[textItem.id] = node
              }
            }}
            x={textItem.x}
            y={textItem.y}
            text={textItem.text}
            fontSize={textItem.fontSize}
            fontFamily={textItem.fontFamily}
            fill={textItem.fill}
            rotation={textItem.rotation || 0}
            lineHeight={1.2}
            align="left"
            verticalAlign="top"
            draggable={true}
            onClick={(e) => {
              e.cancelBubble = true
              handleTextSelect(textItem.id)
            }}
            onDragEnd={e => {
              e.cancelBubble = true
              onTextUpdate(textItem.id, {
                x: e.target.x(),
                y: e.target.y(),
              })
            }}
            onTransformEnd={e => {
              e.cancelBubble = true
              handleTextTransform(e, textItem.id)
            }}
            onMouseEnter={e => {
              e.cancelBubble = true
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'grab'
              }
            }}
            onMouseLeave={e => {
              e.cancelBubble = true
              const container = e.target.getStage()?.container()
              if (container) {
                container.style.cursor = 'default'
              }
            }}
          />
        ))}

        {/* Transformer for selected sticker or text */}
        {(selectedSticker || selectedText) && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // 최소 크기 제한
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox
              }
              
              // 텍스트인 경우 높이 변화를 제한
              if (selectedText) {
                const heightRatio = newBox.height / oldBox.height
                const widthRatio = newBox.width / oldBox.width
                
                // 높이 변화가 너무 크면 제한
                if (heightRatio > 2.0 || heightRatio < 0.5) {
                  return {
                    ...newBox,
                    height: oldBox.height * Math.min(Math.max(heightRatio, 0.5), 2.0)
                  }
                }
                
                // 비율을 유지하도록 강제
                const scale = Math.max(widthRatio, heightRatio)
                return {
                  ...newBox,
                  width: oldBox.width * scale,
                  height: oldBox.height * scale
                }
              }
              
              return newBox
            }}
            enabledAnchors={[
              'top-left',
              'top-center', 
              'top-right',
              'middle-left',
              'middle-right',
              'bottom-left',
              'bottom-center',
              'bottom-right',
            ]}
            keepRatio={selectedText ? true : false}
            rotateEnabled={true}
            onTransformStart={() => setIsTransformingSticker(true)}
            onTransformEnd={() => setIsTransformingSticker(false)}
          />
        )}
      </Layer>
    </Stage>
  )
}

export default KonvaCanvas