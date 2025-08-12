// src/components/page/feed/EditToolbar.tsx
'use client'

import React from 'react'
import {
  CursorArrowRaysIcon,
  TrashIcon,
  FaceSmileIcon,
  PencilSquareIcon,
  SwatchIcon,
  PhotoIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// ✅ 'save' 타입 추가
export type EditTool = 'select' | 'photo' | 'sticker' | 'text' | 'draw' | 'background' | 'save'

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
  // ✅ 백엔드 연동을 위한 추가 props
  onSave?: () => void
  onCancel?: () => void
  onDelete?: () => void
  isSaving?: boolean
  canSave?: boolean
  mode?: 'create' | 'edit'
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
  zoomLevel,
  onSave,
  onCancel,
  onDelete,
  isSaving = false,
  canSave = false,
  mode = 'create'
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
      id: 'background' as EditTool,
      icon: SwatchIcon,
      label: '배경색',
      color: 'bg-blue-500'
    }
  ]

  const handleToolClick = (tool: EditTool, onClick?: () => void) => {
    // save 도구는 onToolChange로 처리 (FeedEditor에서 핸들링)
    onToolChange(tool)
    if (onClick && tool !== 'save') {
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

        {/* 중앙: 액션 버튼들 */}
        <div className="flex items-center space-x-3">
          {/* 요소 삭제 버튼 */}
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

          {/* 피드 삭제 버튼 (편집 모드에서만) */}
          {mode === 'edit' && onDelete && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="피드 삭제"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="text-sm font-medium">피드 삭제</span>
            </button>
          )}
        </div>

        {/* 오른쪽: 저장/취소 및 줌 컨트롤 */}
        <div className="flex items-center space-x-4">
          {/* 저장/취소 버튼 */}
          <div className="flex items-center space-x-2">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="취소"
              >
                <XMarkIcon className="h-4 w-4" />
                <span className="text-sm font-medium">취소</span>
              </button>
            )}

            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving || !canSave}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  canSave && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={
                  !canSave 
                    ? '사진을 먼저 선택해주세요' 
                    : isSaving 
                    ? '저장 중...' 
                    : mode === 'create' 
                    ? '피드 생성' 
                    : '변경사항 저장'
                }
              >
                {isSaving ? (
                  <>
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">저장 중...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {mode === 'create' ? '생성' : '저장'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 구분선 */}
          <div className="h-8 w-px bg-gray-300"></div>

          {/* 줌 컨트롤 */}
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
      </div>

      {/* 도구별 추가 옵션 및 상태 메시지 */}
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
            {!canSave && (
              <span className="font-medium">사진을 선택해야 피드를 생성할 수 있습니다.</span>
            )}
          </div>
        </div>
      )}

      {activeTool === 'sticker' && (
        <div className="bg-green-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-green-800">
            <span>😊 팁: 스티커를 선택한 후 캔버스에 배치하세요.</span>
            <span className="font-medium text-yellow-700">⚠️ 현재 백엔드에서 지원되지 않습니다.</span>
          </div>
        </div>
      )}

      {activeTool === 'text' && (
        <div className="bg-purple-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-purple-800">
            <span>✏️ 팁: 텍스트를 입력한 후 캔버스에 배치하세요.</span>
            <span className="font-medium text-yellow-700">⚠️ 현재 백엔드에서 지원되지 않습니다.</span>
          </div>
        </div>
      )}

      {activeTool === 'background' && (
        <div className="bg-blue-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-4 text-sm text-blue-800">
            <span>🎨 팁: 미리 정의된 색상에서 피드 배경색을 선택하세요.</span>
            <span>우측 패널에서 원하는 색상을 클릭하면 즉시 적용됩니다</span>
          </div>
        </div>
      )}

      {/* 전체적인 상태 메시지 */}
      {!canSave && (
        <div className="bg-yellow-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-2 text-sm text-yellow-800">
            <span>⚠️</span>
            <span>피드를 생성하려면 먼저 사진을 선택해주세요.</span>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="bg-blue-50 px-4 py-2 border-t">
          <div className="flex items-center space-x-2 text-sm text-blue-800">
            <ClockIcon className="h-4 w-4 animate-spin" />
            <span>피드를 저장하고 있습니다...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditToolbar