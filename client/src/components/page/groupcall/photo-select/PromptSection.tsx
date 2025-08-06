'use client'
import { Tab } from '@headlessui/react'
import { HashtagIcon, PencilIcon} from '@heroicons/react/24/outline'
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

  const currentCategory = categories[activeStep]

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
    setPromptText('')
  }

  // 카테고리별 1개 랜덤 선택
  const pickRandomKeywords = () => {
    const newPicked: { [category in KeywordCategory]?: string } = {}
    categories.forEach(cat => {
      const list = keywordCategories[cat].keywords
      newPicked[cat] = list[Math.floor(Math.random() * list.length)]
    })
    setSelected(newPicked)
    setActiveStep(categories.length - 1) // 마지막스텝으로 이동
  }

  const handleGenerate = () => setPromptText(generatePrompt(selected))
  const selectKeyword = (keyword: string) =>
    setSelected(prev => ({ ...prev, [currentCategory]: keyword }))
  const goPrev = () => setActiveStep(s => (s > 0 ? s - 1 : 0))
  const goNext = () =>
    setActiveStep(s => (s < categories.length - 1 ? s + 1 : s))

  // 진행점
  const ProgressDot = () => (
    <div className="mt-2 mb-4 flex justify-center gap-2">
      {categories.map((cat, idx) => (
        <span
          key={cat}
          className={classNames(
            'inline-block h-2.5 w-2.5 rounded-full transition-colors',
            idx < activeStep
              ? 'bg-indigo-400'
              : idx === activeStep
                ? 'bg-purple-500'
                : 'bg-gray-200'
          )}
        />
      ))}
    </div>
  )
  const Preview = () => (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
      {categories.map(cat =>
        selected[cat] ? (
          <span
            key={cat}
            className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 shadow"
          >
            <span>{cat.replace(/[^\w가-힣]/g, '')}: </span>
            {selected[cat]}
          </span>
        ) : null
      )}
    </div>
  )

  return (
    <div className="w-full">
      {/* 상단 설명/버튼 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-rg flex items-center gap-2 font-semibold text-indigo-800">
          <HashtagIcon className="h-5 w-5" />
          단계별 키워드 조합
        </span>
        <ProgressDot />
        <div className="flex gap-2">
          <button
            onClick={resetAll}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:scale-105 hover:bg-gray-200"
          >
            초기화
          </button>
          <button
            onClick={pickRandomKeywords}
            className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-600 transition-all hover:scale-105 hover:bg-purple-200"
          >
            랜덤 생성
          </button>
        </div>
      </div>
      
      {/* 설명
      <div className="mb-2 rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 shadow-sm">
        💡 <span className="font-medium">선택 순서 :</span> 🎨분위기 → 🏞️장소 →
        🌅시간대 → 📸스타일
      </div> */}
      
      <Preview />

      {/* 키워드 선택 */}
      <div className="mb-2 text-center">
        <h2 className="mb-1 text-base font-bold text-indigo-900 select-none">
          {currentCategory} 키워드를 선택하세요
        </h2>
        <div className="mt-2 grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {keywordCategories[currentCategory].keywords.map(keyword => (
            <button
              key={keyword}
              onClick={() => selectKeyword(keyword)}
              className={classNames(
                'w-full rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition',
                selected[currentCategory] === keyword
                  ? 'scale-105 border-indigo-400 bg-gradient-to-r from-indigo-200 to-purple-100 text-indigo-800 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
              )}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {/* 네비게이션 버튼 */}
      <div className="mt-4 flex justify-between gap-2">
        <button
          onClick={goPrev}
          disabled={activeStep === 0}
          className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 disabled:opacity-50"
        >
          이전
        </button>
        {activeStep < categories.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!selected[currentCategory]}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={categories.some(cat => !selected[cat])}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50"
          >
            프롬프트 조합 완료
          </button>
        )}
      </div>

      {/* 미리보기 */}
      {categories.every(cat => selected[cat]) && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-1 text-xs font-bold text-indigo-800">미리보기</div>
          <div className="font-semibold text-indigo-900">
            {generatePrompt(selected)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PromptSection({
  promptText,
  setPromptText,
}: PromptSectionProps) {
  const [activeMode, setActiveMode] = useState<'keyword' | 'advanced'>(
    'keyword'
  )
  const [hoveredKeyword] = useState<string | null>(null)
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // 플로팅 워드 (이펙트)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hoveredKeyword && containerRef.current) {
        const newWord: FloatingWord = {
          id: Date.now(),
          text: hoveredKeyword,
          x: Math.random() * 220,
          y: Math.random() * 140,
          opacity: 0.8,
          scale: 1,
        }
        setFloatingWords(prev => [...prev.slice(-2), newWord])
      }
    }, 3300)
    return () => clearInterval(interval)
  }, [hoveredKeyword])
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFloatingWords(prev =>
        prev
          .map(word => ({
            ...word,
            opacity: word.opacity - 0.06,
            scale: word.scale + 0.06,
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

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-xl space-y-6 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
    >
      {/* 플로팅 워드 */}
      <div className="pointer-events-none absolute inset-0 z-0">
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

      {/* 헤더 */}
      <div className="relative z-10 space-y-2 text-center">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
          AI 프롬프터
        </h2>
        <p className="text-sm text-gray-500">
          키워드 조합 또는 직접 입력으로 배경을 생성해보세요
        </p>
      </div>

      {/* 탭 */}
      <div className="relative z-10">
        <Tab.Group
          selectedIndex={activeMode === 'keyword' ? 0 : 1}
          onChange={idx => setActiveMode(idx === 0 ? 'keyword' : 'advanced')}
        >
          <Tab.List className="flex gap-2 rounded-xl bg-gray-50 p-2 shadow-inner">
            <Tab
              className={({ selected }) =>
                classNames(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all focus:outline-none',
                  selected
                    ? 'scale-105 transform bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                    : 'text-indigo-700 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                )
              }
            >
              <HashtagIcon className="h-5 w-5" />
              키워드 조합
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all focus:outline-none',
                  selected
                    ? 'scale-105 transform bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                    : 'text-indigo-700 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                )
              }
            >
              <PencilIcon className="h-5 w-5" />
              직접 작성
            </Tab>
          </Tab.List>

          <Tab.Panels className="mt-6">
            {/* 키워드 조합(단계별/액션버튼 동일) */}
            <Tab.Panel>
              <StepwiseKeywordPrompt setPromptText={setPromptText} />
            </Tab.Panel>

            {/* 직접 작성 */}
            <Tab.Panel>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-rg flex items-center gap-2 font-semibold text-indigo-800">
                    <PencilIcon className="h-5 w-5" />
                    프롬프트 작성
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPromptText('')}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:scale-105 hover:bg-gray-200"
                    >
                      초기화
                    </button>
                    <button
                      onClick={generateRandomPrompt}
                      className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-600 transition-all hover:scale-105 hover:bg-purple-200"
                    >
                      랜덤 생성
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mb-2 rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 shadow-sm">
                    💡 <span className="font-medium">작성 순서 팁 :</span>{' '}
                    🎨분위기 → 🏞️장소 → 🌅시간대 → 📸스타일
                  </div>
                  <textarea
                    rows={5}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    placeholder="예시: 유쾌한 놀이공원에서 황금노을, 필름 카메라 스타일"
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                  />
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* 프롬프트 미리보기 */}
      {promptText && (
        <div className="relative rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-800">
                  🎬 프롬프트 미리보기
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white/90 p-3 shadow-sm">
                <p className="text-sm leading-relaxed font-medium text-emerald-900">
                  {promptText}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {promptText
                  .split(/[,\s]+/)
                  .filter(word => word.length > 2)
                  .slice(0, 6)
                  .map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                    >
                      {word.replace(/[^\w가-힣]/g, '')}
                    </span>
                  ))}
                {promptText.split(/[,\s]+/).filter(word => word.length > 2)
                  .length > 6 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">
                    +
                    {promptText.split(/[,\s]+/).filter(word => word.length > 2)
                      .length - 6}{' '}
                    더보기
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
