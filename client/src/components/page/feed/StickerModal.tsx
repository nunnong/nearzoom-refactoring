'use client'

import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'

interface StickerModalProps {
  isOpen: boolean
  onClose: () => void
  onStickerSelect: (stickerSrc: string) => void
}

// ✅ 기본 스티커 데이터를 상수로 분리
const DEFAULT_STICKERS = [
  'LOL2 1.png',
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
  'Rectangle 3463861.svg',
  'Rectangle 3463862.png',
  'Rectangle 3463862.svg',
  'Rectangle 3463863.png',
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
  'Rectangle 3463887.png',
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
  'lol1 1.png',
  'pink_nearzoom 1.png',
  'smile.svg',
  'star.svg',
  '꼬깔모자 1.png',
  '날아라 육공오 1.png',
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
  '복숭아 1.png',
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
] as const

// ✅ 커스텀 스티커 타입 정의
interface CustomSticker {
  id: string
  src: string
  name: string
  createdAt: string
}

// ✅ 파일 검증 함수
const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: '이미지 파일만 업로드 가능합니다.' }
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB 제한
    return { isValid: false, error: '파일 크기는 5MB 이하여야 합니다.' }
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'JPG, PNG, GIF, SVG, WebP 파일만 지원됩니다.' }
  }
  
  return { isValid: true }
}

// ✅ 로컬 스토리지 안전 접근 함수들
const safeGetLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error)
    return null
  }
}

const safeSetLocalStorage = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Failed to set ${key} to localStorage:`, error)
    return false
  }
}

const StickerModal: React.FC<StickerModalProps> = ({
  isOpen,
  onClose,
  onStickerSelect,
}) => {
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'default' | 'custom'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ 커스텀 스티커 로드
  useEffect(() => {
    if (isOpen) {
      const savedStickers = safeGetLocalStorage('custom_stickers')
      if (savedStickers) {
        try {
          const parsedStickers = JSON.parse(savedStickers)
          setCustomStickers(Array.isArray(parsedStickers) ? parsedStickers : [])
        } catch (error) {
          console.error('Failed to parse custom stickers:', error)
          setCustomStickers([])
        }
      }
    }
  }, [isOpen])

  // ✅ 에러 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // ✅ 모달 닫을 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedCategory('all')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  // ✅ 기본 스티커 클릭 핸들러
  const handleStickerClick = useCallback((fileName: string) => {
    try {
      const stickerSrc = `/stickers/${fileName}`
      onStickerSelect(stickerSrc)
      onClose()
    } catch (error) {
      console.error('Failed to select sticker:', error)
      setError('스티커 선택에 실패했습니다.')
    }
  }, [onStickerSelect, onClose])

  // ✅ 커스텀 스티커 클릭 핸들러
  const handleCustomStickerClick = useCallback((stickerSrc: string) => {
    try {
      onStickerSelect(stickerSrc)
      onClose()
    } catch (error) {
      console.error('Failed to select custom sticker:', error)
      setError('커스텀 스티커 선택에 실패했습니다.')
    }
  }, [onStickerSelect, onClose])

  // ✅ 파일 업로드 핸들러
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      setError(validation.error || '파일이 유효하지 않습니다.')
      return
    }

    setIsLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        const newSticker: CustomSticker = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          src: result,
          name: file.name,
          createdAt: new Date().toISOString()
        }

        const updatedStickers = [...customStickers, newSticker]
        setCustomStickers(updatedStickers)
        
        if (!safeSetLocalStorage('custom_stickers', JSON.stringify(updatedStickers))) {
          setError('커스텀 스티커 저장에 실패했습니다.')
        }
      }
      setIsLoading(false)
    }

    reader.onerror = () => {
      setError('파일을 읽는 중 오류가 발생했습니다.')
      setIsLoading(false)
    }

    reader.readAsDataURL(file)
    
    // ✅ 같은 파일 재선택 가능하도록 값 초기화
    event.target.value = ''
  }, [customStickers])

  // ✅ 파일 업로드 트리거
  const triggerFileUpload = useCallback(() => {
    if (!isLoading) {
      fileInputRef.current?.click()
    }
  }, [isLoading])

  // ✅ 커스텀 스티커 삭제
  const deleteCustomSticker = useCallback((stickerId: string) => {
    if (!confirm('정말 이 스티커를 삭제하시겠습니까?')) return

    try {
      const filteredStickers = customStickers.filter(sticker => sticker.id !== stickerId)
      setCustomStickers(filteredStickers)
      
      if (!safeSetLocalStorage('custom_stickers', JSON.stringify(filteredStickers))) {
        setError('스티커 삭제를 저장할 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to delete custom sticker:', error)
      setError('스티커 삭제에 실패했습니다.')
    }
  }, [customStickers])

  // ✅ 스티커 필터링 로직
  const filteredStickers = useMemo(() => {
    const defaultStickers = DEFAULT_STICKERS.map(fileName => ({
      type: 'default' as const,
      fileName,
      src: `/stickers/${fileName}`,
      name: fileName.split('.')[0]
    }))

    const customStickerItems = customStickers.map(sticker => ({
      type: 'custom' as const,
      id: sticker.id,
      src: sticker.src,
      name: sticker.name,
      createdAt: sticker.createdAt
    }))

    let allStickers = [...defaultStickers, ...customStickerItems]

    // 카테고리 필터
    if (selectedCategory === 'default') {
      allStickers = allStickers.filter(item => item.type === 'default')
    } else if (selectedCategory === 'custom') {
      allStickers = allStickers.filter(item => item.type === 'custom')
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      allStickers = allStickers.filter(item => 
        item.name.toLowerCase().includes(query)
      )
    }

    return allStickers
  }, [customStickers, selectedCategory, searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">스티커 선택</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ✅ 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex-shrink-0">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ✅ 검색 및 필터 */}
        <div className="p-4 border-b flex-shrink-0 space-y-3">
          <input
            type="text"
            placeholder="스티커 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          
          <div className="flex gap-2">
            {[
              { key: 'all', label: '전체', icon: '🎨' },
              { key: 'default', label: '기본', icon: '📦' },
              { key: 'custom', label: '커스텀', icon: '⭐' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as typeof selectedCategory)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-6 gap-4">
            {/* 커스텀 스티커 업로드 버튼 */}
            <button
              onClick={triggerFileUpload}
              disabled={isLoading}
              className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                isLoading
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-blue-300 bg-blue-50 hover:scale-105 hover:border-blue-500 hover:bg-blue-100'
              }`}
              title="커스텀 스티커 추가"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              ) : (
                <PlusIcon className="h-8 w-8 text-blue-500" />
              )}
            </button>

            {/* 필터된 스티커들 */}
            {filteredStickers.map((item, index) => (
              <div key={item.type === 'custom' ? item.id : `default-${index}`} className="group relative">
                <button
                  onClick={() => 
                    item.type === 'custom' 
                      ? handleCustomStickerClick(item.src)
                      : handleStickerClick((item as any).fileName)
                  }
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                    item.type === 'custom'
                      ? 'border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100'
                      : 'border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                  title={item.name}
                >
                  <img
                    src={item.src}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        const fallback = document.createElement('span')
                        fallback.className = 'text-xs text-gray-500 text-center p-1'
                        fallback.textContent = item.name.length > 8 ? `${item.name.slice(0, 8)}...` : item.name
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                </button>
                
                {/* 커스텀 스티커 삭제 버튼 */}
                {item.type === 'custom' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCustomSticker(item.id!)
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-600"
                    title="스티커 삭제"
                    aria-label="스티커 삭제"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ✅ 빈 상태 표시 */}
          {filteredStickers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory !== 'all' ? '검색 결과가 없습니다' : '스티커가 없습니다'}
              </h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== 'all'
                  ? '다른 검색어나 필터를 시도해보세요'
                  : '+ 버튼을 클릭해서 커스텀 스티커를 추가해보세요'
                }
              </p>
            </div>
          )}

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
        <div className="border-t bg-gray-50 p-4 flex-shrink-0">
          <p className="text-center text-xs text-gray-500">
            스티커를 선택하면 캔버스에 추가됩니다 • + 버튼을 클릭해서 커스텀 스티커를 업로드하세요 (최대 5MB)
          </p>
        </div>
      </div>
    </div>
  )
}

export default StickerModal