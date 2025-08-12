// src/components/page/feed/BackgroundColorPicker.tsx
import React from 'react'
import { X } from 'lucide-react'

interface BackgroundColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
  onClose: () => void
}

const BackgroundColorPicker: React.FC<BackgroundColorPickerProps> = ({
  selectedColor,
  onColorChange,
  onClose
}) => {
  // 미리 정의된 색상 팔레트
  const colorPalette = [
    // 파스텔 톤
    { name: '연한 복숭아', color: '#fef7f0' },
    { name: '연한 하늘', color: '#f0f9ff' },
    { name: '연한 민트', color: '#f7fee7' },
    { name: '연한 라벤더', color: '#fdf4ff' },
    { name: '연한 오렌지', color: '#fff7ed' },
    
    // 밝은 톤
    { name: '연한 핑크', color: '#fee2e2' },
    { name: '연한 노랑', color: '#fef3c7' },
    { name: '연한 초록', color: '#d1fae5' },
    { name: '연한 파랑', color: '#dbeafe' },
    { name: '연한 보라', color: '#e0e7ff' },
    
    // 중간 톤
    { name: '자주색', color: '#f3e8ff' },
    { name: '장미색', color: '#fce7f3' },
    { name: '회색', color: '#f1f5f9' },
    { name: '밝은 회색', color: '#f8fafc' },
    { name: '순백색', color: '#ffffff' },
  ]

  return (
    <div className="bg-white h-full shadow-lg border-l border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">배경색 선택</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* 색상 팔레트 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">미리 정의된 색상</h4>
            <div className="grid grid-cols-3 gap-3">
              {colorPalette.map(({ name, color }) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`group relative w-full h-16 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    selectedColor === color 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                >
                  {/* 선택 표시 */}
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* 호버 시 색상 이름 표시 */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 현재 선택된 색상 정보 */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">현재 선택된 색상</h4>
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded border border-gray-200"
                style={{ backgroundColor: selectedColor }}
              />
              <div>
                <div className="text-sm font-mono text-gray-600">{selectedColor}</div>
                <div className="text-xs text-gray-500">
                  {colorPalette.find(c => c.color === selectedColor)?.name || '사용자 정의'}
                </div>
              </div>
            </div>
          </div>

          {/* 빠른 선택 버튼들 */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">빠른 선택</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => onColorChange('#ffffff')}
                className="flex-1 py-2 px-3 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                흰색
              </button>
              <button
                onClick={() => onColorChange('#fef7f0')}
                className="flex-1 py-2 px-3 text-sm bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
              >
                기본색
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          💡 색상을 클릭하여 피드 배경을 변경하세요
        </div>
      </div>
    </div>
  )
}

export default BackgroundColorPicker