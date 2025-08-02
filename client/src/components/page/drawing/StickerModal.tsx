'use client'

import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

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
  if (!isOpen) return null

  const stickerCategories = [
    {
      name: '이모지',
      stickers: [
        { name: 'heart', src: '/stickers/cute-heart.svg', label: '💖' },
        { name: 'star', src: '/stickers/star.svg', label: '⭐' },
        { name: 'smile', src: '/stickers/smile.svg', label: '😊' },
        { name: 'fire', src: '/stickers/fire.svg', label: '🔥' },
        { name: 'diamond', src: '/stickers/diamond.svg', label: '💎' },
        { name: 'lightning', src: '/stickers/lightning.svg', label: '⚡' },
      ]
    },
    {
      name: '귀여운',
      stickers: [
        { name: 'cat', src: '/stickers/cute-cat.svg', label: '🐱' },
        { name: 'dog', src: '/stickers/cute-dog.svg', label: '🐶' },
        { name: 'bear', src: '/stickers/cute-bear.svg', label: '🐻' },
        { name: 'rabbit', src: '/stickers/cute-rabbit.svg', label: '🐰' },
        { name: 'panda', src: '/stickers/cute-panda.svg', label: '🐼' },
        { name: 'koala', src: '/stickers/cute-koala.svg', label: '🐨' },
      ]
    },
    {
      name: '힙한',
      stickers: [
        { name: 'sunglasses', src: '/stickers/cool-sunglasses.svg', label: '😎' },
        { name: 'cool-star', src: '/stickers/cool-star.svg', label: '🌟' },
        { name: 'crown', src: '/stickers/cool-crown.svg', label: '👑' },
        { name: 'flame', src: '/stickers/cool-flame.svg', label: '🔥' },
        { name: 'rocket', src: '/stickers/cool-rocket.svg', label: '🚀' },
        { name: 'gem', src: '/stickers/cool-gem.svg', label: '💎' },
      ]
    }
  ]

  const handleStickerClick = (stickerSrc: string) => {
    onStickerSelect(stickerSrc)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">스티커 선택</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {stickerCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {category.name}
              </h4>
              <div className="grid grid-cols-6 gap-3">
                {category.stickers.map((sticker, index) => (
                  <button
                    key={index}
                    onClick={() => handleStickerClick(sticker.src)}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 text-2xl transition-all duration-200 hover:border-blue-500 hover:bg-blue-50 hover:scale-105"
                    title={sticker.name}
                  >
                    {sticker.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            스티커를 선택하면 캔버스 중앙에 추가됩니다
          </p>
        </div>
      </div>
    </div>
  )
}

export default StickerModal