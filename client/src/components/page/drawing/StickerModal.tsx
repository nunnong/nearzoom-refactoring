'use client'

import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import React, { useState, useRef } from 'react'

interface StickerModalProps {
  isOpen: boolean
  onClose: () => void
  onStickerSelect: (stickerSrc: string) => void
}

const StickerModal: React.FC<StickerModalProps> = ({
  isOpen,
  onClose,
  onStickerSelect,
}) => {
  const [customStickers, setCustomStickers] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // 실제 파일 시스템에 있는 모든 스티커 파일들
  const allStickers = [
    'Group 1010107372.png',
    'Group 1010107373.png',
    'Home.png',
    'Book.png',
    'Box.png',
    'Rectangle 3463852.png',
    'Rectangle 3463853.png',
    'Rectangle 3463854.png',
    'Rectangle 3463855.png',
    'Rectangle 3463856.png',
    'Rectangle 3463856.svg',
    'Rectangle 3463857.png',
    'Rectangle 3463857.svg',
    'Rectangle 3463858.png',
    'Rectangle 3463858.svg',
    'Rectangle 3463859.png',
    'Rectangle 3463859.svg',
    'Rectangle 3463860.png',
    'Rectangle 3463860.svg',
    'Rectangle 3463861.png',
    'Rectangle 3861.svg',
    'Rectangle 3463869.png',
    'Rectangle 3463870.png',
    'Rectangle 3463873.png',
    'Rectangle 3463874.png',
    'Rectangle 3463875.png',
    'Rectangle 3463876.png',
    'Rectangle 3463877.png',
    'Rectangle 3463878.png',
    'Rectangle 3463879.png',
    'Rectangle 3463880.png',
    'Rectangle 3463881.png',
    'Rectangle 3463882.png',
    'Rectangle 3463883.png',
    'Rectangle 3463884.png',
    'Rectangle 3463885.png',
    'Rectangle 3463886.png',
    'Rectangle 3463888.png',
    'Rectangle 3463889.png',
    'Rectangle 3463890.png',
    'Rectangle 3463891.png',
    'Rectangle 3463892.png',
    'Rectangle 3463893.png',
    'Rectangle 3463894.png',
    'Rectangle 3463895.png',
    'Rectangle 3463896.png',
    'Rectangle 3463897.png',
    'Rectangle 3463898.png',
    'cute-heart.svg',
    'diamond.svg',
    'fire.svg',
    'image 61.png',
    'image 62.png',
    'image 63.png',
    'image 64.png',
    'image 65.png',
    'image 66.png',
    'image 67.png',
    'image 68.png',
    'image 69.png',
    'image 70.png',
    'image 71.png',
    'image 72.png',
    'image 73.png',
    'image 74.png',
    'image 75.png',
    'image 76.png',
    'image 77.png',
    'image 78.png',
    'image 79.png',
    'lightning.svg',
    'pink_nearzoom 1.png',
    'smile.svg',
    'star.svg',
    'S.png',
    'T.png',
    'U.png',
    'V.png',
    'W.png',
    'X.png',
    'Y.png',
    'Z.png',
    '꼬깔모자 1.png',
    '눈 1.png',
    '돼지1 1.png',
    '돼지2 1.png',
    '루돌프 1.png',
    '리본1 1.png',
    '맥주 1.png',
    '모찌1 1.png',
    '베레모 1.png',
    '별1 1.png',
    '별2 1.png',
    '별똥별 1.png',
    '소주 1.png',
    '수염1 1.png',
    '수엽2 1.png',
    '안경1 1.png',
    '안경2 1.png',
    '안경3 1.png',
    '왕관 1.png',
    '커비 1.png',
    '케이크 1.png',
    '크리스마스 트리 1.png',
    '클로버1 1.png',
    '클로버2 1.png',
    '탁원❤️마루1.png',
    '탁원❤️마루2.png',
    '탁원❤️마루3.png',
    '탁원❤️마루4.png',
    '태극기 1.png',
    '폭죽1 1.png',
    '폭죽2 1.png',
    '폭죽3 1.png',
    '푸팅 1.png'
  ]

  const handleStickerClick = (fileName: string) => {
    const stickerSrc = `/stickers/${fileName}`
    onStickerSelect(stickerSrc)
    onClose()
  }

  const handleCustomStickerClick = (stickerSrc: string) => {
    onStickerSelect(stickerSrc)
    onClose()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        if (result) {
          setCustomStickers(prev => [...prev, result])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const deleteCustomSticker = (index: number) => {
    setCustomStickers(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">스티커 선택</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid grid-cols-6 gap-4">
            {/* 커스텀 스티커 업로드 버튼 */}
            <button
              onClick={triggerFileUpload}
              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 transition-all duration-200 hover:scale-105 hover:border-blue-500 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              title="커스텀 스티커 추가"
            >
              <PlusIcon className="h-8 w-8 text-blue-500" />
            </button>

            {/* 커스텀 스티커들 */}
            {customStickers.map((stickerSrc, index) => (
              <div key={`custom-${index}`} className="group relative">
                <button
                  onClick={() => handleCustomStickerClick(stickerSrc)}
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-green-200 bg-green-50 transition-all duration-200 hover:scale-105 hover:border-green-500 hover:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                  title={`커스텀 스티커 ${index + 1}`}
                >
                  <img
                    src={stickerSrc}
                    alt={`커스텀 스티커 ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
                {/* 삭제 버튼 */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    deleteCustomSticker(index)
                  }}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-600"
                  title="스티커 삭제"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* 기본 스티커들 */}
            {allStickers.map((fileName, index) => (
              <button
                key={index}
                onClick={() => handleStickerClick(fileName)}
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 transition-all duration-200 hover:scale-105 hover:border-blue-500 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                title={fileName}
              >
                <img
                  src={`/stickers/${fileName}`}
                  alt={fileName}
                  className="h-full w-full object-contain"
                  onError={e => {
                    // 이미지 로딩 실패 시 파일명 표시
                    e.currentTarget.style.display = 'none'
                    const nextElement = e.currentTarget.nextElementSibling
                    if (nextElement && nextElement instanceof HTMLElement) {
                      nextElement.style.display = 'flex'
                    }
                  }}
                />
                <span
                  className="hidden h-full w-full items-center justify-center p-1 text-center text-xs text-gray-500"
                  style={{ display: 'none' }}
                >
                  {fileName.split('.')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <p className="text-center text-xs text-gray-500">
            스티커를 선택하면 캔버스 중앙에 추가됩니다 • + 버튼을 클릭해서
            커스텀 스티커를 업로드하세요
          </p>
        </div>
      </div>
    </div>
  )
}

export default StickerModal
