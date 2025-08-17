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
  // 실제 선택 가능한 최대 개수 (사진 수와 cutCount 중 작은 값)
  const actualMaxSelection = Math.min(cutCount, photos.length)
  
  const toggleSelect = (photo: string) => {
    let newSelected = [...selected]
    if (newSelected.includes(photo)) {
      newSelected = newSelected.filter(p => p !== photo)
    } else {
      if (newSelected.length < actualMaxSelection) {
        newSelected.push(photo)
      } else {
        // 최대 선택 개수에 도달하면 첫 번째 선택을 제거하고 새로운 것 추가
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
        사진 선택 ({selected.length}/{actualMaxSelection})
      </h3>
      
      {/* 사진 부족 경고 메시지 */}
      {cutCount > photos.length && photos.length > 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
          <p className="text-sm text-yellow-700">
            📸 {cutCount}컷을 선택하려면 {cutCount}장의 사진이 필요하지만, 현재 {photos.length}장만 촬영되었습니다.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            최대 {photos.length}장까지 선택 가능합니다.
          </p>
        </div>
      )}
      
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