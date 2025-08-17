'use client'

import {
  ArrowLeftIcon,
  PaintBrushIcon,
  TrashIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  FaceSmileIcon,
  Square3Stack3DIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState, useRef, useEffect } from 'react'
import { myroomService } from '@/services/myroomService'
import api from '@/lib/axios'

// Konva 컴포넌트들을 동적으로 import
const KonvaCanvas = dynamic(() => import('../../components/KonvaCanvas'), {
  ssr: false,
})

const StickerModal = dynamic(
  () => import('../../components/page/drawing/StickerModal'),
  { ssr: false }
)

const TextModal = dynamic(
  () => import('../../components/page/drawing/TextModal'),
  { ssr: false }
)

const ExitConfirmModal = dynamic(
  () => import('../../components/page/drawing/ExitConfirmModal'),
  { ssr: false }
)

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

const DrawingPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DrawingContent />
    </Suspense>
  )
}

const DrawingContent: React.FC = () => {
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
  const [originalImageSize, setOriginalImageSize] = useState({
    width: 800,
    height: 600,
  })
  const [isClient, setIsClient] = useState(false)
  const [stickers, setStickers] = useState<StickerData[]>([])
  const [texts, setTexts] = useState<TextData[]>([])
  const [activeTool, setActiveTool] = useState<
    'brush' | 'eraser' | 'sticker' | 'text'
  >('brush')
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
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null
  )
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [textModalOpen, setTextModalOpen] = useState<boolean>(false)
  const [textClickPosition, setTextClickPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false)

  // 클라이언트 사이드에서만 렌더링하도록 설정
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 브라우저 뒤로가기 및 페이지 이동 방지
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasChanges) {
        e.preventDefault()
        // 히스토리를 다시 앞으로 이동시켜 현재 페이지에 머물게 함
        window.history.pushState(null, '', window.location.href)
        setShowExitConfirm(true)
      }
    }

    // 페이지가 로드될 때 히스토리에 현재 상태 추가
    window.history.pushState(null, '', window.location.href)

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasChanges])

  // 저장 완료 후 beforeunload 이벤트 리스너 제거
  const removeBeforeUnloadListener = () => {
    // 모든 beforeunload 이벤트 리스너 제거
    window.removeEventListener('beforeunload', handleBeforeUnload)
    // hasChanges를 false로 설정하여 더 이상 경고가 뜨지 않도록 함
    setHasChanges(false)
  }

  // beforeunload 이벤트 핸들러를 별도 함수로 정의
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges) {
      e.preventDefault()
      return '편집 중인 내용이 있습니다. 정말로 나가시겠습니까?'
    }
  }

  // URL에서 이미지 ID와 src 파라미터 가져오기
  useEffect(() => {
    const id = searchParams.get('id')
    const src = searchParams.get('src')

    console.log('🔍 Drawing 페이지 파라미터:', { id, src })

    if (id) setImageId(id)
    if (src) {
      const imgSrc = decodeURIComponent(src)

      const img = new Image()

      // 이미지 URL이 같은 도메인인지 확인
      const isCurrentDomain =
        imgSrc.startsWith(window.location.origin) || imgSrc.startsWith('/')

      // CORS 문제 해결을 위한 crossOrigin 설정
      if (!isCurrentDomain) {
        img.crossOrigin = 'anonymous'
      }

      img.onload = () => {
        console.log('✅ 이미지 로드 성공:', {
          width: img.width,
          height: img.height,
          src: img.src
        })

        setOriginalImage(img)
        // 원본 이미지의 자연스러운 크기 저장 (실제 해상도)
        setOriginalImageSize({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        })
        
        // 이미지 크기에 맞게 스테이지 크기 조정
        const maxWidth = Math.min(img.width, 1200)
        const maxHeight = Math.min(img.height, 800)
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height)

        setStageSize({
          width: (img.naturalWidth || img.width) * scale,
          height: (img.naturalHeight || img.height) * scale,
        })

        // 이미지 로드 후 초기 빈 상태를 히스토리에 저장
        const initialState = { lines: [], stickers: [] }
        setHistory([initialState])
        setHistoryStep(0)
      }

      img.onerror = error => {
        console.error('❌ 이미지 로드 실패:', {
          error: error,
          errorType: error instanceof Event ? error.type : 'unknown',
          imgSrc: imgSrc,
          originalSrc: src,
          imgCurrentSrc: img.currentSrc,
          imgComplete: img.complete,
          imgNaturalWidth: img.naturalWidth,
          imgNaturalHeight: img.naturalHeight,
        })

        // 이미지 URL 직접 테스트
        console.log('🔗 이미지 URL 직접 테스트:', imgSrc)
        fetch(imgSrc)
          .then(response => {
            console.log('📡 Fetch 응답:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url,
            })
          })
          .catch(fetchError => {
            console.error('📡 Fetch 실패:', fetchError)
          })
      }

      img.src = imgSrc
    }
  }, [searchParams])

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
    {
      name: '깔끔',
      family: 'Noto Sans KR, sans-serif',
      displayName: 'Noto Sans KR',
    },
    { name: '귀여움', family: 'Jua, cursive', displayName: 'Jua' },
    {
      name: '힙함',
      family: 'Black Han Sans, sans-serif',
      displayName: 'Black Han Sans',
    },
    {
      name: '손글씨',
      family: 'Gamja Flower, cursive',
      displayName: 'Gamja Flower',
    },
    { name: '삐뚤빼뚤', family: 'Gaegu, cursive', displayName: 'Gaegu' },
    { name: '기본', family: 'Arial, sans-serif', displayName: 'Arial' },
  ]

  // 이미지 해상도 기반 폰트 크기 계산
  const calculateFontSize = (fontSize: number) => {
    // 이미지의 대각선 길이를 기준으로 계산
    const diagonal = Math.sqrt(
      originalImageSize.width ** 2 + originalImageSize.height ** 2
    )
    const ratio = fontSize / 1000 // fontSize를 비율로 변환
    return Math.round(diagonal * ratio)
  }

  // 텍스트 크기 조절 함수
  const increaseFontSize = (textId: string) => {
    const currentText = texts.find(t => t.id === textId)
    if (currentText) {
      const newSize = Math.min(currentText.fontSize + 4, 96)
      updateText(textId, { fontSize: newSize })
    }
  }

  const decreaseFontSize = (textId: string) => {
    const currentText = texts.find(t => t.id === textId)
    if (currentText) {
      const newSize = Math.max(currentText.fontSize - 4, 12)
      updateText(textId, { fontSize: newSize })
    }
  }

  const toggleStickerMode = () => {
    if (activeTool === 'sticker') {
      // 스티커 모드에서 다시 클릭하면 모달 열기 (모드는 유지)
      setStickerModalOpen(true)
    } else {
      // 다른 모드에서 클릭하면 스티커 모드로 전환하고 모달 열기
      setActiveTool('sticker')
      setStickerModalOpen(true)
    }
  }

  const closeStickerModal = () => {
    setStickerModalOpen(false)
    // 모달만 닫고 스티커 모드는 유지 (X 버튼으로 닫을 때도 스티커 모드 유지)
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
    const pos = e.target.getStage()?.getPointerPosition()

    // 스티커 모드나 텍스트 모드일 때는 그리기 비활성화
    if (activeTool === 'sticker' || activeTool === 'text') {
      return
    }

    if (activeTool === 'eraser') {
      // 지우개 모드일 때는 선 지우기 처리
      handleEraserClick(e)
      return
    }

    setIsDrawing(true)
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

  const handleEraserClick = (e: any) => {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    // 클릭한 위치에서 가장 가까운 선 찾기
    let closestLineIndex = -1
    let minDistance = Infinity
    const eraserRadius = 20 // 지우개 반경

    lines.forEach((line, index) => {
      // 선의 각 점에서 클릭 위치까지의 거리 계산
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i]
        const y = line.points[i + 1]
        const distance = Math.sqrt(
          Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
        )

        if (distance < eraserRadius && distance < minDistance) {
          minDistance = distance
          closestLineIndex = index
        }
      }
    })

    // 가장 가까운 선이 있으면 삭제
    if (closestLineIndex !== -1) {
      saveToHistory() // 삭제 전 히스토리 저장
      setHasChanges(true)
      const newLines = lines.filter((_, index) => index !== closestLineIndex)
      setLines(newLines)
    }
  }

  const handleMouseMove = (e: any) => {
    // 스티커 모드일 때는 그리기 비활성화
    if (activeTool === 'sticker' || !isDrawing) return

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
      rotation: 0, // 기본 회전값
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

  const handleStickerSelect = (stickerId: string | null) => {
    setSelectedStickerId(stickerId)
  }

  const handleTextSelect = (textId: string | null) => {
    setSelectedTextId(textId)
  }

  const openTextModal = (x?: number, y?: number) => {
    // 기본 위치를 화면 중앙으로 설정
    const defaultX = x ?? stageSize.width / 2
    const defaultY = y ?? stageSize.height / 2
    setTextClickPosition({ x: defaultX, y: defaultY })
    setTextModalOpen(true)
  }

  const closeTextModal = () => {
    setTextModalOpen(false)
    setTextClickPosition(null)
  }

  const addText = (
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string
  ) => {
    if (!textClickPosition || !text.trim()) return

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
    saveToHistory()
    setHasChanges(true)
    setTexts([...texts, newText])

    // 새로 생성된 텍스트 자동 선택하지 않기
    setSelectedTextId(null)

    closeTextModal()
  }

  const deleteText = (textId: string) => {
    saveToHistory()
    setHasChanges(true)
    setTexts(texts.filter(text => text.id !== textId))
    // 삭제 후 선택 상태 해제
    if (selectedTextId === textId) {
      setSelectedTextId(null)
    }
  }

  const updateText = (textId: string, updates: Partial<TextData>) => {
    setHasChanges(true)
    setTexts(
      texts.map(text => (text.id === textId ? { ...text, ...updates } : text))
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

  const saveDrawing = async () => {
    if (!stageRef.current) return

    // 변경사항이 없으면 저장하지 않고 경고 메시지 표시
    if (!hasChanges) {
      alert('변경사항이 없습니다. 이미지를 편집한 후 저장해주세요.')
      return
    }

    try {
      // 1. 스케일 비율 계산
      const scaleX = originalImageSize.width / stageSize.width
      const scaleY = originalImageSize.height / stageSize.height
      
      // 2. 원본 크기로 캔버스 생성
      const canvas = stageRef.current.toCanvas({
        width: originalImageSize.width,
        height: originalImageSize.height,
        pixelRatio: 1
      })
      
      // 3. 2D 컨텍스트 가져오기
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('캔버스 컨텍스트를 가져올 수 없습니다.')
      }
      
      // 4. 원본 이미지를 캔버스에 그리기
      if (originalImage) {
        ctx.drawImage(originalImage, 0, 0, originalImageSize.width, originalImageSize.height)
      }
      
      // 5. 그리기 선들을 원본 크기에 맞게 조정하여 그리기
      lines.forEach(line => {
        ctx.strokeStyle = line.stroke
        ctx.lineWidth = line.strokeWidth * Math.min(scaleX, scaleY) // 선 굵기 조정
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        ctx.beginPath()
        // points 배열은 [x1, y1, x2, y2, ...] 형태로 저장됨
        for (let i = 0; i < line.points.length; i += 2) {
          const x = line.points[i]
          const y = line.points[i + 1]
          const scaledX = x * scaleX
          const scaledY = y * scaleY
          
          if (i === 0) {
            ctx.moveTo(scaledX, scaledY)
          } else {
            ctx.lineTo(scaledX, scaledY)
          }
        }
        ctx.stroke()
      })
      
      // 6. 스티커들을 원본 크기에 맞게 조정하여 그리기
      const stickerPromises = stickers.map(sticker => {
        return new Promise<void>((resolve) => {
          const stickerImg = new Image()
          stickerImg.onload = () => {
            const scaledX = sticker.x * scaleX
            const scaledY = sticker.y * scaleY
            const scaledWidth = sticker.width * scaleX
            const scaledHeight = sticker.height * scaleY
            
            ctx.save()
            ctx.translate(scaledX + scaledWidth / 2, scaledY + scaledHeight / 2)
            ctx.rotate((sticker.rotation || 0) * Math.PI / 180)
            ctx.drawImage(stickerImg, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
            ctx.restore()
            resolve()
          }
          stickerImg.onerror = () => {
            console.warn('스티커 이미지 로드 실패:', sticker.src)
            resolve() // 에러가 있어도 계속 진행
          }
          stickerImg.src = sticker.src
        })
      })
      
      // 7. 텍스트들을 원본 크기에 맞게 조정하여 그리기
      texts.forEach(text => {
        const scaledX = text.x * scaleX
        const scaledY = text.y * scaleY
        const scaledFontSize = text.fontSize * Math.min(scaleX, scaleY)
        
        ctx.font = `${scaledFontSize}px ${text.fontFamily}`
        ctx.fillStyle = text.fill
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        ctx.save()
        ctx.translate(scaledX, scaledY)
        if (text.rotation) {
          ctx.rotate(text.rotation * Math.PI / 180)
        }
        ctx.fillText(text.text, 0, 0)
        ctx.restore()
      })
      
      // 8. 모든 스티커 이미지가 로드될 때까지 대기
      await Promise.all(stickerPromises)
      
      // 9. 캔버스를 Blob으로 변환
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) resolve(blob)
        }, 'image/png', 1.0)
      })

      // 3. FormData로 이미지 서버에 업로드
      const formData = new FormData()
      formData.append('file', blob, 'edited-image.png')
      
      // 이미지 서버에 업로드 (기존 프로필 이미지 업로드와 동일한 방식)
      const uploadResponse = await api.post(
        'https://image.nearzoom.store/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
        }
      )

      const uploadedImageUrl = uploadResponse.data?.data?.file_url
      if (!uploadedImageUrl) {
        throw new Error('이미지 URL을 받아올 수 없습니다.')
      }
      
      // 11. 백엔드에 편집본 저장 요청
      console.log('백엔드 저장 요청 데이터:', {
        imgUrl: uploadedImageUrl,
        originalPhotoId: parseInt(imageId!),
      })

      await myroomService.saveEditedPhoto({
        imageUrl: uploadedImageUrl,
        originalPhotoId: parseInt(imageId!),
      })
      
      // 12. 저장 성공 알림
      alert('이미지가 성공적으로 저장되었습니다!')

      // 6. 저장 완료 후 beforeunload 이벤트 리스너 제거 및 상태 초기화
      removeBeforeUnloadListener()

      // 7. 저장 후 이전 페이지로 돌아가기
      const currentUrl = new URL(window.location.href)
      const returnUrl = currentUrl.searchParams.get('returnUrl') || '/'
      router.push(returnUrl)

    } catch (error) {
      console.error('❌ Failed to save image:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error constructor:', error?.constructor?.name)
      
      // 에러 객체의 모든 속성 로깅
      if (error && typeof error === 'object') {
        console.error('❌ Error properties:', Object.keys(error))
        console.error('❌ Error values:', Object.values(error))
        
        // Error 객체의 속성들 안전하게 접근
        const errorObj = error as any
        if (errorObj.message) {
          console.error('❌ Error message:', errorObj.message)
        }
        if (errorObj.stack) {
          console.error('❌ Error stack:', errorObj.stack)
        }
      }
      
      // 사용자에게 명확한 에러 메시지 표시
      let errorMessage = '이미지 저장에 실패했습니다.'
      
      if (error instanceof Error) {
        errorMessage += `\n\n오류 내용: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage += `\n\n오류 내용: ${error}`
      } else if (error && typeof error === 'object') {
        // API 응답 에러인 경우
        if ('response' in error && error.response) {
          const response = error.response as any
          errorMessage += `\n\nHTTP 상태: ${response.status}`
          if (response.data) {
            errorMessage += `\n\n서버 응답: ${JSON.stringify(response.data)}`
          }
        } else if ('request' in error) {
          errorMessage += '\n\n네트워크 요청 실패'
        } else {
          errorMessage += `\n\n알 수 없는 오류: ${JSON.stringify(error)}`
        }
      }
      
      alert(errorMessage)
    }
  }

  const goBack = () => {
    if (hasChanges) {
      setShowExitConfirm(true)
    } else {
      // returnUrl이 있으면 해당 URL로, 없으면 마이페이지로 이동
      const returnUrl = searchParams.get('returnUrl') || '/myroom'
      router.push(returnUrl)
    }
  }

  const handleExitConfirm = () => {
    setShowExitConfirm(false)
    // returnUrl이 있으면 해당 URL로, 없으면 마이페이지로 이동
    const returnUrl = searchParams.get('returnUrl') || '/myroom'
    router.push(returnUrl)
  }

  const handleExitCancel = () => {
    setShowExitConfirm(false)
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-gray-100"
      style={{ zoom: '0.9' }}
    >
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
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-gray-900">
                이미지 편집
              </h1>
              <p className="text-xs font-medium text-orange-600">
                ⚠️ 편집은 한 번만 가능합니다. 저장 후에는 더 이상 편집할 수
                없습니다.
              </p>
            </div>
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
              hasChanges
                ? '편집 내용을 저장합니다 (저장 후 편집 불가)'
                : '변경사항이 없습니다'
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
            <button
              onClick={() => setActiveTool('brush')}
              className="flex items-center space-x-2"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                  activeTool === 'brush'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PaintBrushIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">브러시</span>
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => setActiveTool('eraser')}
              className="flex items-center space-x-2"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                  activeTool === 'eraser'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Square3Stack3DIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">지우개</span>
            </button>

            {/* Sticker Tool */}
            <button
              onClick={toggleStickerMode}
              className="flex items-center space-x-2"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                  activeTool === 'sticker'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FaceSmileIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">스티커</span>
            </button>

            {/* Text Tool */}
            <button
              onClick={() => {
                setActiveTool('text')
                openTextModal() // 바로 모달 열기
              }}
              className="flex items-center space-x-2"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                  activeTool === 'text'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PencilSquareIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">텍스트</span>
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
          <div className="relative">
            {isClient ? (
              <div
                className={`${
                  activeTool === 'brush'
                    ? 'cursor-crosshair'
                    : activeTool === 'eraser'
                      ? 'cursor-pointer'
                      : activeTool === 'text'
                        ? 'cursor-text'
                        : 'cursor-default'
                }`}
                style={
                  activeTool === 'brush'
                    ? {
                        cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${Math.min(brushSize * 2, 32)}' height='${Math.min(brushSize * 2, 32)}' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='${Math.min(brushSize, 16)}' fill='${currentColor}' fill-opacity='0.5' stroke='${currentColor}' stroke-width='1'/%3E%3C/svg%3E") ${Math.min(brushSize, 16)} ${Math.min(brushSize, 16)}, crosshair`,
                      }
                    : {}
                }
              >
                <KonvaCanvas
                  stageRef={stageRef}
                  stageSize={stageSize}
                  originalImage={originalImage}
                  lines={lines}
                  stickers={stickers}
                  texts={texts}
                  activeTool={activeTool}
                  stickerModalOpen={stickerModalOpen}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onStickerDelete={deleteSticker}
                  onStickerUpdate={updateSticker}
                  onStickerSelect={handleStickerSelect}
                  onTextSelect={handleTextSelect}
                  onTextDelete={deleteText}
                  onTextUpdate={updateText}
                  onIncreaseFontSize={textId => {}}
                  onDecreaseFontSize={textId => {}}
                />
              </div>
            ) : (
              <div
                className="flex cursor-crosshair items-center justify-center border border-gray-300 bg-gray-50"
                style={{ width: stageSize.width, height: stageSize.height }}
              >
                <div className="text-gray-500">편집기 로딩 중...</div>
              </div>
            )}

            {/* Sticker Delete Button Overlay */}
            {selectedStickerId &&
              isClient &&
              (() => {
                const selectedSticker = stickers.find(
                  s => s.id === selectedStickerId
                )
                if (!selectedSticker) return null

                return (
                  <button
                    onClick={() => deleteSticker(selectedStickerId)}
                    className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
                    style={{
                      left: selectedSticker.x + selectedSticker.width - 12,
                      top: selectedSticker.y - 12,
                    }}
                    title="스티커 삭제"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )
              })()}

            {/* Text Control Buttons Overlay */}
            {selectedTextId &&
              isClient &&
              (() => {
                const selectedText = texts.find(t => t.id === selectedTextId)
                if (!selectedText) return null

                // 고정 위치 (캔버스 우상단)
                const fixedX = stageSize.width - 120
                const fixedY = 20

                return (
                  <div
                    className="absolute z-20 flex items-center space-x-2"
                    style={{
                      left: fixedX,
                      top: fixedY,
                    }}
                  >
                    {/* 텍스트 크기 증가 버튼 */}
                    <button
                      onClick={() => increaseFontSize(selectedTextId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-xl transition-colors hover:bg-blue-700"
                      title="글자 크기 증가"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </button>

                    {/* 텍스트 크기 감소 버튼 */}
                    <button
                      onClick={() => decreaseFontSize(selectedTextId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-600 text-white shadow-xl transition-colors hover:bg-gray-700"
                      title="글자 크기 감소"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 12H6"
                        />
                      </svg>
                    </button>

                    {/* 텍스트 삭제 버튼 */}
                    <button
                      onClick={() => deleteText(selectedTextId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-xl transition-colors hover:bg-red-700"
                      title="텍스트 삭제"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )
              })()}
          </div>
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

      {/* Text Modal */}
      {isClient && (
        <TextModal
          isOpen={textModalOpen}
          onClose={closeTextModal}
          onTextAdd={addText}
          fontOptions={fontOptions}
          colors={colors}
          defaultFontSize={24}
          minFontSize={12}
          maxFontSize={96}
        />
      )}

      {/* Exit Confirm Modal */}
      {isClient && (
        <ExitConfirmModal
          isOpen={showExitConfirm}
          onConfirm={handleExitConfirm}
          onCancel={handleExitCancel}
        />
      )}
    </div>
  )
}

export default DrawingPage
