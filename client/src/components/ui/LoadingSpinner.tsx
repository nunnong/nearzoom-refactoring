'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// ============================================================================
// 🔥 백엔드 연동 상황에 특화된 타입 정의
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  color?: 'white' | 'gray' | 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'pink'
  className?: string
  text?: string
  textPosition?: 'right' | 'bottom' | 'top'
  ariaLabel?: string
  
  // 🔥 백엔드 연동 상황을 위한 핵심 props
  type?: 'default' | 'api' | 'auth' | 'upload' | 'page' | 'inline' | 'feed' | 'profile' | 'follow' | 'like'
  timeout?: number          // 타임아웃 시간 (ms)
  onTimeout?: () => void    // 타임아웃 콜백
  showProgress?: boolean    // 진행률 표시
  progress?: number         // 진행률 (0-100)
  retryable?: boolean       // 재시도 가능 여부
  onRetry?: () => void      // 재시도 콜백
  errorState?: boolean      // 에러 상태
  successState?: boolean    // 성공 상태
  autoHide?: boolean        // 성공 시 자동 숨김
  
  // 🔥 백엔드 API 정보 표시
  apiEndpoint?: string      // 호출 중인 API 엔드포인트
  showApiInfo?: boolean     // API 정보 표시 여부 (개발 모드)
  requestCount?: number     // 요청 횟수
  maxRetries?: number       // 최대 재시도 횟수
  
  // 🔥 애니메이션 및 UX 개선
  pulseOnError?: boolean    // 에러 시 펄스 애니메이션
  fadeIn?: boolean          // 페이드인 효과
  minShowTime?: number      // 최소 표시 시간 (깜빡임 방지)
  overlayMode?: boolean     // 오버레이 모드 (전체 화면 덮기)
}

// 🔥 백엔드 연동 상황별 최적화된 프리셋
const BACKEND_LOADING_PRESETS = {
  default: {
    text: '로딩 중...',
    color: 'gray' as const,
    size: 'md' as const,
    timeout: 30000,
    showProgress: false,
    minShowTime: 300,
    showApiInfo: false,
    overlayMode: false,
    apiEndpoint: undefined,
  },
  api: {
    text: 'API 호출 중...',
    color: 'blue' as const,
    size: 'md' as const,
    timeout: 15000,
    showProgress: false,
    minShowTime: 500,
    showApiInfo: true,
    overlayMode: false,
    apiEndpoint: undefined,
  },
  auth: {
    text: '인증 처리 중...',
    color: 'green' as const,
    size: 'md' as const,
    timeout: 10000,
    showProgress: false,
    minShowTime: 800,
    showApiInfo: false,
    overlayMode: false,
    apiEndpoint: undefined,
  },
  upload: {
    text: '업로드 중...',
    color: 'purple' as const,
    size: 'lg' as const,
    timeout: 120000, // 2분
    showProgress: true,
    minShowTime: 1000,
    showApiInfo: false,
    overlayMode: false,
    apiEndpoint: undefined,
  },
  page: {
    text: '페이지 로딩 중...',
    color: 'blue' as const,
    size: 'xl' as const,
    timeout: 20000,
    showProgress: false,
    minShowTime: 300,
    showApiInfo: false,
    overlayMode: true,
    apiEndpoint: undefined,
  },
  inline: {
    text: '',
    color: 'gray' as const,
    size: 'sm' as const,
    timeout: 10000,
    showProgress: false,
    minShowTime: 200,
    showApiInfo: false,
    overlayMode: false,
    apiEndpoint: undefined,
  },
  feed: {
    text: '피드 로딩 중...',
    color: 'indigo' as const,
    size: 'md' as const,
    timeout: 20000,
    showProgress: false,
    minShowTime: 400,
    showApiInfo: true,
    overlayMode: false,
    apiEndpoint: '/feeds/*',
  },
  profile: {
    text: '프로필 로딩 중...',
    color: 'pink' as const,
    size: 'md' as const,
    timeout: 15000,
    showProgress: false,
    minShowTime: 400,
    showApiInfo: true,
    overlayMode: false,
    apiEndpoint: '/users/*',
  },
  follow: {
    text: '팔로우 처리 중...',
    color: 'green' as const,
    size: 'sm' as const,
    timeout: 8000,
    showProgress: false,
    minShowTime: 600,
    showApiInfo: true,
    overlayMode: false,
    apiEndpoint: '/follows/*',
  },
  like: {
    text: '좋아요 처리 중...',
    color: 'red' as const,
    size: 'sm' as const,
    timeout: 5000,
    showProgress: false,
    minShowTime: 300,
    showApiInfo: true,
    overlayMode: false,
    apiEndpoint: '/likes/*',
  },
} as const

// ============================================================================
// 🔥 LoadingSpinner 컴포넌트 (백엔드 연동 완전 최적화)
// ============================================================================

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size,
  color,
  className = '',
  text,
  textPosition = 'right',
  ariaLabel = '로딩 중',
  
  // 백엔드 연동 관련 props
  type = 'default',
  timeout,
  onTimeout,
  showProgress = false,
  progress = 0,
  retryable = false,
  onRetry,
  errorState = false,
  successState = false,
  autoHide = true,
  
  // API 정보
  apiEndpoint,
  showApiInfo = process.env.NODE_ENV === 'development',
  requestCount = 1,
  maxRetries = 3,
  
  // UX 개선
  pulseOnError = true,
  fadeIn = true,
  minShowTime,
  overlayMode = false,
}) => {
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [currentProgress, setCurrentProgress] = useState(progress)
  const [showTime, setShowTime] = useState(0)
  const [canHide, setCanHide] = useState(false)
  
  const startTimeRef = useRef<number>(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const minTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 프리셋 적용
  const preset = BACKEND_LOADING_PRESETS[type]
  const finalSize = size || preset.size
  const finalColor = color || preset.color
  const finalText = text !== undefined ? text : preset.text
  const finalTimeout = timeout || preset.timeout
  const finalShowProgress = showProgress || preset.showProgress || false
  const finalMinShowTime = minShowTime || preset.minShowTime || 300
  const finalApiEndpoint = apiEndpoint || preset.apiEndpoint
  const finalShowApiInfo = showApiInfo && preset.showApiInfo
  const finalOverlayMode = overlayMode || preset.overlayMode || false

  // ============================================================================
  // 🔥 스타일 클래스 정의 (백엔드 상황별 최적화)
  // ============================================================================
  
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
    '2xl': 'h-16 w-16',
  } as const

  const colorClasses = {
    white: 'text-white',
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600',
  } as const

  const backgroundColorClasses = {
    white: 'bg-white',
    gray: 'bg-gray-100',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50',
    indigo: 'bg-indigo-50',
    pink: 'bg-pink-50',
  } as const

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  } as const

  // ============================================================================
  // 🔥 백엔드 연동 관련 효과들
  // ============================================================================

  // 표시 시간 추적
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTime(Date.now() - startTimeRef.current)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // 최소 표시 시간 처리
  useEffect(() => {
    minTimeoutRef.current = setTimeout(() => {
      setCanHide(true)
    }, finalMinShowTime)

    return () => {
      if (minTimeoutRef.current) {
        clearTimeout(minTimeoutRef.current)
        minTimeoutRef.current = null
      }
    }
  }, [finalMinShowTime])

  // 타임아웃 처리
  useEffect(() => {
    if (!finalTimeout || errorState || successState) return

    timeoutRef.current = setTimeout(() => {
      setIsTimedOut(true)
      onTimeout?.()
    }, finalTimeout)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [finalTimeout, onTimeout, errorState, successState])

  // 진행률 업데이트
  useEffect(() => {
    setCurrentProgress(progress)
  }, [progress])

  // 성공 시 자동 숨김 (최소 표시 시간 고려)
  useEffect(() => {
    if (successState && autoHide && canHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [successState, autoHide, canHide])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const getContainerClasses = useCallback(() => {
    let baseClasses = ''
    
    if (finalOverlayMode) {
      baseClasses = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    } else if (!finalText && !finalShowProgress) {
      baseClasses = 'inline-flex items-center justify-center'
    } else {
      baseClasses = textPosition === 'bottom' 
        ? 'inline-flex flex-col items-center justify-center gap-2'
        : textPosition === 'top'
        ? 'inline-flex flex-col-reverse items-center justify-center gap-2'
        : 'inline-flex items-center justify-center gap-2'
    }

    if (fadeIn) {
      baseClasses += ' animate-fade-in'
    }

    if (pulseOnError && (errorState || isTimedOut)) {
      baseClasses += ' animate-pulse'
    }

    return baseClasses
  }, [finalOverlayMode, finalText, finalShowProgress, textPosition, fadeIn, pulseOnError, errorState, isTimedOut])

  const getStateColor = useCallback(() => {
    if (errorState || isTimedOut) return 'red'
    if (successState) return 'green'
    return finalColor
  }, [errorState, isTimedOut, successState, finalColor])

  const getStateText = useCallback(() => {
    if (isTimedOut) return `시간 초과 (${Math.floor(finalTimeout / 1000)}초)`
    if (errorState) return `오류 발생 ${requestCount > 1 ? `(${requestCount}/${maxRetries})` : ''}`
    if (successState) return '완료!'
    return finalText
  }, [isTimedOut, finalTimeout, errorState, requestCount, maxRetries, successState, finalText])

  const formatShowTime = useCallback(() => {
    const seconds = Math.floor(showTime / 1000)
    const milliseconds = Math.floor((showTime % 1000) / 100)
    return `${seconds}.${milliseconds}초`
  }, [showTime])

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  if (!isVisible) return null

  // ============================================================================
  // 🔥 스피너 요소 (상태별 최적화)
  // ============================================================================

  const spinnerElement = !successState ? (
    <div className="relative">
      <svg
        className={`animate-spin ${sizeClasses[finalSize]} ${colorClasses[getStateColor()]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        role="status"
        aria-label={ariaLabel}
        aria-hidden={finalText ? 'true' : 'false'}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      
      {/* 🔥 백엔드 API 타입별 추가 표시 */}
      {type === 'upload' && finalShowProgress && (
        <div className={`absolute inset-0 flex items-center justify-center ${colorClasses[getStateColor()]} text-xs font-bold`}>
          {Math.round(currentProgress)}%
        </div>
      )}
    </div>
  ) : (
    // 성공 상태일 때 체크 아이콘
    <svg
      className={`${sizeClasses[finalSize]} ${colorClasses[getStateColor()]}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )

  // ============================================================================
  // 🔥 진행률 표시 (백엔드 업로드/다운로드 최적화)
  // ============================================================================

  const progressElement = finalShowProgress && (
    <div className="w-full max-w-xs">
      <div className="flex justify-between text-xs mb-1">
        <span className={`${colorClasses[getStateColor()]} font-medium`}>
          {type === 'upload' ? '업로드' : '진행률'}
        </span>
        <span className={`${colorClasses[getStateColor()]} font-bold`}>
          {Math.round(currentProgress)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ease-out ${
            getStateColor() === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
            getStateColor() === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
            getStateColor() === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
            getStateColor() === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
            getStateColor() === 'indigo' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' :
            getStateColor() === 'pink' ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
            'bg-gradient-to-r from-gray-500 to-gray-600'
          } ${currentProgress > 0 ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
        />
      </div>
      {type === 'upload' && currentProgress > 0 && (
        <div className="text-xs text-gray-500 mt-1 text-center">
          예상 완료: {Math.ceil((100 - currentProgress) * (showTime / currentProgress) / 1000)}초 후
        </div>
      )}
    </div>
  )

  // ============================================================================
  // 텍스트 요소
  // ============================================================================

  const textElement = getStateText() && (
    <span 
      className={`${textSizeClasses[finalSize]} ${colorClasses[getStateColor()]} font-medium transition-colors duration-300`}
      aria-live="polite"
    >
      {getStateText()}
    </span>
  )

  // ============================================================================
  // 🔥 재시도 버튼 (백엔드 연동 최적화)
  // ============================================================================

  const retryElement = (isTimedOut || errorState) && retryable && onRetry && (
    <div className="flex flex-col items-center gap-2 mt-3">
      <button
        onClick={onRetry}
        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 ${
          getStateColor() === 'red' 
            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' 
            : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105`}
      >
        다시 시도 {requestCount > 1 && `(${requestCount}/${maxRetries})`}
      </button>
      
      {requestCount >= maxRetries && (
        <span className="text-xs text-red-500 text-center">
          최대 재시도 횟수에 도달했습니다
        </span>
      )}
    </div>
  )

  // ============================================================================
  // 🔥 백엔드 API 정보 표시 (개발 모드)
  // ============================================================================

  const apiInfoElement = finalShowApiInfo && process.env.NODE_ENV === 'development' && (
    <div className={`mt-3 p-2 rounded-lg text-xs ${backgroundColorClasses[getStateColor()]} border border-current border-opacity-20`}>
      <div className={`${colorClasses[getStateColor()]} space-y-1`}>
        <div className="font-semibold">🔧 백엔드 연동 정보</div>
        {finalApiEndpoint && (
          <div><strong>API:</strong> {finalApiEndpoint}</div>
        )}
        <div><strong>타입:</strong> {type}</div>
        <div><strong>실행 시간:</strong> {formatShowTime()}</div>
        <div><strong>타임아웃:</strong> {Math.floor(finalTimeout / 1000)}초</div>
        {requestCount > 1 && (
          <div><strong>재시도:</strong> {requestCount - 1}회</div>
        )}
        <div><strong>상태:</strong> {
          isTimedOut ? '⏰ 시간초과' :
          errorState ? '❌ 에러' :
          successState ? '✅ 성공' :
          '🔄 진행중'
        }</div>
      </div>
    </div>
  )

  // ============================================================================
  // 🔥 메인 렌더링 (오버레이 모드 지원)
  // ============================================================================

  const content = (
    <div 
      className={`${getContainerClasses()} ${className}`}
      role={finalText ? 'status' : undefined}
      aria-label={finalText ? `${ariaLabel}: ${getStateText()}` : ariaLabel}
    >
      {finalOverlayMode ? (
        <div className={`${backgroundColorClasses[getStateColor()]} rounded-xl p-8 shadow-2xl border max-w-sm mx-4`}>
          <div className="flex flex-col items-center space-y-4">
            {spinnerElement}
            {textElement}
            {finalShowProgress && progressElement}
            {retryElement}
            {apiInfoElement}
          </div>
        </div>
      ) : (
        <>
          {textPosition === 'top' && textElement}
          {spinnerElement}
          {textPosition !== 'top' && textElement}
          {finalShowProgress && progressElement}
          {retryElement}
          {apiInfoElement}
        </>
      )}
    </div>
  )

  return content
}

// ============================================================================
// 🔥 백엔드 연동 상황별 편의 컴포넌트들
// ============================================================================

// API 호출용 로딩 스피너
export const ApiLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="api" />
)

// 인증 처리용 로딩 스피너
export const AuthLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="auth" />
)

// 파일 업로드용 로딩 스피너
export const UploadLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="upload" />
)

// 페이지 로딩용 로딩 스피너
export const PageLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="page" />
)

// 인라인 로딩 스피너 (버튼 내부 등)
export const InlineLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="inline" />
)

// 🔥 피드 로딩용 스피너
export const FeedLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="feed" />
)

// 🔥 프로필 로딩용 스피너
export const ProfileLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="profile" />
)

// 🔥 팔로우 처리용 스피너
export const FollowLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="follow" />
)

// 🔥 좋아요 처리용 스피너
export const LikeLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="like" />
)

// ============================================================================
// 🔥 백엔드 연동 상황별 Hook (추가 유틸리티)
// ============================================================================

export const useBackendLoadingState = (
  isLoading: boolean,
  error: Error | null,
  success: boolean,
  apiEndpoint?: string
) => {
  const [requestCount, setRequestCount] = useState(1)
  
  useEffect(() => {
    if (error) {
      setRequestCount(prev => prev + 1)
    }
  }, [error])
  
  useEffect(() => {
    if (success) {
      setRequestCount(1) // 성공 시 리셋
    }
  }, [success])
  
  return {
    isLoading,
    errorState: !!error,
    successState: success,
    requestCount,
    apiEndpoint,
    retryable: !!error && requestCount < 3,
  }
}

export default LoadingSpinner