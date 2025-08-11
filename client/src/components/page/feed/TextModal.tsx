'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import React, { useState, useEffect, useCallback, useMemo } from 'react'

// ✅ 폰트 옵션 타입 정의
interface FontOption {
  name: string
  family: string
  displayName: string
}

interface TextModalProps {
  isOpen: boolean
  onClose: () => void
  onTextAdd: (text: string, fontFamily: string, fontSize: number, color: string) => void
  fontOptions: FontOption[]
  colors: string[]
  defaultFontSize?: number
  minFontSize?: number
  maxFontSize?: number
  maxTextLength?: number // ✅ 최대 텍스트 길이 제한
}

// ✅ 기본 색상 팔레트
const DEFAULT_COLORS = [
  '#000000', '#FFFFFF', '#DC2626', '#EA580C', '#CA8A04', '#16A34A',
  '#0EA5E9', '#7C3AED', '#DB2777', '#0D9488', '#BE123C', '#6366F1',
] as const

const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  onTextAdd,
  fontOptions,
  colors = DEFAULT_COLORS,
  defaultFontSize = 24,
  minFontSize = 12,
  maxFontSize = 96,
  maxTextLength = 500, // ✅ 기본 최대 길이
}) => {
  const [text, setText] = useState('')
  const [selectedFont, setSelectedFont] = useState<FontOption>(fontOptions[0] || {
    name: '기본',
    family: 'Arial, sans-serif',
    displayName: 'Arial'
  })
  const [fontSize, setFontSize] = useState(defaultFontSize)
  const [selectedColor, setSelectedColor] = useState(colors[0] || '#000000')
  const [error, setError] = useState<string | null>(null)

  // ✅ 폰트 옵션이 변경될 때 안전하게 처리
  useEffect(() => {
    if (fontOptions.length > 0 && !fontOptions.includes(selectedFont)) {
      setSelectedFont(fontOptions[0])
    }
  }, [fontOptions, selectedFont])

  // ✅ 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setText('')
      setSelectedFont(fontOptions[0] || {
        name: '기본',
        family: 'Arial, sans-serif',
        displayName: 'Arial'
      })
      setFontSize(defaultFontSize)
      setSelectedColor(colors[0] || '#000000')
      setError(null)
    }
  }, [isOpen, fontOptions, defaultFontSize, colors])

  // ✅ 에러 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // ✅ 텍스트 유효성 검사
  const isTextValid = useMemo(() => {
    const trimmedText = text.trim()
    return trimmedText.length > 0 && trimmedText.length <= maxTextLength
  }, [text, maxTextLength])

  // ✅ 텍스트 변경 핸들러
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    
    if (newText.length > maxTextLength) {
      setError(`텍스트는 최대 ${maxTextLength}자까지 입력 가능합니다.`)
      return
    }
    
    setText(newText)
    if (error) setError(null)
  }, [maxTextLength, error])

  // ✅ 제출 핸들러
  const handleSubmit = useCallback(() => {
    const trimmedText = text.trim()
    
    if (!trimmedText) {
      setError('텍스트를 입력해주세요.')
      return
    }
    
    if (trimmedText.length > maxTextLength) {
      setError(`텍스트는 최대 ${maxTextLength}자까지 입력 가능합니다.`)
      return
    }

    try {
      onTextAdd(trimmedText, selectedFont.family, fontSize, selectedColor)
      onClose()
    } catch (error) {
      console.error('Failed to add text:', error)
      setError('텍스트 추가에 실패했습니다.')
    }
  }, [text, selectedFont.family, fontSize, selectedColor, maxTextLength, onTextAdd, onClose])

  // ✅ 키보드 이벤트 핸들러
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSubmit, onClose])

  // ✅ 폰트 크기 변경 핸들러
  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value)
    setFontSize(Math.max(minFontSize, Math.min(maxFontSize, newSize)))
  }, [minFontSize, maxFontSize])

  // ✅ 미리보기 스타일
  const previewStyle = useMemo(() => ({
    fontFamily: selectedFont.family,
    fontSize: `${Math.min(fontSize, 48)}px`, // 미리보기에서는 최대 48px로 제한
    color: selectedColor,
    lineHeight: '1.4',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
  }), [selectedFont.family, fontSize, selectedColor])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">텍스트 추가</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ✅ 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex-shrink-0">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Text Input & Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Text Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    텍스트 입력
                  </label>
                  <span className={`text-xs ${
                    text.length > maxTextLength * 0.9 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {text.length}/{maxTextLength}
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyPress}
                  placeholder="여기에 텍스트를 입력하세요..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400 transition-colors ${
                    error && !isTextValid ? 'border-red-300' : 'border-gray-300'
                  }`}
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.5',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                  rows={4}
                  autoFocus
                  maxLength={maxTextLength + 10} // 약간의 여유 공간
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  미리보기
                </label>
                <div 
                  className="p-6 border border-gray-200 rounded-lg bg-gray-50 min-h-[120px] flex items-center justify-center text-center break-words"
                  style={previewStyle}
                >
                  {text || '텍스트를 입력해보세요'}
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="lg:col-span-7 space-y-4">
              {/* Font Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  폰트 선택
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {fontOptions.map((font, index) => (
                    <button
                      key={`${font.family}-${index}`}
                      onClick={() => setSelectedFont(font)}
                      className={`p-2 border-2 rounded-lg text-left transition-colors ${
                        selectedFont?.family === font.family
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ fontFamily: font.family }}
                    >
                      <div className="font-medium text-sm">{font.name}</div>
                      <div className="text-xs text-gray-500 truncate">{font.displayName}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Color Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    크기: {fontSize}px
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={minFontSize}
                      max={maxFontSize}
                      value={fontSize}
                      onChange={handleFontSizeChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{minFontSize}px</span>
                      <span>{maxFontSize}px</span>
                    </div>
                    {/* ✅ 직접 입력 */}
                    <input
                      type="number"
                      min={minFontSize}
                      max={maxFontSize}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상 선택
                  </label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((color, index) => (
                        <button
                          key={`${color}-${index}`}
                          onClick={() => setSelectedColor(color)}
                          className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                            selectedColor === color
                              ? 'border-gray-900 ring-2 ring-purple-500 ring-offset-1'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                          aria-label={`색상 ${color}`}
                        />
                      ))}
                    </div>
                    {/* ✅ 커스텀 색상 선택 */}
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                      title="커스텀 색상 선택"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-500">
            Enter: 추가 | Shift+Enter: 줄바꿈 | Esc: 취소
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isTextValid}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors ${
                isTextValid
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 스타일 추가 */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #7c3aed;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #7c3aed;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}

export default TextModal