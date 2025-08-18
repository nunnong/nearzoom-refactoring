'use client'

import { HashtagIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

interface PromptSectionProps {
  promptText: string
  setPromptText: (value: string) => void
}

interface FloatingWord {
  id: number
  text: string
  x: number
  y: number
  opacity: number
  scale: number
}

const keywordCategories = {
  '🎨 분위기': {
    keywords: ['유쾌한', '따뜻한', '장난스러운', '아련한', '사랑스러운'],
  },
  '🏞️ 장소': {
    keywords: ['놀이공원', '해변가', '감성 카페', '한강 벤치', '도시 야경'],
  },
  '🌅 시간대': {
    keywords: [
      '황금노을',
      '푸른 새벽',
      '화창한 낮',
      '별빛 밤하늘',
      '흐린 오후',
    ],
  },
  '📸 스타일': {
    keywords: ['필름 카메라', '시네마틱', '심플', 'Y2K', '스냅샷'],
  },
} as const

type KeywordCategory = keyof typeof keywordCategories

const premiumPrompts = [
  '놀이공원에서 유쾌한 황금노을, 따뜻한 필름 카메라 스타일',
  '해변가에서 아련한 푸른 새벽, 시네마틱한 분위기 연출',
  '감성 카페의 사랑스러운 햇살 가득한 낮, 심플한 Y2K 스타일',
  '한강 벤치에서 장난스러운 별빛 밤하늘, 스냅샷 감성',
]

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function StepwiseKeywordPrompt({
  setPromptText,
}: {
  setPromptText: (value: string) => void
}) {
  const categories = Object.keys(keywordCategories) as KeywordCategory[]
  const [activeStep, setActiveStep] = useState(0)
  const [selected, setSelected] = useState<{
    [category in KeywordCategory]?: string
  }>({})
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0)

  const currentCategory = categories[activeStep]
  const currentKeywords = keywordCategories[currentCategory].keywords

  // 캐러셀에서 보여질 키워드들 (현재 인덱스 기준으로 5개)
  const getVisibleKeywords = () => {
    const total = currentKeywords.length
    const visible = []
    
    for (let i = 0; i < 5; i++) {
      const index = (currentKeywordIndex + i - 2 + total) % total // 가운데를 중심으로 앞뒤 2개씩
      visible.push({
        keyword: currentKeywords[index],
        index: index,
        position: i // 0: far-left, 1: left, 2: center, 3: right, 4: far-right
      })
    }
    
    return visible
  }

  const generatePrompt = (sel: Record<string, string>) => {
    let prompt = ''
    if (sel['🎨 분위기']) prompt += sel['🎨 분위기']
    if (sel['🏞️ 장소'])
      prompt += prompt ? ` 한 ${sel['🏞️ 장소']}` : sel['🏞️ 장소']
    if (sel['🌅 시간대'])
      prompt += prompt ? `, ${sel['🌅 시간대']}의` : `${sel['🌅 시간대']}의`
    if (sel['📸 스타일']) prompt += ` ${sel['📸 스타일']} 스타일`
    prompt += ' 완벽한 배경'
    return prompt
  }

  const resetAll = () => {
    setSelected({})
    setActiveStep(0)
    setCurrentKeywordIndex(0)
    setPromptText('')
  }

  const pickRandomKeywords = () => {
    const newPicked: { [category in KeywordCategory]?: string } = {}
    categories.forEach(cat => {
      const list = keywordCategories[cat].keywords
      newPicked[cat] = list[Math.floor(Math.random() * list.length)]
    })
    setSelected(newPicked)
    setActiveStep(categories.length - 1)
  }

  const handleGenerate = () => setPromptText(generatePrompt(selected))
  
  const selectKeyword = (keyword: string) => {
    setSelected(prev => ({ ...prev, [currentCategory]: keyword }))
  }

  const goPrev = () => {
    if (activeStep > 0) {
      setActiveStep(s => s - 1)
      setCurrentKeywordIndex(0) // 새 카테고리로 이동 시 인덱스 초기화
    }
  }
  
  const goNext = () => {
    if (activeStep < categories.length - 1) {
      setActiveStep(s => s + 1)
      setCurrentKeywordIndex(0) // 새 카테고리로 이동 시 인덱스 초기화
    }
  }

  // 캐러셀 네비게이션
  const goToPrevKeyword = () => {
    setCurrentKeywordIndex(prev => 
      prev === 0 ? currentKeywords.length - 1 : prev - 1
    )
  }

  const goToNextKeyword = () => {
    setCurrentKeywordIndex(prev => 
      (prev + 1) % currentKeywords.length
    )
  }

  const ProgressDot = () => (
    <div className="mt-2 mb-4 flex justify-center gap-4">
      {categories.map((cat, idx) => (
        <div key={cat} className="flex flex-col items-center space-y-1">
          <span
            className={classNames(
              'inline-block h-3 w-3 rounded-full transition-colors',
              idx < activeStep
                ? 'bg-indigo-500'
                : idx === activeStep
                ? 'bg-purple-600'
                : 'bg-gray-300'
            )}
          />
          <span className="text-xs text-gray-600 select-none">
            {cat.replace(/[^\w가-힣]/g, '')}
          </span>
        </div>
      ))}
    </div>
  )

  const visibleKeywords = getVisibleKeywords()

  return (
    <div className="w-full">
      {/* 선택된 키워드 미리보기 */}
      <div className="mb-4 flex flex-wrap justify-center gap-2 px-2">
        {categories.map(cat =>
          selected[cat] ? (
            <span
              key={cat}
              className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm select-none"
            >
              <span>{cat.replace(/[^\w가-힣]/g, '')}: </span>
              {selected[cat]}
            </span>
          ) : null
        )}
      </div>

      {/* 키워드 선택 안내 */}
      <h3 className="mb-4 px-2 text-center text-sm font-bold text-indigo-900 select-none">
        {currentCategory} 키워드를 선택하세요
      </h3>

      {/* 캐러셀 형태 키워드 선택 */}
      <div className="relative px-2 mb-4">
        {/* 왼쪽 화살표 */}
        <button
          onClick={goToPrevKeyword}
          className="absolute left-0 top-1/2 z-10 transform -translate-y-1/2 -translate-x-2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="이전 키워드"
        >
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        </button>

        {/* 키워드 카드들 */}
        <div className="flex justify-center items-center gap-2 px-8">
          {visibleKeywords.map(({ keyword, index, position }) => (
            <button
              key={`${keyword}-${index}`}
              onClick={() => selectKeyword(keyword)}
              type="button"
              className={classNames(
                'transition-all duration-300 ease-in-out rounded-xl border text-center font-medium shadow-sm',
                // 중앙 카드 (position === 2)는 크게, 나머지는 작게
                position === 2 
                  ? 'scale-110 text-sm px-3 py-3 min-w-[100px] opacity-100' 
                  : position === 1 || position === 3
                  ? 'scale-90 text-xs px-3 py-3 min-w-[90px] opacity-80'
                  : 'scale-70 text-xs px-2 py-2 min-w-[80px] opacity-70',
                // 선택된 키워드 스타일
                selected[currentCategory] === keyword
                  ? 'border-indigo-400 bg-gradient-to-r from-indigo-200 to-purple-100 text-indigo-800 shadow-lg'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50',
                // 중앙이 아닌 카드는 호버 시에만 약간 확대
                position !== 2 && 'hover:scale-95'
              )}
            >
              {keyword}
            </button>
          ))}
        </div>

        {/* 오른쪽 화살표 */}
        <button
          onClick={goToNextKeyword}
          className="absolute right-0 top-1/2 z-10 transform -translate-y-1/2 translate-x-2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="다음 키워드"
        >
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* 네비게이션 버튼 및 프로그레스 */}
      <div className="mt-6 flex items-center justify-between px-2">
        <button
          onClick={goPrev}
          disabled={activeStep === 0}
          type="button"
          className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="이전 단계"
        >
          이전
        </button>

        <ProgressDot />

        {activeStep < categories.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!selected[currentCategory]}
            type="button"
            className={classNames(
              'rounded-lg bg-[#D0D6ED]/90 px-5 py-2 text-xs font-bold text-[#2D3243] shadow-md transition hover:bg-[#D0D6ED] disabled:opacity-40 disabled:cursor-not-allowed',
              !selected[currentCategory] && 'pointer-events-none'
            )}
            aria-label="다음 단계"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={categories.some(cat => !selected[cat])}
            type="button"
            className={classNames(
              'rounded-lg bg-gradient-to-r from-purple-400 to-purple-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed',
              categories.some(cat => !selected[cat]) && 'pointer-events-none'
            )}
            aria-label="키워드 조합 완료"
          >
            완성
          </button>
        )}
      </div>

      {/* 초기화/랜덤 생성 버튼들을 하단으로 이동 */}
      <div className="mt-6 flex items-center justify-center gap-3 px-2 pt-4 border-t border-gray-100">
        <button
          onClick={resetAll}
          className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 transition-all hover:scale-105 hover:bg-gray-200"
          aria-label="초기화"
          type="button"
        >
          초기화
        </button>
        <button
          onClick={pickRandomKeywords}
          className="rounded-lg bg-purple-100 px-4 py-2 text-xs font-medium text-purple-600 transition-all hover:scale-105 hover:bg-purple-200"
          aria-label="랜덤 생성"
          type="button"
        >
          랜덤 생성
        </button>
      </div>
    </div>
  )
}

export default function PromptSection({
  promptText,
  setPromptText,
}: PromptSectionProps) {
  const [activeMode, setActiveMode] = useState<'keyword' | 'advanced'>('keyword')
  const [hoveredKeyword] = useState<string | null>(null)
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (hoveredKeyword && containerRef.current) {
        const newWord: FloatingWord = {
          id: Date.now(),
          text: hoveredKeyword,
          x: Math.random() * (containerRef.current.clientWidth - 50),
          y: Math.random() * (containerRef.current.clientHeight - 30),
          opacity: 0.8,
          scale: 1,
        }
        setFloatingWords(prev => [...prev.slice(-2), newWord])
      }
    }, 3500)
    return () => clearInterval(interval)
  }, [hoveredKeyword])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFloatingWords(prev =>
        prev
          .map(word => ({
            ...word,
            opacity: word.opacity - 0.07,
            scale: word.scale + 0.07,
          }))
          .filter(word => word.opacity > 0.05)
      )
    }, 90)
    return () => clearTimeout(timeout)
  }, [floatingWords])

  const generateRandomPrompt = () => {
    setPromptText(
      premiumPrompts[Math.floor(Math.random() * premiumPrompts.length)]
    )
  }

  const resetAll = () => setPromptText('')

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-2xl space-y-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
      aria-label="AI 배경 프롬프트 생성기"
    >
      {/* 플로팅 워드 */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none">
        {floatingWords.map(word => (
          <div
            key={word.id}
            className="absolute text-[10px] font-medium text-indigo-300/20"
            style={{
              left: `${word.x}px`,
              top: `${word.y}px`,
              opacity: word.opacity,
              transform: `scale(${word.scale})`,
            }}
          >
            {word.text}
          </div>
        ))}
      </div>

      {/* 모드 토글 */}
      <div className="relative z-10 flex justify-center gap-2 rounded-lg bg-gray-100 p-1 shadow-inner">
        <button
          onClick={() => setActiveMode('keyword')}
          type="button"
          className={classNames(
            'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition',
            activeMode === 'keyword'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-gray-600 hover:text-gray-800'
          )}
          aria-pressed={activeMode === 'keyword'}
          aria-label="키워드 모드"
        >
          <HashtagIcon className="h-4 w-4" />
          키워드
        </button>
        <button
          onClick={() => setActiveMode('advanced')}
          type="button"
          className={classNames(
            'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition',
            activeMode === 'advanced'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-gray-600 hover:text-gray-800'
          )}
          aria-pressed={activeMode === 'advanced'}
          aria-label="직접 작성 모드"
        >
          <PencilIcon className="h-4 w-4" />
          직접 작성
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="relative z-10">
        {activeMode === 'keyword' ? (
          <StepwiseKeywordPrompt setPromptText={setPromptText} />
        ) : (
          <div className="space-y-4 px-1">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={resetAll}
                type="button"
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:scale-105 hover:bg-gray-200"
                aria-label="프롬프트 초기화"
              >
                초기화
              </button>
              <button
                onClick={generateRandomPrompt}
                type="button"
                className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-600 transition-all hover:scale-105 hover:bg-purple-200"
                aria-label="프롬프트 랜덤 생성"
              >
                랜덤 생성
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-500">
              🎨 분위기 → 🏞️ 장소 → 🌅 시간대 → 📸 스타일 순으로 작성하세요.
            </p>
            <textarea
              rows={5}
              className="block w-full resize-y rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              placeholder="예시: 유쾌한 놀이공원에서 황금노을, 필름 카메라 스타일"
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              aria-label="프롬프트 직접 작성 입력란"
            />
          </div>
        )}
      </div>

      {/* 프롬프트 미리보기 */}
      {promptText && (
        <div className="relative z-10 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-800">
                  🎬 프롬프트 미리보기
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white/90 p-3 shadow-sm break-words whitespace-pre-wrap">
                <p className="text-sm leading-relaxed font-medium text-emerald-900 select-text">
                  {promptText}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}