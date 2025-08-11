'use client'

import React from 'react'
import {
  PaintBrushIcon,
  Square3Stack3DIcon,
  FaceSmileIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

export type ToolType = 'brush' | 'eraser' | 'sticker' | 'text'

interface DrawingToolbarProps {
  activeTool: ToolType
  currentColor: string
  brushSize: number
  colors: string[]
  brushSizes: number[]
  historyStep: number
  historyLength: number
  onToolChange: (tool: ToolType) => void
  onColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onStickerToggle: () => void
  onTextToggle: () => void
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  currentColor,
  brushSize,
  colors,
  brushSizes,
  historyStep,
  historyLength,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onStickerToggle,
  onTextToggle,
}) => {
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-6">
          {/* Brush Tool */}
          <button
            onClick={() => onToolChange('brush')}
            className="flex items-center space-x-2"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              activeTool === 'brush' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <PaintBrushIcon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700">브러시</span>
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => onToolChange('eraser')}
            className="flex items-center space-x-2"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              activeTool === 'eraser' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <Square3Stack3DIcon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700">지우개</span>
          </button>

          {/* Sticker Tool */}
          <button
            onClick={onStickerToggle}
            className="flex items-center space-x-2"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              activeTool === 'sticker' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <FaceSmileIcon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700">스티커</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={onTextToggle}
            className="flex items-center space-x-2"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              activeTool === 'text' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <PencilSquareIcon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700">텍스트</span>
          </button>

          {/* Colors */}
          <div className="flex items-center space-x-1">
            <span className="mr-2 text-sm text-gray-600">색상:</span>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`h-8 w-8 rounded border-2 ${
                  currentColor === color
                    ? 'border-blue-500'
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Brush Sizes */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">크기:</span>
            {brushSizes.map(size => (
              <button
                key={size}
                onClick={() => onBrushSizeChange(size)}
                className={`flex h-10 w-10 items-center justify-center rounded border-2 ${
                  brushSize === size
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className="rounded-full bg-gray-700"
                  style={{
                    width: Math.min(size, 16),
                    height: Math.min(size, 16),
                  }}
                />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 border-l pl-6">
            <button
              onClick={onUndo}
              disabled={historyStep <= 0}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                historyStep <= 0
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="실행취소"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>

            <button
              onClick={onRedo}
              disabled={historyStep >= historyLength - 1}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                historyStep >= historyLength - 1
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="다시실행"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>

            <button
              onClick={onClear}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
              title="초기화"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DrawingToolbar