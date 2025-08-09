import { useRef, useEffect, useCallback, useState } from 'react'

interface UseInfiniteScrollOptions {
  onIntersect: () => void
  threshold?: number
  rootMargin?: string
  enabled?: boolean
  root?: Element | null
  triggerOnce?: boolean
  debounceMs?: number
}

interface UseInfiniteScrollReturn {
  targetRef: React.RefObject<HTMLDivElement | null>
  isIntersecting: boolean
  disconnect: () => void
  reconnect: () => void
}

export const useInfiniteScroll = ({
  onIntersect,
  threshold = 0.1,
  rootMargin = '0px',
  enabled = true,
  root = null,
  triggerOnce = false,
  debounceMs = 100,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn => {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredRef = useRef(false)
  
  const [isIntersecting, setIsIntersecting] = useState(false)

  // 디바운스된 콜백 함수
  const debouncedOnIntersect = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onIntersect()
    }, debounceMs)
  }, [onIntersect, debounceMs])

  // Observer 생성 및 관리
  const createObserver = useCallback(() => {
    // IntersectionObserver 지원 여부 체크
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      console.warn('IntersectionObserver is not supported in this environment')
      return null
    }

    const target = targetRef.current
    if (!target) return null

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        const intersecting = entry.isIntersecting
        
        setIsIntersecting(intersecting)

        if (intersecting) {
          // triggerOnce 옵션 처리
          if (triggerOnce && hasTriggeredRef.current) {
            return
          }

          if (triggerOnce) {
            hasTriggeredRef.current = true
          }

          // 디바운싱 적용
          if (debounceMs > 0) {
            debouncedOnIntersect()
          } else {
            onIntersect()
          }
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    )

    observer.observe(target)
    return observer
  }, [threshold, rootMargin, root, triggerOnce, debounceMs, debouncedOnIntersect, onIntersect])

  // Observer 연결 해제
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    setIsIntersecting(false)
  }, [])

  // Observer 재연결
  const reconnect = useCallback(() => {
    disconnect()
    
    if (enabled) {
      observerRef.current = createObserver()
    }
  }, [enabled, createObserver, disconnect])

  // Observer 설정 및 정리
  useEffect(() => {
    if (!enabled) {
      disconnect()
      return
    }

    // 약간의 지연을 두어 DOM이 준비될 때까지 기다림
    const timeoutId = setTimeout(() => {
      observerRef.current = createObserver()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      disconnect()
    }
  }, [enabled, createObserver, disconnect])

  // triggerOnce 리셋 (enabled가 변경될 때)
  useEffect(() => {
    if (triggerOnce && !enabled) {
      hasTriggeredRef.current = false
    }
  }, [triggerOnce, enabled])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    targetRef,
    isIntersecting,
    disconnect,
    reconnect,
  }
}

// 다중 타겟을 위한 훅
interface UseMultipleInfiniteScrollOptions extends UseInfiniteScrollOptions {
  targetCount: number
}

export const useMultipleInfiniteScroll = ({
  targetCount,
  ...options
}: UseMultipleInfiniteScrollOptions) => {
  const targetRefs = useRef<(HTMLDivElement | null)[]>(
    Array(targetCount).fill(null)
  )
  const [intersectingStates, setIntersectingStates] = useState<boolean[]>(
    Array(targetCount).fill(false)
  )

  useEffect(() => {
    if (!options.enabled || typeof window === 'undefined' || !window.IntersectionObserver) {
      return
    }

    const observers: IntersectionObserver[] = []

    targetRefs.current.forEach((target, index) => {
      if (!target) return

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries
          const intersecting = entry.isIntersecting

          setIntersectingStates(prev => {
            const newStates = [...prev]
            newStates[index] = intersecting
            return newStates
          })

          if (intersecting) {
            options.onIntersect()
          }
        },
        {
          threshold: options.threshold,
          rootMargin: options.rootMargin,
          root: options.root,
        }
      )

      observer.observe(target)
      observers.push(observer)
    })

    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [options])

  const setTargetRef = useCallback((index: number) => (ref: HTMLDivElement | null) => {
    targetRefs.current[index] = ref
  }, [])

  return {
    setTargetRef,
    intersectingStates,
  }
}

// 특정 방향으로만 트리거되는 훅
interface UseDirectionalInfiniteScrollOptions extends UseInfiniteScrollOptions {
  direction?: 'up' | 'down' | 'both'
}

export const useDirectionalInfiniteScroll = ({
  direction = 'down',
  ...options
}: UseDirectionalInfiniteScrollOptions) => {
  const previousY = useRef<number>(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)

  const enhancedOnIntersect = useCallback(() => {
    if (direction === 'both') {
      options.onIntersect()
      return
    }

    if (direction === scrollDirection) {
      options.onIntersect()
    }
  }, [direction, scrollDirection, options])

  // 스크롤 방향 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      
      if (currentY > previousY.current) {
        setScrollDirection('down')
      } else if (currentY < previousY.current) {
        setScrollDirection('up')
      }
      
      previousY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return useInfiniteScroll({
    ...options,
    onIntersect: enhancedOnIntersect,
  })
}