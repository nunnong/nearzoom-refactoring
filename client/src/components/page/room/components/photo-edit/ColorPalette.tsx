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
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 색상 선택 팔레트 */}
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