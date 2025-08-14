'use client'

import React, { useState, useEffect } from 'react'

// ============================================================================
// 백엔드 연동 상황에 특화된 타입 정의
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'white' | 'gray' | 'blue' | 'green' | 'red' | 'purple'
  className?: string
  text?: string
  textPosition?: 'right' | 'bottom'
  ariaLabel?: string
  
  // 🔥 백엔드 연동 상황을 위한 추가 props
  type?: 'default' | 'api' | 'auth' | 'upload' | 'page' | 'inline'
  timeout?: number          // 타임아웃 시간 (ms)
  onTimeout?: () => void    // 타임아웃 콜백
  showProgress?: boolean    // 진행률 표시
  progress?: number         // 진행률 (0-100)
  retryable?: boolean       // 재시도 가능 여부
  onRetry?: () => void      // 재시도 콜백
  errorState?: boolean      // 에러 상태
  successState?: boolean    // 성공 상태
  autoHide?: boolean        // 성공 시 자동 숨김
}

// 백엔드 연동 상황별 기본 설정
const LOADING_PRESETS = {
  default: {
    text: '로딩 중...',
    color: 'gray' as const,
    size: 'md' as const,
    timeout: 30000, // 30초
    showProgress: false,
  },
  api: {
    text: 'API 호출 중...',
    color: 'blue' as const,
    size: 'md' as const,
    timeout: 15000, // 15초
    showProgress: false,
  },
  auth: {
    text: '인증 처리 중...',
    color: 'green' as const,
    size: 'md' as const,
    timeout: 10000, // 10초
    showProgress: false,
  },
  upload: {
    text: '업로드 중...',
    color: 'purple' as const,
    size: 'lg' as const,
    timeout: 60000, // 60초 (파일 업로드는 오래 걸릴 수 있음)
    showProgress: true,
  },
  page: {
    text: '페이지 로딩 중...',
    color: 'blue' as const,
    size: 'xl' as const,
    timeout: 20000, // 20초
    showProgress: false,
  },
  inline: {
    text: '',
    color: 'gray' as const,
    size: 'sm' as const,
    timeout: 10000, // 10초
    showProgress: false,
  },
} as const

// ============================================================================
// LoadingSpinner 컴포넌트 (백엔드 연동 최적화)
// ============================================================================

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size,
  color,
  className = '',
  text,
  textPosition = 'right',
  ariaLabel = '로딩 중',
  
  // 🔥 백엔드 연동 관련 props
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
}) => {
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [currentProgress, setCurrentProgress] = useState(progress)

  // 프리셋 적용
  const preset = LOADING_PRESETS[type]
  const finalSize = size || preset.size
  const finalColor = color || preset.color
  const finalText = text !== undefined ? text : preset.text
  const finalTimeout = timeout || preset.timeout
  const finalShowProgress = showProgress || preset.showProgress || false

  // ============================================================================
  // 스타일 클래스 정의
  // ============================================================================
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  } as const

  const colorClasses = {
    white: 'text-white',
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  } as const

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  } as const

  // ============================================================================
  // 백엔드 연동 관련 효과들
  // ============================================================================

  // 타임아웃 처리
  useEffect(() => {
    if (!finalTimeout || errorState || successState) return

    const timer = setTimeout(() => {
      setIsTimedOut(true)
      onTimeout?.()
    }, finalTimeout)

    return () => clearTimeout(timer)
  }, [finalTimeout, onTimeout, errorState, successState])

  // 진행률 업데이트
  useEffect(() => {
    setCurrentProgress(progress)
  }, [progress])

  // 성공 시 자동 숨김
  useEffect(() => {
    if (successState && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 1500) // 1.5초 후 숨김

      return () => clearTimeout(timer)
    }
  }, [successState, autoHide])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const getContainerClasses = () => {
    if (!finalText && !finalShowProgress) return 'inline-flex items-center justify-center'
    
    return textPosition === 'bottom' 
      ? 'inline-flex flex-col items-center justify-center gap-2'
      : 'inline-flex items-center justify-center gap-2'
  }

  const getStateColor = () => {
    if (errorState || isTimedOut) return 'red'
    if (successState) return 'green'
    return finalColor
  }

  const getStateText = () => {
    if (isTimedOut) return '시간 초과됨'
    if (errorState) return '오류 발생'
    if (successState) return '완료!'
    return finalText
  }

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  if (!isVisible) return null

  // ============================================================================
  // 스피너 요소
  // ============================================================================

  const spinnerElement = !successState ? (
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
  ) : (
    // 🔥 성공 상태일 때 체크 아이콘
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
  // 진행률 표시
  // ============================================================================

  const progressElement = finalShowProgress && (
    <div className="w-full max-w-xs">
      <div className="flex justify-between text-xs mb-1">
        <span className={`${colorClasses[getStateColor()]}`}>진행률</span>
        <span className={`${colorClasses[getStateColor()]}`}>{Math.round(currentProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            getStateColor() === 'blue' ? 'bg-blue-600' :
            getStateColor() === 'green' ? 'bg-green-600' :
            getStateColor() === 'purple' ? 'bg-purple-600' :
            getStateColor() === 'red' ? 'bg-red-600' :
            'bg-gray-600'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
        />
      </div>
    </div>
  )

  // ============================================================================
  // 텍스트 요소
  // ============================================================================

  const textElement = getStateText() && (
    <span 
      className={`${textSizeClasses[finalSize]} ${colorClasses[getStateColor()]} font-medium`}
      aria-live="polite"
    >
      {getStateText()}
    </span>
  )

  // ============================================================================
  // 재시도 버튼
  // ============================================================================

  const retryElement = (isTimedOut || errorState) && retryable && onRetry && (
    <button
      onClick={onRetry}
      className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      다시 시도
    </button>
  )

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div 
      className={`${getContainerClasses()} ${className}`}
      role={finalText ? 'status' : undefined}
      aria-label={finalText ? `${ariaLabel}: ${getStateText()}` : ariaLabel}
    >
      {spinnerElement}
      {textElement}
      {finalShowProgress && progressElement}
      {retryElement}
    </div>
  )
}

// ============================================================================
// 백엔드 연동 상황별 편의 컴포넌트들
// ============================================================================

// 🔥 API 호출용 로딩 스피너
export const ApiLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="api" />
)

// 🔥 인증 처리용 로딩 스피너
export const AuthLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="auth" />
)

// 🔥 파일 업로드용 로딩 스피너
export const UploadLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="upload" />
)

// 🔥 페이지 로딩용 로딩 스피너
export const PageLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="page" />
)

// 🔥 인라인 로딩 스피너 (버튼 내부 등)
export const InlineLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner {...props} type="inline" />
)

export default LoadingSpinner

// ============================================================================
// 사용 예시 (주석)
// ============================================================================

/*
// 🔥 백엔드 연동 상황별 사용 예시:

// 1. API 호출 중
<ApiLoadingSpinner 
  text="사용자 정보 로딩 중..."
  timeout={10000}
  onTimeout={() => console.log('API 타임아웃')}
  retryable={true}
  onRetry={() => refetchUserData()}
/>

// 2. 파일 업로드 중
<UploadLoadingSpinner 
  showProgress={true}
  progress={uploadProgress}
  text="사진 업로드 중..."
  onTimeout={() => setUploadError(true)}
/>

// 3. 인증 처리 중
<AuthLoadingSpinner 
  text="로그인 처리 중..."
  successState={loginSuccess}
  errorState={loginError}
/>

// 4. 인라인 버튼 로딩
<button disabled={isLoading}>
  {isLoading ? <InlineLoadingSpinner /> : '저장'}
</button>

// 5. 페이지 로딩
<PageLoadingSpinner 
  text="피드를 불러오는 중..."
  timeout={20000}
  onTimeout={() => router.push('/error')}
/>
*/