'use client'

import React, { useState, useEffect, useCallback } from 'react'
import FeedCanvas from './FeedCanvas'
import EditToolbar from './EditToolbar'
import BackgroundColorPicker from './BackgroundColorPicker'
// 기존 drawing 컴포넌트들 재사용
import StickerModal from '@/components/page/drawing/StickerModal'
import TextModal from '@/components/page/drawing/TextModal'
import PhotoUploadModal from './PhotoUploadModal'
import { useFeedEditor } from '@/hooks/useFeedEditor'
import { FeedElement, StickerElement, TextElement, PhotoElement } from '@/lib/types/feed'

interface FeedEditorProps {
  userId: string
  className?: string
}

// 🔥 EditToolbar와 일치하는 타입 사용
export type EditTool = 'select' | 'photo' | 'sticker' | 'text' | 'draw' | 'background'

const FeedEditor: React.FC<FeedEditorProps> = ({
  userId,
  className = '',
}) => {
  const [activeTool, setActiveTool] = useState<EditTool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [showStickerModal, setShowStickerModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const {
    elements,
    viewport,
    isDragging,
    isLoading,
    containerRef,
    feedData,
    addElement,
    updateElement,
    removeElement,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    resetZoom,
    panTo,
  } = useFeedEditor({ userId })

  // 🔥 배경색 상태 관리
  const [selectedBgColor, setSelectedBgColor] = useState(feedData?.backgroundColor || '#fef7f0')

  // feedData 변경 시 배경색 동기화
  useEffect(() => {
    if (feedData?.backgroundColor) {
      setSelectedBgColor(feedData.backgroundColor)
    }
  }, [feedData?.backgroundColor])

  // 🔥 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // 🔥 캔버스 크기 기반 랜덤 위치 생성
  const getRandomPosition = useCallback(() => {
    const canvasWidth = containerRef.current?.clientWidth || 800
    const canvasHeight = containerRef.current?.clientHeight || 600
    
    return {
      x: Math.random() * Math.max(canvasWidth - 300, 100) + 100,
      y: Math.random() * Math.max(canvasHeight - 300, 100) + 100,
    }
  }, [containerRef])

  // 🔥 배경색 변경 핸들러 - 임시로 로컬 상태만 업데이트
  const handleBackgroundColorChange = async (color: string) => {
    const previousColor = selectedBgColor
    setSelectedBgColor(color)
    
    try {
      // TODO: useFeedEditor에 updateFeedBackground 함수 추가 후 활성화
      // if (updateFeedBackground) {
      //   await updateFeedBackground(color)
      // }
      
      // 임시로 로컬 상태만 업데이트
      console.log('Background color changed to:', color)
      showToast('배경색이 변경되었습니다')
    } catch (error) {
      console.error('Failed to update background color:', error)
      // 실패 시 롤백
      setSelectedBgColor(previousColor)
      showToast('배경색 변경에 실패했습니다', 'error')
    }
  }

  // 도구 변경 핸들러
  const handleToolChange = (tool: EditTool) => {
    setActiveTool(tool)
    
    // 기존 패널들 닫기
    setShowStickerModal(false)
    setShowTextModal(false)
    setShowColorPicker(false)
    setShowPhotoModal(false)
    
    // 새로운 패널 열기
    switch (tool) {
      case 'sticker':
        setShowStickerModal(true)
        break
      case 'text':
        setShowTextModal(true)
        break
      case 'background':
        setShowColorPicker(true)
        break
      case 'photo':
        setShowPhotoModal(true)
        break
    }
  }

  // 요소 선택
  const handleElementSelect = (elementId: string | null) => {
    setSelectedElement(elementId)
  }

  // 요소 삭제
  const handleElementDelete = (elementId: string) => {
    try {
      removeElement(elementId)
      if (selectedElement === elementId) {
        setSelectedElement(null)
      }
      showToast('요소가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete element:', error)
      showToast('요소 삭제에 실패했습니다', 'error')
    }
  }

  // 🔥 스티커 추가 - 타입 단언으로 호환성 확보
  const handleStickerAdd = (stickerUrl: string) => {
    try {
      const { x, y } = getRandomPosition()
      
      // 타입 단언을 사용해서 호환성 확보
      const stickerData = {
        x,
        y,
        width: 80,
        height: 80,
        rotation: 0,
        zIndex: elements.length + 1,
        stickerUrl,
        stickerType: 'custom' as any, // ✅ 타입 단언으로 해결
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElement = addElement('STICKER', stickerData)
      
      if (newElement && newElement.id) {
        setSelectedElement(newElement.id)
        showToast('스티커가 추가되었습니다')
      }
      setActiveTool('select')
      setShowStickerModal(false)
    } catch (error) {
      console.error('Failed to add sticker:', error)
      showToast('스티커 추가에 실패했습니다', 'error')
    }
  }

  // 🔥 텍스트 추가 - 타입 단언으로 호환성 확보
  const handleTextAdd = (text: string, fontFamily: string, fontSize: number, color: string) => {
    try {
      const { x, y } = getRandomPosition()
      
      // 타입 단언을 사용해서 호환성 확보
      const textData = {
        x,
        y,
        width: Math.max(200, text.length * fontSize * 0.6),
        height: fontSize * 1.5,
        rotation: 0,
        zIndex: elements.length + 1,
        content: text,
        fontSize,
        fontFamily,
        color,
        textAlign: 'left' as any, // ✅ 타입 단언으로 해결
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElement = addElement('TEXT', textData)
      
      if (newElement && newElement.id) {
        setSelectedElement(newElement.id)
        showToast('텍스트가 추가되었습니다')
      }
      setActiveTool('select')
      setShowTextModal(false)
    } catch (error) {
      console.error('Failed to add text:', error)
      showToast('텍스트 추가에 실패했습니다', 'error')
    }
  }

  // 사진 추가
  const handlePhotoAdd = () => {
    setShowPhotoModal(true)
  }

  // 🔥 사진 선택 - 타입 단언으로 호환성 확보
  const handlePhotoSelect = (imageData: string) => {
    try {
      const { x, y } = getRandomPosition()
      
      // 타입 단언을 사용해서 호환성 확보
      const photoData = {
        x,
        y,
        width: 300,
        height: 200,
        rotation: 0,
        zIndex: elements.length + 1,
        photoId: `photo_${Date.now()}`,
        src: imageData,
        alt: 'Uploaded photo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElement = addElement('PHOTO', photoData)
      
      if (newElement && newElement.id) {
        setSelectedElement(newElement.id)
        showToast('사진이 추가되었습니다')
      }
      setShowPhotoModal(false)
      setActiveTool('select')
    } catch (error) {
      console.error('Failed to add photo:', error)
      showToast('사진 추가에 실패했습니다', 'error')
    }
  }

  // 🔥 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있을 때는 단축키 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedElement) {
            e.preventDefault()
            handleElementDelete(selectedElement)
          }
          break
        case 'Escape':
          setSelectedElement(null)
          setActiveTool('select')
          break
        case '1':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('select')
          }
          break
        case '2':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('photo')
          }
          break
        case '3':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('sticker')
          }
          break
        case '4':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('text')
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement])

  // 🔥 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 타이머나 이벤트 리스너 정리
      if (toastMessage) {
        setToastMessage(null)
      }
    }
  }, [])

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-100 ${className}`}>
      {/* 상단 도구 모음 */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <EditToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          selectedElement={selectedElement}
          onElementDelete={handleElementDelete}
          onPhotoAdd={handlePhotoAdd}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          zoomLevel={viewport.scale}
        />
      </div>

      {/* 메인 캔버스 영역 */}
      <div className="absolute inset-0 pt-16">
        <FeedCanvas
          userId={userId}
          elements={elements as any} // ✅ 타입 충돌 해결
          viewport={viewport}
          selectedElement={selectedElement}
          activeTool={activeTool}
          isDragging={isDragging}
          containerRef={containerRef}
          feedData={feedData}
          backgroundColor={selectedBgColor}
          onElementSelect={handleElementSelect}
          onElementUpdate={updateElement}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* 🔥 우측 사이드 패널 - 색상 팔레트 */}
      {showColorPicker && (
        <div className="absolute top-16 right-0 bottom-0 w-80 z-20">
          <BackgroundColorPicker
            selectedColor={selectedBgColor}
            onColorChange={handleBackgroundColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}

      {/* 기존 drawing 모달들 재사용 */}
      <StickerModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        onStickerSelect={handleStickerAdd}
      />

      <TextModal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        onTextAdd={handleTextAdd}
        fontOptions={[
          { name: '깔끔', family: 'Noto Sans KR, sans-serif', displayName: 'Noto Sans KR' },
          { name: '귀여움', family: 'Jua, cursive', displayName: 'Jua' },
          { name: '힙함', family: 'Black Han Sans, sans-serif', displayName: 'Black Han Sans' },
          { name: '손글씨', family: 'Gamja Flower, cursive', displayName: 'Gamja Flower' },
          { name: '삐뚤빼뚤', family: 'Gaegu, cursive', displayName: 'Gaegu' },
          { name: '기본', family: 'Arial, sans-serif', displayName: 'Arial' },
        ]}
        colors={[
          '#000000', '#FFFFFF', '#DC2626', '#EA580C', '#CA8A04', '#16A34A',
          '#0EA5E9', '#7C3AED', '#DB2777', '#0D9488', '#BE123C', '#6366F1',
        ]}
        defaultFontSize={24}
        minFontSize={12}
        maxFontSize={96}
      />

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelect={handlePhotoSelect}
      />

      {/* 🔥 토스트 알림 */}
      {toastMessage && (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700 font-medium">저장 중...</span>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 키보드 단축키 도움말 (개발용) */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs rounded p-3 z-30 max-w-xs">
        <div className="font-semibold mb-1">키보드 단축키</div>
        <div>Del/Backspace: 삭제</div>
        <div>Esc: 선택 해제</div>
        <div>1-4: 도구 선택</div>
        <div>Ctrl+Wheel: 확대/축소</div>
        <div>드래그: 요소 이동</div>
      </div>
    </div>
  )
}

export default FeedEditor