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
      <div className="grid grid-cols-3 gap-6 mb-8 mt-6 w-fit mx-auto">
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
    </div>
  )
}