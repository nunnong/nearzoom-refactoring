import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface LineData {
  points: number[]
  stroke: string
  strokeWidth: number
}

interface StickerData {
  id: string
  x: number
  y: number
  src: string
  width: number
  height: number
  rotation?: number
}

interface TextData {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fill: string
  rotation?: number
}

export const useDrawingState = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [imageId, setImageId] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [originalImageSize, setOriginalImageSize] = useState({ width: 800, height: 600 })
  const [isClient, setIsClient] = useState(false)
  const [stickers, setStickers] = useState<StickerData[]>([])
  const [texts, setTexts] = useState<TextData[]>([])
  const [hasChanges, setHasChanges] = useState<boolean>(false)
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)

  // 모달 상태
  const [stickerModalOpen, setStickerModalOpen] = useState<boolean>(false)
  const [textModalOpen, setTextModalOpen] = useState<boolean>(false)
  const [textClickPosition, setTextClickPosition] = useState<{x: number, y: number} | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false)

  // 클라이언트 사이드에서만 렌더링하도록 설정
  useEffect(() => {
    setIsClient(true)
  }, [])

  // URL에서 이미지 ID와 src 파라미터 가져오기
  useEffect(() => {
    const id = searchParams.get('id')
    const src = searchParams.get('src')

    if (id) setImageId(id)
    if (src) {
      const imgSrc = decodeURIComponent(src)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setOriginalImage(img)
        setOriginalImageSize({
          width: img.width,
          height: img.height,
        })
        
        const maxWidth = Math.min(img.width, 1200)
        const maxHeight = Math.min(img.height, 800)
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height)

        setStageSize({
          width: img.width * scale,
          height: img.height * scale,
        })
      }
      img.src = imgSrc
    }
  }, [searchParams])

  // 브라우저 뒤로가기 및 페이지 이동 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = '편집 중인 내용이 있습니다. 정말로 나가시겠습니까?'
        return '편집 중인 내용이 있습니다. 정말로 나가시겠습니까?'
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      if (hasChanges) {
        e.preventDefault()
        window.history.pushState(null, '', window.location.href)
        setShowExitConfirm(true)
      }
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasChanges])

  const calculateFontSize = useCallback((ratio: number) => {
    const diagonal = Math.sqrt(originalImageSize.width ** 2 + originalImageSize.height ** 2)
    return Math.round(diagonal * ratio)
  }, [originalImageSize])

  const addSticker = useCallback((stickerSrc: string) => {
    const newSticker: StickerData = {
      id: Date.now().toString(),
      x: stageSize.width / 2 - 25,
      y: stageSize.height / 2 - 25,
      src: stickerSrc,
      width: 50,
      height: 50,
      rotation: 0,
    }
    setHasChanges(true)
    setStickers(prev => [...prev, newSticker])
    return newSticker
  }, [stageSize])

  const deleteSticker = useCallback((stickerId: string) => {
    setHasChanges(true)
    setStickers(prev => prev.filter(sticker => sticker.id !== stickerId))
  }, [])

  const updateSticker = useCallback((stickerId: string, updates: Partial<StickerData>) => {
    setHasChanges(true)
    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId ? { ...sticker, ...updates } : sticker
      )
    )
  }, [])

  const addText = useCallback((text: string, fontFamily: string, fontSize: number, color: string) => {
    if (!textClickPosition || !text.trim()) return null
    
    const newText: TextData = {
      id: Date.now().toString(),
      x: textClickPosition.x,
      y: textClickPosition.y,
      text: text,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fill: color,
      rotation: 0,
    }
    setHasChanges(true)
    setTexts(prev => [...prev, newText])
    return newText
  }, [textClickPosition])

  const deleteText = useCallback((textId: string) => {
    setHasChanges(true)
    setTexts(prev => prev.filter(text => text.id !== textId))
    if (selectedTextId === textId) {
      setSelectedTextId(null)
    }
  }, [selectedTextId])

  const updateText = useCallback((textId: string, updates: Partial<TextData>) => {
    setHasChanges(true)
    setTexts(prev =>
      prev.map(text =>
        text.id === textId ? { ...text, ...updates } : text
      )
    )
  }, [])

  const clearCanvas = useCallback(() => {
    if (lines.length > 0 || stickers.length > 0) {
      setHasChanges(true)
      setLines([])
      setStickers([])
    }
  }, [lines.length, stickers.length])

  const goBack = useCallback(() => {
    if (hasChanges) {
      setShowExitConfirm(true)
    } else {
      const returnUrl = searchParams.get('returnUrl') || '/myroom'
      router.push(returnUrl)
    }
  }, [hasChanges, router, searchParams])

  const handleExitConfirm = useCallback(() => {
    setShowExitConfirm(false)
    const returnUrl = searchParams.get('returnUrl') || '/myroom'
    router.push(returnUrl)
  }, [router, searchParams])

  return {
    // State
    imageId,
    originalImage,
    lines,
    stageSize,
    originalImageSize,
    isClient,
    stickers,
    texts,
    hasChanges,
    selectedStickerId,
    selectedTextId,
    stickerModalOpen,
    textModalOpen,
    textClickPosition,
    showExitConfirm,
    
    // Setters
    setLines,
    setHasChanges,
    setSelectedStickerId,
    setSelectedTextId,
    setStickerModalOpen,
    setTextModalOpen,
    setTextClickPosition,
    setShowExitConfirm,
    
    // Actions
    calculateFontSize,
    addSticker,
    deleteSticker,
    updateSticker,
    addText,
    deleteText,
    updateText,
    clearCanvas,
    goBack,
    handleExitConfirm,
  }
}