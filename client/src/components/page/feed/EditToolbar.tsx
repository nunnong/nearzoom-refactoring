// src/components/page/feed/EditToolbar.tsx
'use client'

import React from 'react'
import {
  CursorArrowRaysIcon,
  TrashIcon,
  FaceSmileIcon,
  PencilSquareIcon,
  SwatchIcon, // 🔥 AI 아이콘 → 색상 팔레트 아이콘으로 변경
  PhotoIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'

// 🔥 FeedEditor와 일치하도록 타입 수정 (ai-bg → background)
export type EditTool = 'select' | 'photo' | 'sticker' | 'text' | 'draw' | 'background'

interface EditToolbarProps {
  activeTool: EditTool
  onToolChange: (tool: EditTool) => void
  selectedElement: string | null
  onElementDelete: (elementId: string) => void
  onPhotoAdd: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  zoomLevel: number
}

const EditToolbar: React.FC<EditToolbarProps> = ({
  activeTool,
  onToolChange,
  selectedElement,
  onElementDelete,
  onPhotoAdd,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel
}) => {
  const tools = [
    {
      id: 'select' as EditTool,
      icon: CursorArrowRaysIcon,
      label: '선택',
      color: 'bg-gray-500'
    },
    {
      id: 'photo' as EditTool,
      icon: PhotoIcon,
      label: '사진',
      color: 'bg-orange-500',
      onClick: onPhotoAdd
    },
    {
      id: 'sticker' as EditTool,
      icon: FaceSmileIcon,
      label: '스티커',
      color: 'bg-green-500'
    },
    {
      id: 'text' as EditTool,
      icon: PencilSquareIcon,
      label: '텍스트',
      color: 'bg-purple-500'
    },
    {
      id: 'background' as EditTool, // 🔥 'ai-bg' → 'background'로 변경
      icon: SwatchIcon, // 🔥 SparklesIcon → SwatchIcon으로 변경
      label: '배경색', // 🔥 'AI 배경' → '배경색'으로 변경
      color: 'bg-blue-500' // 🔥 pink → blue로 변경
    }
  ]

  const handleToolClick = (tool: EditTool, onClick?: () => void) => {
    onToolChange(tool)
    if (onClick) {
      onClick()
    }
  }

  const handleDeleteClick = () => {
    if (selectedElement) {
      onElementDelete(selectedElement)
    }
  }

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="flex items-center justify-between p-4">
        {/* 왼쪽: 도구 선택 */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">도구:</span>
          <div className="flex items-center space-x-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id, tool.onClick)}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-all duration-200 ${
                  activeTool === tool.id
                    ? `${tool.color} text-white shadow-md scale-105`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={tool.label}
              >
                <tool.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 중앙: 요소 삭제 버튼 */}
        <div className="flex items-center space-x-2">
          {selectedElement && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200"
              title="선택된 요소 삭제"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="text-sm font-medium">삭제</span>
            </button>
          )}
        </div>

        {/* 오른쪽: 줌 컨트롤 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">줌:</span>
          <button
            onClick={onZoomOut}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            title="축소"
          >
            <MagnifyingGlassMinusIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={onResetZoom}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 min-w-[60px]"
            title="줌 리셋"
          >
            <span className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
          </button>

          <button
            onClick={onZoomIn}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            title="확대"
          >
            <MagnifyingGlassPlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 도구별 추가 옵션 */}
      {activeTool === 'select' && (
        <div className="bg-gray-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-gray-700">
            <span>👆 팁: 요소를 클릭하여 선택하고 드래그하여 이동하세요.</span>
            {selectedElement && <span>선택된 요소: {selectedElement}</span>}
          </div>
        </div>
      )}

      {activeTool === 'photo' && (
        <div className="bg-orange-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-orange-800">
            <span>📷 팁: 사진을 업로드하거나 기존 사진을 선택하세요.</span>
            <span>드래그로 이동, 모서리로 크기 조절 가능</span>
          </div>
        </div>
      )}

      {activeTool === 'sticker' && (
        <div className="bg-green-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-green-800">
            <span>😊 팁: 스티커를 선택한 후 캔버스에 배치하세요.</span>
            <span>드래그로 이동, 모서리로 크기 조절, 회전 가능</span>
          </div>
        </div>
      )}

      {activeTool === 'text' && (
        <div className="bg-purple-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-purple-800">
            <span>✏️ 팁: 텍스트를 입력한 후 캔버스에 배치하세요.</span>
            <span>폰트, 크기, 색상 변경 가능</span>
          </div>
        </div>
      )}

      {/* 🔥 배경색 도구 설명 (AI 완전 제거) */}
      {activeTool === 'background' && (
        <div className="bg-blue-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-blue-800">
            <span>🎨 팁: 미리 정의된 색상에서 피드 배경색을 선택하세요.</span>
            <span>우측 패널에서 원하는 색상을 클릭하면 즉시 적용됩니다</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditToolbar