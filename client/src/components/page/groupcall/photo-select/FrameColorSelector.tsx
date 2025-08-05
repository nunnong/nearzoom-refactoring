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
  return (
    <div className="text-center">
      <h3 className="mb-3 text-lg font-semibold text-[#2D3243]">프레임 색상</h3>
      <div className="flex justify-center gap-3">
        {palette.map(color => (
          <button
            key={color}
            className={`h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${
              frameColor === color
                ? 'border-[#2D3243] shadow-lg'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onFrameColorChange(color)}
          />
        ))}
      </div>
    </div>
  )
}