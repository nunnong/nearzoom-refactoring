// src/hooks/useInfiniteScroll.ts - 백엔드 연동 최적화 버전

import { useRef, useEffect, useCallback, useState } from 'react'

// ============================================================================
// 백엔드 연동을 위한 추가 타입들
// ============================================================================

interface BackendLoadingState {
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

interface UseInfiniteScrollOptions {
  onIntersect: () => void | Promise<void>;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  root?: Element | null;
  triggerOnce?: boolean;
  debounceMs?: number;
  
  // 🔥 백엔드 연동을 위한 추가 옵션들
  loadingState?: BackendLoadingState;
  minDistanceFromBottom?: number; // 하단에서 얼마나 떨어져야 트리거할지
  cooldownMs?: number; // 연속 호출 방지를 위한 쿨다운
  retryOnError?: boolean; // 에러 시 재시도 여부
  maxRetries?: number; // 최대 재시도 횟수
}

interface UseInfiniteScrollReturn {
  targetRef: React.RefObject<HTMLDivElement | null>;
  isIntersecting: boolean;
  isLoadingMore: boolean; // 추가 로딩 상태
  disconnect: () => void;
  reconnect: () => void;
  reset: () => void; // 상태 리셋
}

// ============================================================================
// 메인 무한 스크롤 훅 (백엔드 최적화)
// ============================================================================

export const useInfiniteScroll = ({
  onIntersect,
  threshold = 0.1,
  rootMargin = '200px', // 🔥 기본값을 200px로 변경 (미리 로딩)
  enabled = true,
  root = null,
  triggerOnce = false,
  debounceMs = 300, // 🔥 디바운스 시간 증가
  loadingState,
  minDistanceFromBottom = 1000, // 하단에서 1000px 떨어진 지점
  cooldownMs = 1000, // 1초 쿨다운
  retryOnError = true,
  maxRetries = 3,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);
  const lastTriggerTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 🔥 백엔드 로딩 상태 모니터링
  useEffect(() => {
    if (loadingState) {
      setIsLoadingMore(loadingState.isLoading);
    }
  }, [loadingState?.isLoading]);

  // 🔥 쿨다운 체크 함수
  const isCooldownActive = useCallback(() => {
    const now = Date.now();
    return now - lastTriggerTimeRef.current < cooldownMs;
  }, [cooldownMs]);

  // 🔥 백엔드 상태를 고려한 트리거 가능 여부 체크
  const canTrigger = useCallback(() => {
    // 기본 조건들
    if (!enabled || triggerOnce && hasTriggeredRef.current) {
      return false;
    }

    // 쿨다운 체크
    if (isCooldownActive()) {
      console.log('⏳ 무한스크롤 쿨다운 중...');
      return false;
    }

    // 백엔드 상태 체크
    if (loadingState) {
      if (loadingState.isLoading) {
        console.log('⏳ 이미 로딩 중...');
        return false;
      }

      if (!loadingState.hasMore) {
        console.log('✋ 더 이상 로드할 데이터가 없음');
        return false;
      }

      if (loadingState.error && !retryOnError) {
        console.log('❌ 에러 상태이고 재시도가 비활성화됨');
        return false;
      }

      if (loadingState.error && retryCountRef.current >= maxRetries) {
        console.log('❌ 최대 재시도 횟수 초과');
        return false;
      }
    }

    return true;
  }, [enabled, triggerOnce, isCooldownActive, loadingState, retryOnError, maxRetries]);

  // 🔥 스크롤 위치 기반 트리거 체크
  const checkScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
    
    return distanceFromBottom <= minDistanceFromBottom;
  }, [minDistanceFromBottom]);

  // 🔥 향상된 디바운스된 콜백 함수
  const debouncedOnIntersect = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!canTrigger()) {
        return;
      }

      // 스크롤 위치 체크 (추가 안전장치)
      if (!checkScrollPosition()) {
        console.log('📍 스크롤 위치가 트리거 조건에 맞지 않음');
        return;
      }

      try {
        console.log('🚀 무한스크롤 트리거 시작');
        
        // 트리거 시간 기록
        lastTriggerTimeRef.current = Date.now();
        
        // triggerOnce 처리
        if (triggerOnce) {
          hasTriggeredRef.current = true;
        }

        // 로딩 상태 시작
        setIsLoadingMore(true);

        // 실제 콜백 실행
        await onIntersect();

        // 성공 시 재시도 카운트 리셋
        retryCountRef.current = 0;

        console.log('✅ 무한스크롤 트리거 완료');

      } catch (error) {
        console.error('❌ 무한스크롤 트리거 실패:', error);
        
        // 에러 시 재시도 카운트 증가
        if (retryOnError) {
          retryCountRef.current += 1;
          console.log(`🔄 재시도 ${retryCountRef.current}/${maxRetries}`);
        }
      } finally {
        // 로딩 상태는 백엔드 상태에 따라 자동으로 업데이트됨
        // setIsLoadingMore(false);
      }
    }, debounceMs);
  }, [onIntersect, debounceMs, canTrigger, checkScrollPosition, triggerOnce, retryOnError, maxRetries]);

  // 🔥 Observer 생성 및 관리 (향상된 버전)
  const createObserver = useCallback(() => {
    // IntersectionObserver 지원 여부 체크
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      console.warn('IntersectionObserver is not supported in this environment');
      return null;
    }

    const target = targetRef.current;
    if (!target) {
      console.warn('무한스크롤 타겟 요소를 찾을 수 없습니다');
      return null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const intersecting = entry.isIntersecting;
        
        setIsIntersecting(intersecting);

        if (intersecting) {
          console.log('👁️ 무한스크롤 타겟이 뷰포트에 진입');
          debouncedOnIntersect();
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(target);
    console.log('🔍 무한스크롤 Observer 생성 및 관찰 시작');
    return observer;
  }, [threshold, rootMargin, root, debouncedOnIntersect]);

  // Observer 연결 해제
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
      console.log('🔌 무한스크롤 Observer 연결 해제');
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    setIsIntersecting(false);
    setIsLoadingMore(false);
  }, []);

  // Observer 재연결
  const reconnect = useCallback(() => {
    console.log('🔄 무한스크롤 Observer 재연결');
    disconnect();
    
    if (enabled) {
      // 약간의 지연을 두어 DOM이 안정화될 때까지 기다림
      setTimeout(() => {
        observerRef.current = createObserver();
      }, 100);
    }
  }, [enabled, createObserver, disconnect]);

  // 🔥 상태 리셋 함수 (새로고침 등에 사용)
  const reset = useCallback(() => {
    console.log('🔄 무한스크롤 상태 리셋');
    hasTriggeredRef.current = false;
    lastTriggerTimeRef.current = 0;
    retryCountRef.current = 0;
    setIsIntersecting(false);
    setIsLoadingMore(false);
  }, []);

  // Observer 설정 및 정리
  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    // DOM이 준비될 때까지 기다린 후 Observer 생성
    const timeoutId = setTimeout(() => {
      observerRef.current = createObserver();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
  }, [enabled, createObserver, disconnect]);

  // triggerOnce 리셋 (enabled가 변경될 때)
  useEffect(() => {
    if (triggerOnce && !enabled) {
      hasTriggeredRef.current = false;
    }
  }, [triggerOnce, enabled]);

  // 🔥 에러 상태 변경 시 재시도 카운트 리셋
  useEffect(() => {
    if (loadingState?.error) {
      console.log('❌ 백엔드 에러 감지:', loadingState.error);
    } else if (retryCountRef.current > 0) {
      // 에러가 해결되면 재시도 카운트 리셋
      retryCountRef.current = 0;
      console.log('✅ 에러 해결, 재시도 카운트 리셋');
    }
  }, [loadingState?.error]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    targetRef,
    isIntersecting,
    isLoadingMore,
    disconnect,
    reconnect,
    reset,
  };
};

// ============================================================================
// 🔥 백엔드 연동을 위한 전용 훅들
// ============================================================================

// 피드/타임라인용 무한 스크롤 훅
interface UseFeedInfiniteScrollOptions {
  onLoadMore: () => void | Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  error?: string | null;
  enabled?: boolean;
  threshold?: number;
}

export const useFeedInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  error,
  enabled = true,
  threshold = 0.1,
}: UseFeedInfiniteScrollOptions) => {
  return useInfiniteScroll({
    onIntersect: onLoadMore,
    enabled: enabled && hasMore,
    threshold,
    rootMargin: '300px', // 피드용으로 더 넓은 마진
    debounceMs: 500, // 피드 로딩을 위한 적절한 디바운스
    loadingState: {
      isLoading,
      hasMore,
      error: error || null,
    },
    minDistanceFromBottom: 800, // 피드용 적절한 거리
    cooldownMs: 1500, // 피드용 쿨다운
    retryOnError: true,
    maxRetries: 3,
  });
};

// 검색 결과용 무한 스크롤 훅
interface UseSearchInfiniteScrollOptions {
  onLoadMore: () => void | Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  searchQuery: string;
  enabled?: boolean;
}

export const useSearchInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  searchQuery,
  enabled = true,
}: UseSearchInfiniteScrollOptions) => {
  const hookRef = useRef(useInfiniteScroll({
    onIntersect: onLoadMore,
    enabled: enabled && hasMore && searchQuery.length > 0,
    threshold: 0.2, // 검색 결과용 높은 threshold
    rootMargin: '200px',
    debounceMs: 300,
    loadingState: {
      isLoading,
      hasMore,
      error: null,
    },
    cooldownMs: 800, // 검색용 빠른 쿨다운
  }));

  // 검색어가 변경되면 상태 리셋
  useEffect(() => {
    hookRef.current.reset();
  }, [searchQuery]);

  return hookRef.current;
};

// ============================================================================
// 기존 다중 타겟 및 방향성 훅들 (유지)
// ============================================================================

// 다중 타겟을 위한 훅
interface UseMultipleInfiniteScrollOptions extends UseInfiniteScrollOptions {
  targetCount: number;
}

export const useMultipleInfiniteScroll = ({
  targetCount,
  ...options
}: UseMultipleInfiniteScrollOptions) => {
  const targetRefs = useRef<(HTMLDivElement | null)[]>(
    Array(targetCount).fill(null)
  );
  const [intersectingStates, setIntersectingStates] = useState<boolean[]>(
    Array(targetCount).fill(false)
  );

  useEffect(() => {
    if (!options.enabled || typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }

    const observers: IntersectionObserver[] = [];

    targetRefs.current.forEach((target, index) => {
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          const intersecting = entry.isIntersecting;

          setIntersectingStates(prev => {
            const newStates = [...prev];
            newStates[index] = intersecting;
            return newStates;
          });

          if (intersecting) {
            options.onIntersect();
          }
        },
        {
          threshold: options.threshold,
          rootMargin: options.rootMargin,
          root: options.root,
        }
      );

      observer.observe(target);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [options]);

  const setTargetRef = useCallback((index: number) => (ref: HTMLDivElement | null) => {
    targetRefs.current[index] = ref;
  }, []);

  return {
    setTargetRef,
    intersectingStates,
  };
};

// 특정 방향으로만 트리거되는 훅
interface UseDirectionalInfiniteScrollOptions extends UseInfiniteScrollOptions {
  direction?: 'up' | 'down' | 'both';
}

export const useDirectionalInfiniteScroll = ({
  direction = 'down',
  ...options
}: UseDirectionalInfiniteScrollOptions) => {
  const previousY = useRef<number>(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  const enhancedOnIntersect = useCallback(() => {
    if (direction === 'both') {
      options.onIntersect();
      return;
    }

    if (direction === scrollDirection) {
      options.onIntersect();
    }
  }, [direction, scrollDirection, options]);

  // 스크롤 방향 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      
      if (currentY > previousY.current) {
        setScrollDirection('down');
      } else if (currentY < previousY.current) {
        setScrollDirection('up');
      }
      
      previousY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return useInfiniteScroll({
    ...options,
    onIntersect: enhancedOnIntersect,
  });
};

// ============================================================================
// 🔥 유틸리티 함수들
// ============================================================================

// 스크롤 위치 관련 유틸리티
export const scrollUtils = {
  // 하단까지의 거리 계산
  getDistanceFromBottom: (): number => {
    if (typeof window === 'undefined') return 0;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    return documentHeight - (scrollTop + windowHeight);
  },

  // 스크롤 비율 계산 (0-1)
  getScrollProgress: (): number => {
    if (typeof window === 'undefined') return 0;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    return scrollTop / (documentHeight - windowHeight);
  },

  // 부드러운 스크롤 이동
  smoothScrollTo: (targetY: number, duration: number = 500) => {
    if (typeof window === 'undefined') return;
    
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const startTime = Date.now();

    const easeInOutQuart = (t: number): number => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
    };

    const scroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutQuart(progress);
      
      window.scrollTo(0, startY + distance * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(scroll);
      }
    };

    requestAnimationFrame(scroll);
  },
};