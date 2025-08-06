import { useState, useCallback } from 'react'
import { ToolType } from '@/components/page/drawing/DrawingToolbar'

export const useDrawingTools = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('brush')
  const [currentColor, setCurrentColor] = useState<string>('#000000')
  const [brushSize, setBrushSize] = useState<number>(5)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [lastPointerPosition, setLastPointerPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const colors = [
    '#000000', // 블랙 - 기본
    '#FFFFFF', // 화이트 - 기본
    '#DC2626', // 진한 빨강 - 강렬하고 선명
    '#EA580C', // 진한 주황 - 활기찬 오렌지
    '#CA8A04', // 진한 노랑 - 골드 느낌
    '#16A34A', // 진한 초록 - 자연적이고 선명
    '#0EA5E9', // 진한 파랑 - 깊고 신뢰감 있는
    '#7C3AED', // 진한 보라 - 신비롭고 강렬
    '#DB2777', // 진한 핑크 - 매력적이고 생동감
    '#0D9488', // 진한 청록 - 모던하고 세련된
    '#BE123C', // 진한 로즈 - 우아하고 강렬
    '#6366F1', // 진한 인디고 - 프로페셔널한 느낌
  ]

  const brushSizes = [2, 5, 10, 15, 20]

  const fontOptions = [
    { name: '깔끔', family: 'var(--font-noto-sans-kr), sans-serif', displayName: 'Noto Sans KR' },
    { name: '귀여움', family: 'var(--font-jua), cursive', displayName: 'Jua' },
    { name: '힙함', family: 'var(--font-black-han-sans), sans-serif', displayName: 'Black Han Sans' },
    { name: '손글씨', family: 'var(--font-gamja-flower), cursive', displayName: 'Gamja Flower' },
    { name: '삐뚤빼뚤', family: 'var(--font-gaegu), cursive', displayName: 'Gaegu' },
    { name: '기본', family: 'Arial, sans-serif', displayName: 'Arial' },
  ]

  const toggleStickerMode = useCallback(() => {
    if (activeTool === 'sticker') {
      return 'openModal'
    } else {
      setActiveTool('sticker')
      return 'setModeAndOpenModal'
    }
  }, [activeTool])

  const toggleTextMode = useCallback(() => {
    setActiveTool('text')
    return 'openModal'
  }, [])

  return {
    activeTool,
    currentColor,
    brushSize,
    isDrawing,
    lastPointerPosition,
    colors,
    brushSizes,
    fontOptions,
    setActiveTool,
    setCurrentColor,
    setBrushSize,
    setIsDrawing,
    setLastPointerPosition,
    toggleStickerMode,
    toggleTextMode,
  }
}