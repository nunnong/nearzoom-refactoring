'use client'

import Image from 'next/image'

interface PhotoPickerProps {
  photos: string[]
  cutCount: number
  selected: string[]
  onSelect: (selected: string[]) => void
}

export default function PhotoPicker({
  photos,
  cutCount,
  selected,
  onSelect,
}: PhotoPickerProps) {
  const toggleSelect = (photo: string) => {
    let newSelected = [...selected]
    if (newSelected.includes(photo)) {
      newSelected = newSelected.filter(p => p !== photo)
    } else {
      if (newSelected.length < cutCount) {
        newSelected.push(photo)
      } else {
        newSelected.shift()
        newSelected.push(photo)
      }
    }
    onSelect(newSelected)
  }

  const getPhotoOrder = (photo: string) => {
    const index = selected.indexOf(photo)
    return index >= 0 ? index + 1 : null
  }

  return (
    <div>
      <h3 className="mb-3 text-center text-lg font-semibold text-gray-800">
        사진 선택 ({selected.length}/{cutCount})
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {photos.map((photo, idx) => {
          const order = getPhotoOrder(photo)
          const isSelected = selected.includes(photo)

          return (
            <div
              key={photo}
              className="group relative cursor-pointer"
              onClick={() => toggleSelect(photo)}
            >
              <div
                className={`relative overflow-hidden rounded-xl border-4 transition-all duration-200 ${
                  isSelected
                    ? 'scale-[1.02] transform border-[#C4C8DA] shadow-lg'
                    : 'border-white hover:border-[#C4C8DA] hover:shadow-md'
                } `}
              >
                <Image
                  src={photo}
                  alt={`촬영된 사진 ${idx + 1}`}
                  className="h-64 w-full object-cover"
                  width={400}
                  height={256}
                  draggable={false}
                />

                {/* 선택 순서 표시 */}
                {isSelected && order && (
                  <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#2d3243] text-sm font-bold text-white shadow-lg">
                    {order}
                  </div>
                )}

                {/* 호버 효과 */}
                {!isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/10">
                    <div className="h-8 w-8 rounded-full border-2 border-white opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="h-full w-full rounded-full bg-white/20"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}