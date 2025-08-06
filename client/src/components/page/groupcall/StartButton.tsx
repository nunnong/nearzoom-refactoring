'use client'

import { cn } from '@/lib/utils'

interface StartButtonProps {
  onClick?: () => void
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export default function StartButton({
  onClick = () => {},
  className,
  disabled = false,
  children,
}: StartButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn('pushable-button w-full', className)}
      style={{
        position: 'relative',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outlineOffset: '4px',
        transition: 'filter 250ms',
        userSelect: 'none',
        touchAction: 'manipulation',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (disabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-6px)'
          front.style.background = '#DC2626' // 더 진한 빨간색 (red-600)
          front.style.transition =
            'transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5), background 250ms ease'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #B91C1C 0%, #DC2626 8%, #DC2626 92%, #B91C1C 100%)' // red-700, red-600
        }
        if (shadow) {
          shadow.style.transform = 'translateY(4px)'
          shadow.style.transition =
            'transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5)'
        }
        e.currentTarget.style.filter = 'brightness(110%)'
      }}
      onMouseLeave={e => {
        if (disabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-4px)'
          front.style.background = '#D86F4A' // 주황빨강으로 변경
          front.style.transition =
            'transform 600ms cubic-bezier(.3, .7, .4, 1), background 250ms ease'
        }
        if (edge) {
          edge.style.background =
            'linear-gradient(to left, #C55A3A 0%, #D86F4A 8%, #D86F4A 92%, #C55A3A 100%)' // 주황빨강 그라데이션
        }
        if (shadow) {
          shadow.style.transform = 'translateY(2px)'
          shadow.style.transition =
            'transform 600ms cubic-bezier(.3, .7, .4, 1)'
        }
        e.currentTarget.style.filter = 'none'
      }}
      onMouseDown={e => {
        if (disabled) return

        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-2px)'
          front.style.transition = 'transform 34ms'
        }
        if (shadow) {
          shadow.style.transform = 'translateY(1px)'
          shadow.style.transition = 'transform 34ms'
        }
      }}
    >
      <span
        className="shadow"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background: 'hsl(0deg 0% 0% / 0.25)',
          willChange: 'transform',
          transform: 'translateY(2px)',
          transition: 'transform 600ms cubic-bezier(.3, .7, .4, 1)',
        }}
      />
      <span
        className="edge"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background:
            'linear-gradient(to left, #C55A3A 0%, #D86F4A 8%, #D86F4A 92%, #C55A3A 100%)', // 주황빨강 기본값
          transition: 'background 250ms ease',
        }}
      />
      <span
        className="front"
        style={{
          display: 'block',
          position: 'relative',
          padding: '15px 27px',
          borderRadius: '12px',
          fontSize: '1.25rem',
          color: 'white',
          background: '#D86F4A', // 주황빨강 기본값
          willChange: 'transform',
          transform: 'translateY(-4px)',
          transition:
            'transform 600ms cubic-bezier(.3, .7, .4, 1), background 250ms ease',
          fontWeight: 'bold',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {children ? (
            children
          ) : (
            <>
              <span>START</span>
              <span>▶</span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}