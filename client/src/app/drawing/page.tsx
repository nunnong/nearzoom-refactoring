'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { saveImageToLocal, updateImageInLocal } from '@/utils/localStorage'
import {
  ArrowLeftIcon,
  PaintBrushIcon,
  SwatchIcon,
  TrashIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline'

// Konva 컴포넌트들을 동적으로 import
const KonvaCanvas = dynamic(() => import('../../components/KonvaCanvas'), {
  ssr: false,
})

const StickerModal = dynamic(
  () => import('../../components/page/drawing/StickerModal'),
  { ssr: false }
)

interface DrawingPageProps {}

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
}

const DrawingPage: React.FC<DrawingPageProps> = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stageRef = useRef<any>(null)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentColor, setCurrentColor] = useState<string>('#000000')
  const [brushSize, setBrushSize] = useState<number>(5)
  const [imageId, setImageId] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  )
  const [lines, setLines] = useState<LineData[]>([])
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isClient, setIsClient] = useState(false)
  const [stickers, setStickers] = useState<StickerData[]>([])
  const [activeTool, setActiveTool] = useState<'brush'>('brush')
  const [history, setHistory] = useState<
    { lines: LineData[]; stickers: StickerData[] }[]
  >([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [lastPointerPosition, setLastPointerPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [hasChanges, setHasChanges] = useState<boolean>(false)
  const [stickerModalOpen, setStickerModalOpen] = useState<boolean>(false)

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
        // 이미지 크기에 맞게 스테이지 크기 조정
        const maxWidth = Math.min(img.width, 1200)
        const maxHeight = Math.min(img.height, 800)
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height)

        setStageSize({
          width: img.width * scale,
          height: img.height * scale,
        })

        // 이미지 로드 후 초기 빈 상태를 히스토리에 저장
        const initialState = { lines: [], stickers: [] }
        setHistory([initialState])
        setHistoryStep(0)
      }
      img.src = imgSrc
    }
  }, [searchParams])

  const colors = [
    '#000000', // 블랙 - 기본
    '#FFFFFF', // 화이트 - 기본
    '#e879f9', // bg-fuchsia-400 - 비비드한 핫핑크, 인스타감성 최고
    '#67e8f9', // bg-cyan-300 - 청량한 민트블루, Y2K 무드
    '#bef264', // bg-lime-300 - 네온 라임, 힙하고 눈에 확 띄는 색
    '#a78bfa', // bg-violet-400 - 몽환적 바이올렛, 우주소녀 느낌
    '#fda4af', // bg-rose-300 - 부드러운 더스티핑크, 빈티지 감성
    '#fcd34d', // bg-amber-300 - 따뜻한 허니골드, 레트로 무드
    '#34d399', // bg-emerald-400 - 선명한 에메랄드, 세련된 그린
    '#60a5fa', // bg-sky-400 - 맑은 하늘색, 청춘 느낌
    '#f472b6', // bg-pink-400 - 클래식 핑크, 귀여운 느낌의 대표
    '#818cf8', // bg-indigo-400 - 깊은 인디고, 신비로운 분위기
  ]

  const brushSizes = [2, 5, 10, 15, 20]

  const openStickerModal = () => {
    setStickerModalOpen(true)
  }

  const closeStickerModal = () => {
    setStickerModalOpen(false)
  }

  // 히스토리에 현재 상태 저장
  const saveToHistory = () => {
    const currentState = { lines: [...lines], stickers: [...stickers] }
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(currentState)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  // 실행취소
  const undo = () => {
    if (historyStep > 0) {
      const previousState = history[historyStep - 1]
      setLines(previousState.lines)
      setStickers(previousState.stickers)
      setHistoryStep(historyStep - 1)
      // undo로 첫 번째 상태(빈 상태)로 돌아간 경우 hasChanges를 false로 설정
      if (
        historyStep - 1 === 0 &&
        previousState.lines.length === 0 &&
        previousState.stickers.length === 0
      ) {
        setHasChanges(false)
      } else {
        setHasChanges(true)
      }
    }
  }

  // 다시실행
  const redo = () => {
    if (historyStep < history.length - 1) {
      const nextState = history[historyStep + 1]
      setLines(nextState.lines)
      setStickers(nextState.stickers)
      setHistoryStep(historyStep + 1)
      setHasChanges(true) // redo도 변경사항으로 간주
    }
  }

  const handleMouseDown = (e: any) => {
    setIsDrawing(true)
    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      saveToHistory() // 그리기 시작 전 히스토리 저장
      setHasChanges(true) // 변경사항 있음을 표시
      setLastPointerPosition(pos)
      setLines([
        ...lines,
        {
          points: [pos.x, pos.y],
          stroke: currentColor,
          strokeWidth: brushSize,
        },
      ])
    }
  }

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return

    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point || !lastPointerPosition) return

    // 거리 기반 샘플링으로 더 부드러운 선 생성
    const distance = Math.sqrt(
      Math.pow(point.x - lastPointerPosition.x, 2) +
        Math.pow(point.y - lastPointerPosition.y, 2)
    )

    // 최소 거리 이상일 때만 점 추가 (더 부드러운 곡선을 위해)
    if (distance > 1) {
      const lastLine = lines[lines.length - 1]
      if (lastLine) {
        // 보간점들을 추가해서 더 부드러운 선 생성
        const interpolatedPoints: number[] = []
        const steps = Math.max(1, Math.floor(distance / 2))

        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const x =
            lastPointerPosition.x + (point.x - lastPointerPosition.x) * t
          const y =
            lastPointerPosition.y + (point.y - lastPointerPosition.y) * t
          interpolatedPoints.push(x, y)
        }

        const newPoints = lastLine.points.concat(interpolatedPoints)
        const newLines = [...lines]
        newLines[newLines.length - 1] = { ...lastLine, points: newPoints }
        setLines(newLines)
        setLastPointerPosition(point)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setLastPointerPosition(null)
  }

  const addSticker = (stickerSrc: string) => {
    const newSticker: StickerData = {
      id: Date.now().toString(),
      x: stageSize.width / 2 - 25, // 중앙에 배치
      y: stageSize.height / 2 - 25,
      src: stickerSrc,
      width: 50,
      height: 50,
    }
    saveToHistory() // 스티커 추가 전 히스토리 저장
    setHasChanges(true) // 변경사항 있음을 표시
    setStickers([...stickers, newSticker])
  }

  const deleteSticker = (stickerId: string) => {
    saveToHistory() // 스티커 삭제 전 히스토리 저장
    setHasChanges(true) // 변경사항 있음을 표시
    setStickers(stickers.filter(sticker => sticker.id !== stickerId))
  }

  const updateSticker = (stickerId: string, updates: Partial<StickerData>) => {
    setHasChanges(true) // 변경사항 있음을 표시
    setStickers(
      stickers.map(sticker =>
        sticker.id === stickerId ? { ...sticker, ...updates } : sticker
      )
    )
  }

  const clearCanvas = () => {
    if (lines.length > 0 || stickers.length > 0) {
      saveToHistory() // 초기화 전 히스토리 저장
      setHasChanges(true) // 변경사항 있음을 표시
      setLines([])
      setStickers([])
    }
  }

  const saveDrawing = () => {
    if (!stageRef.current) return

    // 변경사항이 없으면 저장하지 않고 경고 메시지 표시
    if (!hasChanges) {
      alert('변경사항이 없습니다. 이미지를 편집한 후 저장해주세요.')
      return
    }

    // Konva 스테이지를 이미지로 변환
    const dataURL = stageRef.current.toDataURL({
      mimeType: 'image/png',
      quality: 1,
    })

    // 새로운 사본 이미지 ID 생성
    const newImageId = `${imageId}_edited_${Date.now()}`

    try {
      console.log('💾 Starting save process...')
      console.log('📝 Original image ID:', imageId)
      console.log('🆕 New image ID:', newImageId)

      // 편집된 이미지를 localStorage에 저장
      const newImage = {
        id: newImageId,
        src: dataURL,
        alt: `편집된 이미지 (원본: ${imageId})`,
        isLiked: false,
        isEdited: true,
        hashtags: [], // 나중에 원본 해시태그를 복사할 예정
      }

      console.log('💾 Saving new edited image:', newImage)
      saveImageToLocal(newImage)

      console.log('✏️ Updating original image to edited state:', imageId)
      // 원본 이미지를 edited 상태로 업데이트
      updateImageInLocal(imageId!, { isEdited: true })

      console.log('✅ Successfully saved edited image to localStorage')

      // 저장 성공 알림
      alert('이미지가 성공적으로 저장되었습니다!')
    } catch (error) {
      console.error('❌ Failed to save image:', error)
      alert('이미지 저장에 실패했습니다.')
      return
    }

    // 저장 후 이전 페이지로 돌아가기
    const currentUrl = new URL(window.location.href)
    const returnUrl = currentUrl.searchParams.get('returnUrl') || '/'
    router.push(returnUrl)
  }

  const goBack = () => {
    router.back()
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>돌아가기</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">이미지 편집</h1>
          </div>

          <button
            onClick={saveDrawing}
            disabled={!hasChanges}
            className={`flex items-center space-x-2 rounded-md px-4 py-2 text-white transition-colors ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-400'
            }`}
            title={
              hasChanges ? '편집 내용을 저장합니다' : '변경사항이 없습니다'
            }
          >
            <CheckIcon className="h-5 w-5" />
            <span>저장</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-center p-4">
          {/* Tool Selection - Center */}
          <div className="flex items-center space-x-6">
            {/* Brush Tool */}
            <div className="flex items-center space-x-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 text-white">
                <PaintBrushIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">브러시</span>
            </div>

            {/* Sticker Tool */}
            <button
              onClick={openStickerModal}
              className="flex h-12 items-center space-x-2 rounded-lg bg-gray-100 px-4 text-gray-600 transition-colors hover:bg-gray-200"
              title="스티커"
            >
              <FaceSmileIcon className="h-6 w-6" />
              <span className="text-sm font-medium">스티커</span>
            </button>

            {/* Colors */}
            <div className="flex items-center space-x-1">
              <span className="mr-2 text-sm text-gray-600">색상:</span>
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`h-8 w-8 rounded border-2 ${
                    currentColor === color
                      ? 'border-blue-500'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">크기:</span>
              {brushSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`flex h-10 w-10 items-center justify-center rounded border-2 ${
                    brushSize === size
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="rounded-full bg-gray-700"
                    style={{
                      width: Math.min(size, 16),
                      height: Math.min(size, 16),
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 border-l pl-6">
              <button
                onClick={undo}
                disabled={historyStep <= 0}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  historyStep <= 0
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="실행취소"
              >
                <ArrowUturnLeftIcon className="h-5 w-5" />
              </button>

              <button
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  historyStep >= history.length - 1
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="다시실행"
              >
                <ArrowUturnRightIcon className="h-5 w-5" />
              </button>

              <button
                onClick={clearCanvas}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                title="초기화"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex flex-1 items-center justify-center bg-gray-100 p-8">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          {isClient ? (
            <KonvaCanvas
              stageRef={stageRef}
              stageSize={stageSize}
              originalImage={originalImage}
              lines={lines}
              stickers={stickers}
              activeTool={activeTool}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onStickerDelete={deleteSticker}
              onStickerUpdate={updateSticker}
            />
          ) : (
            <div
              className="flex cursor-crosshair items-center justify-center border border-gray-300 bg-gray-50"
              style={{ width: stageSize.width, height: stageSize.height }}
            >
              <div className="text-gray-500">편집기 로딩 중...</div>
            </div>
          )}
        </div>
      </div>

      {/* Sticker Modal */}
      {isClient && (
        <StickerModal
          isOpen={stickerModalOpen}
          onClose={closeStickerModal}
          onStickerSelect={addSticker}
        />
      )}
    </div>
  )
}

export default DrawingPage
