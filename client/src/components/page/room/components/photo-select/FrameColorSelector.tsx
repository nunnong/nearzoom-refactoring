'use client'

interface FrameColorSelectorProps {
  frameColor: string
  onFrameColorChange: (color: string) => void
  palette: string[]
}

export default function FrameColorSelector({
  frameColor,
  onFrameColorChange,
  palette,
}: FrameColorSelectorProps) {
  const handleHexChange = (value: string) => {
    // HEX 유효성 검사 (3자리 또는 6자리)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
      onFrameColorChange(value)
    }
  }

  return (
    <div className="text-center">
      <h3 className="mb-3 text-lg font-semibold text-gray-800">프레임 색상</h3>
      
      {/* 프리셋 색상들 */}
      <div className="grid grid-cols-3 gap-6 mb-6 mt-6 w-fit mx-auto">
        {palette.map(color => (
          <button
            key={color}
            className={`h-8 w-8 rounded-lg border-1 transition-all hover:scale-110 ${
              frameColor === color
                ? 'border-[#2d3243] border-2 shadow-lg'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onFrameColorChange(color)}
          />
        ))}
      </div>
      
      {/* 구분선 */}
      <div className="mb-4 flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-3 text-xs text-gray-500">또는</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
      
      {/* 커스텀 색상 선택 */}
      <div className="flex items-center justify-center gap-3">
        <label className="text-sm text-gray-600">커스텀:</label>
        <input 
          type="color" 
          value={frameColor}
          onChange={(e) => onFrameColorChange(e.target.value)}
          className="h-10 w-20 cursor-pointer rounded border border-gray-300"
          title="색상 선택기"
        />
        <input
          type="text"
          value={frameColor}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          pattern="^#[0-9A-Fa-f]{6}$"
          title="HEX 색상 코드 입력"
        />
      </div>
    </div>
  )
}