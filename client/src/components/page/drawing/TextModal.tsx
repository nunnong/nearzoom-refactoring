'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'

interface TextModalProps {
  isOpen: boolean
  onClose: () => void
  onTextAdd: (text: string, fontFamily: string, fontSize: number, color: string) => void
  fontOptions: Array<{ name: string; family: string; displayName: string }>
  colors: string[]
  defaultFontSize?: number
  minFontSize?: number
  maxFontSize?: number
}

const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  onTextAdd,
  fontOptions,
  colors,
  defaultFontSize = 12,
  minFontSize = 12,
  maxFontSize = 96,
}) => {
  const [text, setText] = useState('')
  const [selectedFont, setSelectedFont] = useState(fontOptions[0])
  const [fontSize, setFontSize] = useState(defaultFontSize)
  const [selectedColor, setSelectedColor] = useState(colors[0])

  // 모달이 열릴 때마다 기본값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setFontSize(defaultFontSize)
    }
  }, [isOpen, defaultFontSize])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (text.trim()) {
      onTextAdd(text.trim(), selectedFont.family, fontSize, selectedColor)
      // 모달 닫고 초기화
      setText('')
      setSelectedFont(fontOptions[0])
      setFontSize(defaultFontSize)
      setSelectedColor(colors[0])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">텍스트 추가</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Text Input & Preview */}
            <div className="col-span-5 space-y-4">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  텍스트 입력
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="여기에 텍스트를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.5',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                  rows={4}
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  미리보기
                </label>
                <div 
                  className="p-6 border border-gray-200 rounded-lg bg-gray-50 min-h-[100px] flex items-center justify-center text-center break-words"
                  style={{
                    fontFamily: selectedFont.family,
                    fontSize: `${Math.min(fontSize, 48)}px`, 
                    color: selectedColor,
                    lineHeight: '1.4',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {text || '텍스트를 입력해보세요'}
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="col-span-7 space-y-4">
              {/* Font Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  폰트 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {fontOptions.map((font, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFont(font)}
                      className={`p-2 border-2 rounded-lg text-left transition-colors ${
                        selectedFont === font
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
              <div className="grid grid-cols-2 gap-4">
                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    크기: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min={minFontSize}
                    max={maxFontSize}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{minFontSize}px</span>
                    <span>{maxFontSize}px</span>
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상 선택
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColor(color)}
                        className={`h-8 w-8 rounded-full border-2 ${
                          selectedColor === color
                            ? 'border-gray-900'
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
              text.trim()
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

export default TextModal