'use client'

import { cn } from '@/lib/utils'

interface ColorPaletteProps {
  selectedColor: string
  onColorSelect: (color: string) => void
  className?: string
}

const backgroundColors = [
  '#C8B5FF',
  '#E8E8FF', 
  '#B5E8E8',
  '#B5C8FF',
  '#B5FFB5',
  '#FFFAB5',
  '#FFFFFF',
  '#FFE8B5',
  '#FFB5E8',
  '#F0F0F0',
]

export default function ColorPalette({
  selectedColor,
  onColorSelect,
  className = '',
}: ColorPaletteProps) {
  const handleHexChange = (value: string) => {
    // HEX 유효성 검사 (3자리 또는 6자리)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
      onColorSelect(value)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 프리셋 색상 선택 팔레트 */}
      <div className="flex justify-center">
        <div className="grid grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {backgroundColors.map(color => (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              className={cn(
                'h-6 w-6 rounded-lg border-2 transition-all hover:scale-110 sm:h-6 sm:w-6 lg:h-8 lg:w-8',
                selectedColor === color
                  ? 'scale-110 border-[#2D3243] shadow-lg'
                  : 'border-gray-300 hover:border-gray-400'
              )}
              style={{ backgroundColor: color }}
              aria-label={`배경색 ${color} 선택`}
            />
          ))}
        </div>
      </div>

      {/* 구분선 */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-3 text-xs text-gray-500">또는</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
      
      {/* 커스텀 색상 선택 */}
      <div className="flex items-center justify-center gap-3">
        <label className="text-sm text-gray-600">커스텀:</label>
        <input 
          type="color" 
          value={selectedColor}
          onChange={(e) => onColorSelect(e.target.value)}
          className="h-10 w-20 cursor-pointer rounded border border-gray-300"
          title="색상 선택기"
        />
        <input
          type="text"
          value={selectedColor}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          pattern="^#[0-9A-Fa-f]{6}$"
          title="HEX 색상 코드 입력"
        />
      </div>

      {/* 선택된 색상 표시 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <div 
            className="h-4 w-4 rounded border border-gray-300"
            style={{ backgroundColor: selectedColor }}
          />
          <span>선택된 색상: {selectedColor}</span>
        </div>
      </div>
    </div>
  )
}