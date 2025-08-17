'use client'

import Image from 'next/image'

interface PhotoPickerProps {
  photos: string[]
  selected: string[]
  onSelect: (selected: string[]) => void
}

export default function PhotoPicker({
  photos,
  selected,
  onSelect,
}: PhotoPickerProps) {
  const toggleSelect = (photo: string) => {
    let newSelected = [...selected]
    if (newSelected.includes(photo)) {
      newSelected = newSelected.filter(p => p !== photo)
    } else {
      // 자유 선택 - 제한 없음
      newSelected.push(photo)
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
        사진 선택 ({selected.length}장 선택됨)
      </h3>
      
      {/* 선택 안내 메시지 */}
      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
        <p className="text-sm text-blue-700">
          📸 1장, 2장 또는 4장을 선택하세요.
        </p>
        {selected.length > 0 && ![1, 2, 4].includes(selected.length) && (
          <p className="text-xs text-orange-600 mt-1">
            현재 {selected.length}장 선택됨 - 유효한 개수가 아닙니다.
          </p>
        )}
      </div>
      
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
                {/* 1:1 정사각형 비율로 고정된 컨테이너 */}
                <div className="aspect-square relative">
                  <Image
                    src={photo}
                    alt={`촬영된 사진 ${idx + 1}`}
                    fill
                    className="object-cover"
                    draggable={false}
                  />
                </div>

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