import { useEffect, useRef, useCallback } from 'react'
import { CHROMAKEY_CONFIG } from '../types/photoCanvas'

interface UseChromaKeyProps {
  videoElement: HTMLVideoElement | null
  enabled?: boolean
  config?: typeof CHROMAKEY_CONFIG
}

export const useChromaKey = ({ 
  videoElement, 
  enabled = true,
  config = CHROMAKEY_CONFIG 
}: UseChromaKeyProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animationFrameRef = useRef<number>()

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 }
  }

  const processFrame = useCallback(() => {
    if (!videoElement || !canvasRef.current || !ctxRef.current || !enabled) {
      console.log('❌ processFrame skipped:', {
        hasVideo: !!videoElement,
        hasCanvas: !!canvasRef.current,
        hasCtx: !!ctxRef.current,
        enabled
      })
      return
    }

    const ctx = ctxRef.current
    const canvas = canvasRef.current

    try {
      // 비디오 프레임을 캔버스에 그리기
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // 픽셀 데이터 가져오기
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 크로마키 색상
      const chromaColor = hexToRgb(config.color)
      const threshold = config.threshold

      // 각 픽셀 처리
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // 초록색 계산 (크로마키)
        const distance = Math.sqrt(
          Math.pow(r - chromaColor.r, 2) +
          Math.pow(g - chromaColor.g, 2) +
          Math.pow(b - chromaColor.b, 2)
        )

        // 임계값 이내면 투명하게
        if (distance < threshold) {
          data[i + 3] = 0 // 알파 채널을 0으로 (투명)
        }
      }

      // 처리된 이미지 데이터를 캔버스에 다시 그리기
      ctx.putImageData(imageData, 0, 0)
    } catch (error) {
      console.error('❌ Error processing frame:', error)
    }

    // 다음 프레임 처리
    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [videoElement, enabled, config])

  // 캔버스 초기화
  const initCanvas = useCallback(() => {
    if (!videoElement) {
      console.log('❌ initCanvas: no videoElement')
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480
    
    console.log('✅ initCanvas:', {
      width: canvas.width,
      height: canvas.height,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight
    })
    
    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: true 
    })
    
    if (ctx) {
      canvasRef.current = canvas
      ctxRef.current = ctx
      console.log('✅ Canvas context initialized')
    } else {
      console.error('❌ Failed to get canvas context')
    }

    return canvas
  }, [videoElement])

  // 효과 시작/중지
  useEffect(() => {
    if (!videoElement || !enabled) return

    const canvas = initCanvas()
    if (!canvas) return

    // 비디오가 재생 중일 때 처리 시작
    const handlePlay = () => {
      processFrame()
    }

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('ended', handlePause)

    // 비디오가 이미 재생 중이면 즉시 시작
    if (!videoElement.paused) {
      processFrame()
    }

    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('ended', handlePause)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [videoElement, enabled, processFrame, initCanvas])

  return canvasRef.current
}