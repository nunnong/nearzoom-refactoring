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
      <div className="grid grid-cols-3 grid-rows-2 gap-x-4 gap-y-3 mb-4 mt-3 justify-items-center">
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