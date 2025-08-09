'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'white' | 'gray' | 'blue' | 'green' | 'red' | 'purple'
  className?: string
  text?: string
  textPosition?: 'right' | 'bottom'
  ariaLabel?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'gray',
  className = '',
  text,
  textPosition = 'right',
  ariaLabel = '로딩 중',
}) => {
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

  const getContainerClasses = () => {
    if (!text) return 'inline-flex items-center justify-center'
    
    return textPosition === 'bottom' 
      ? 'inline-flex flex-col items-center justify-center gap-2'
      : 'inline-flex items-center justify-center gap-2'
  }

  const spinnerElement = (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={ariaLabel}
      aria-hidden={text ? 'true' : 'false'}
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
  )

  const textElement = text && (
    <span 
      className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
      aria-live="polite"
    >
      {text}
    </span>
  )

  return (
    <div 
      className={`${getContainerClasses()} ${className}`}
      role={text ? 'status' : undefined}
      aria-label={text ? `${ariaLabel}: ${text}` : ariaLabel}
    >
      {spinnerElement}
      {textElement}
    </div>
  )
}

export default LoadingSpinner