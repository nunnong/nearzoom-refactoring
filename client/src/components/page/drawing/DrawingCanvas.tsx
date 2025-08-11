'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { ToolType } from './DrawingToolbar'

const KonvaCanvas = dynamic(() => import('../../KonvaCanvas'), {
  ssr: false,
})

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

interface DrawingCanvasProps {
  stageRef: React.RefObject<any>
  stageSize: { width: number; height: number }
  originalImage: HTMLImageElement | null
  lines: LineData[]
  stickers: StickerData[]
  texts: TextData[]
  activeTool: ToolType
  stickerModalOpen: boolean
  currentColor: string
  brushSize: number
  selectedStickerId: string | null
  selectedTextId: string | null
  isClient: boolean
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

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  stageRef,
  stageSize,
  originalImage,
  lines,
  stickers,
  texts,
  activeTool,
  stickerModalOpen,
  currentColor,
  brushSize,
  selectedStickerId,
  selectedTextId,
  isClient,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onStickerDelete,
  onStickerUpdate,
  onStickerSelect,
  onTextSelect,
  onTextDelete,
  onTextUpdate,
  onIncreaseFontSize,
  onDecreaseFontSize,
}) => {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100 p-8">
      <div className="rounded-lg bg-white p-4 shadow-lg">
        <div className="relative">
          {isClient ? (
            <div 
              className={`${
                activeTool === 'brush' 
                  ? 'cursor-crosshair' 
                  : activeTool === 'eraser' 
                    ? 'cursor-pointer' 
                    : activeTool === 'text'
                      ? 'cursor-text'
                      : 'cursor-default'
              }`}
              style={activeTool === 'brush' ? {
                cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${Math.min(brushSize * 2, 32)}' height='${Math.min(brushSize * 2, 32)}' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='${Math.min(brushSize, 16)}' fill='${currentColor}' fill-opacity='0.5' stroke='${currentColor}' stroke-width='1'/%3E%3C/svg%3E") ${Math.min(brushSize, 16)} ${Math.min(brushSize, 16)}, crosshair`
              } : {}}
            >
              <KonvaCanvas
                stageRef={stageRef}
                stageSize={stageSize}
                originalImage={originalImage}
                lines={lines}
                stickers={stickers}
                texts={texts}
                activeTool={activeTool}
                stickerModalOpen={stickerModalOpen}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onStickerDelete={onStickerDelete}
                onStickerUpdate={onStickerUpdate}
                onStickerSelect={onStickerSelect}
                onTextSelect={onTextSelect}
                onTextDelete={onTextDelete}
                onTextUpdate={onTextUpdate}
                onIncreaseFontSize={onIncreaseFontSize}
                onDecreaseFontSize={onDecreaseFontSize}
              />
            </div>
          ) : (
            <div
              className="flex cursor-crosshair items-center justify-center border border-gray-300 bg-gray-50"
              style={{ width: stageSize.width, height: stageSize.height }}
            >
              <div className="text-gray-500">편집기 로딩 중...</div>
            </div>
          )}
          
          {/* Sticker Delete Button Overlay */}
          {selectedStickerId && isClient && (() => {
            const selectedSticker = stickers.find(s => s.id === selectedStickerId)
            if (!selectedSticker) return null
            
            return (
              <button
                onClick={() => onStickerDelete(selectedStickerId)}
                className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
                style={{
                  left: selectedSticker.x + selectedSticker.width - 12,
                  top: selectedSticker.y - 12,
                }}
                title="스티커 삭제"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )
          })()}

          {/* Text Control Buttons Overlay */}
          {selectedTextId && isClient && (() => {
            const selectedText = texts.find(t => t.id === selectedTextId)
            if (!selectedText) return null
            
            const fixedX = stageSize.width - 120
            const fixedY = 20
            
            return (
              <div 
                className="absolute flex items-center space-x-2 z-20"
                style={{
                  left: fixedX,
                  top: fixedY,
                }}
              >
                <button
                  onClick={() => onIncreaseFontSize(selectedTextId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-colors border-2 border-white"
                  title="글자 크기 증가"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                
                <button
                  onClick={() => onDecreaseFontSize(selectedTextId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-white shadow-xl hover:bg-gray-700 transition-colors border-2 border-white"
                  title="글자 크기 감소"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </button>
                
                <button
                  onClick={() => onTextDelete(selectedTextId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition-colors border-2 border-white"
                  title="텍스트 삭제"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default DrawingCanvas