'use client'

import { useEffect, useState } from 'react'

// ===== SVG ICONS =====
const UploadIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-12 w-12 transition-transform duration-500 ${
      active ? 'scale-110 text-black' : 'scale-100 text-gray-500'
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4v12m0-12l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
    />
  </svg>
)

const CameraIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-12 w-12 transition-transform duration-500 ${
      active ? 'scale-110 text-black' : 'scale-100 text-gray-500'
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8h4l2-3h6l2 3h4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
    />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

const ShareIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-12 w-12 transition-transform duration-500 ${
      active ? 'scale-110 text-black' : 'scale-100 text-gray-500'
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 8a3 3 0 116 0 3 3 0 01-6 0zM3 12a3 3 0 116 0 3 3 0 01-6 0zM15 16a3 3 0 116 0 3 3 0 01-6 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12h9m0-4l3-3m-3 11l3 3"
    />
  </svg>
)

// ===== Steps Data =====
const steps = [
  {
    number: '01',
    title: 'Upload Your Best Shot',
    description: '자신의 개성이 드러나는 최고의 사진을 업로드하여 시작하세요.',
    icon: UploadIcon,
    keyword: 'Start',
  },
  {
    number: '02',
    title: 'Capture the Moment',
    description: '친구들과 함께 특별한 순간을 포착하고, 추억을 만들어보세요.',
    icon: CameraIcon,
    keyword: 'Capture',
  },
  {
    number: '03',
    title: 'Create & Share',
    description: '프리미엄 편집 도구로 완성하고, 세상과 공유해보세요.',
    icon: ShareIcon,
    keyword: 'Share',
  },
]

// ===== Main Section =====
export default function AboutUsSection() {
  const [activeStep, setActiveStep] = useState<number | null>(null)

  // fade-in observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
          }
        })
      },
      { threshold: 0.2 }
    )
    const elements = document.querySelectorAll('.fade-in-observer')
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative bg-white">
      {/* 🔹 ABOUT US 대형 스크롤 텍스트 */}
      <div className="relative overflow-hidden pt-16 pb-10">
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none"></div>
        
        <div className="animate-scroll-left flex whitespace-nowrap">
          {Array(8)
            .fill(0)
            .map((_, index) => (
              <h2
                key={index}
                className="mr-24 font-serif text-[80px] font-black tracking-[0.2em] text-gray-900/12 md:text-[80px] xl:text-[140px] select-none"
                style={{ 
                  fontFamily: 'Playfair Display, serif',
                  textShadow: '0 0 40px rgba(0,0,0,0.03)'
                }}
              >
                ABOUT US
              </h2>
            ))}
        </div>
        
        {/* 중앙 브랜드 로고 */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          {/* <div className="bg-white/95 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-xl border border-gray-100">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-gray-900" 
                style={{ fontFamily: 'Playfair Display, serif' }}>
              NEARZOOM
            </h1>
          </div> */}
        </div>
      </div>

      {/* 🔹 Three Steps 섹션 */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24">
        {/* 섹션 타이틀 */}
        <div className="mb-24 text-center relative">
          {/* 배경 데코레이션 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl opacity-30 -z-10"></div>
          
          {/* 상단 라벨 */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl tracking-wide">
            {/* <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> */}
            HOW IT WORKS
          </div>
          
          {/* 메인 타이틀 */}
          <h2
            className="text-3xl md:text-3xl xl:text-5xl font-large text-gray-900 mb-6 leading-tight"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Three Steps to{' '}
            <span className="italic bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              Perfection
            </span>
          </h2>
          
          {/* 서브타이틀 */}
          <p className="text-xl md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed ">
            간단한 3단계로 NEARZOOM에서<br />
            <span className="font-medium text-gray-800">특별한 순간을 완성하세요</span>
          </p>
          
          {/* 장식 라인 */}
          <div className="flex items-center justify-center mt-8 gap-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-gray-300"></div>
          </div>
        </div>

        {/* 카드 그리드 - 반응형 및 간격 최적화 */}
        <div className="grid gap-8 lg:gap-10 xl:gap-12 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
                className={`group relative rounded-3xl border backdrop-blur-lg transition-all duration-500 ${
                  activeStep === index
                    ? '-translate-y-2 scale-105 border-gray-300 bg-white/60 shadow-2xl'
                    : 'border-gray-200 bg-white/40 shadow-lg'
                } p-8 lg:p-10 xl:p-12`}
              >
                {/* 워터마크 숫자 */}
                <div className="pointer-events-none absolute -top-4 -left-2 text-[90px] lg:text-[110px] font-bold text-gray-100/70 select-none">
                  {step.number}
                </div>

                {/* Keyword Badge */}
                {activeStep === index && (
                  <div className="animate-fade-in-up absolute top-6 right-6 rounded-xl bg-black px-3 py-1 text-xs text-white shadow">
                    {step.keyword}
                  </div>
                )}

                {/* Icon */}
                <div className="relative z-10 mb-6 flex justify-center">
                  <Icon active={activeStep === index} />
                </div>

                {/* Title - 한 줄 유지를 위한 최적화 */}
                <h3
                  className={`relative z-10 mb-4 font-medium text-lg lg:text-xl xl:text-2xl leading-tight transition-colors duration-300 text-center ${
                    activeStep === index ? 'text-gray-900' : 'text-gray-700'
                  }`}
                  style={{ 
                    fontFamily: 'Playfair Display, serif',
                    lineHeight: '1.3'
                  }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  className={`relative z-10 text-sm lg:text-base leading-relaxed transition-colors text-center  ${
                    activeStep === index ? 'text-gray-600' : 'text-gray-500'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        /* ABOUT US 가로 스크롤 */
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }

        /* Fade-in Up Effect */
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .fade-in-observer {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }

        /* 반응형 타이포그래피 최적화 */
        @media (max-width: 1024px) {
          .grid.lg\\:grid-cols-3 > div h3 {
            font-size: 1.125rem;
            line-height: 1.4;
          }
        }
        
        @media (max-width: 768px) {
          .grid.lg\\:grid-cols-3 > div h3 {
            font-size: 1rem;
            line-height: 1.3;
          }
        }
      `}</style>
    </section>
  )
}