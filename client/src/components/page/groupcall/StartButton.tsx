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
      className={cn(
        'relative w-full rounded-full px-0 py-0 cursor-pointer outline-offset-4 select-none transition-filter duration-250',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      onMouseEnter={e => {
        if (disabled) return
        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-10px) scale(1.04)'
          front.style.background = 'linear-gradient(90deg, #6264fb 0%, #ae58f8 100%)'
          front.style.boxShadow = '0 2px 32px 0 #ae58f8, 0 0 0 #fff'
        }
        if (edge) {
          edge.style.background = 'linear-gradient(to left, #4837b1 0%, #7e3ff2 100%)'
        }
        if (shadow) {
          shadow.style.boxShadow = '0 0 32px 10px #ae58f899'
        }
        e.currentTarget.style.filter = 'brightness(110%)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const edge = e.currentTarget.querySelector('.edge') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-6px) scale(1)'
          front.style.background = 'linear-gradient(90deg, #5149c3 0%, #a238d2 100%)'
          front.style.boxShadow = '0 2px 18px 0 #ae58f866'
        }
        if (edge) {
          edge.style.background = 'linear-gradient(to left, #443484 0%, #8442f7 100%)'
        }
        if (shadow) {
          shadow.style.boxShadow = '0 0 16px 6px #ae58f860'
        }
        e.currentTarget.style.filter = 'none'
      }}
      onMouseDown={e => {
        if (disabled) return
        const front = e.currentTarget.querySelector('.front') as HTMLElement
        const shadow = e.currentTarget.querySelector('.shadow') as HTMLElement

        if (front) {
          front.style.transform = 'translateY(-2px) scale(0.98)'
          front.style.boxShadow = '0 2px 8px 0 #ae58f899'
        }
        if (shadow) {
          shadow.style.boxShadow = '0 0 8px 2px #ae58f849'
        }
      }}
      onMouseUp={e => {
        if (disabled) return
        // 눌림 해제시 hover 상태 유지
        e.currentTarget.dispatchEvent(new Event('mouseleave'))
      }}
    >
      {/* Shadow */}
      <span
        className="shadow absolute top-0 left-0 w-full h-full rounded-full bg-transparent
          box-shadow-[0_0_18px_4px_rgba(174,88,248,0.4)]
          will-change-[box-shadow,transform]
          transform translate-y-0.5
          transition-[box-shadow] duration-[350ms] ease-[cubic-bezier(.3,.7,.4,1)]
          z-0"
      />
      {/* Edge */}
      <span
        className="edge absolute top-0 left-0 w-full h-full rounded-full
          bg-gradient-to-l from-[#443484] to-[#8442f7]
          transition-colors duration-250 ease-linear
          z-10"
      />
      {/* Front */}
      <span
        className="front relative block rounded-full py-4 text-[1.25rem]
          font-extrabold tracking-wide text-[#1d063d]
          bg-gradient-to-r from-[#5149c3] to-[#a238d2]
          shadow-[0_2px_18px_0_rgba(174,88,248,0.4)]
          will-change-transform
          transform -translate-y-1.5 scale-100
          transition-transform transition-bg transition-shadow duration-360 ease-[cubic-bezier(.3,.7,.4,1)]
          z-20
          select-none
          text-shadow-[0_1px_10px_rgba(174,88,248,0.8),_0_0_0_rgba(255,255,255,1)]"
        style={{
          WebkitTextStroke: '1px #fff',
        }}
      >
        <span
          className="flex items-center justify-center gap-3 font-extrabold text-[1.7rem]"
          style={{ filter: 'none' }}
        >
          {children ? (
            children
          ) : (
            <>
              <span>START</span>
              <span
                className="text-white"
                style={{
                  WebkitTextStroke: '1px #ae58f8',
                  textShadow: '0 0 8px rgba(174,88,248,0.6), 0 0 0 #fff',
                }}
              >
                ▶
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}
