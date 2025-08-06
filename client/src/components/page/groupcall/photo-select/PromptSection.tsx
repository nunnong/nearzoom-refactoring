'use client'
import { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  PaintBrushIcon,
  BeakerIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { Tab } from '@headlessui/react'
// 타입 정의
interface PromptTemplate {
  [mood: string]: {
    [location: string]: string
  }
}
interface AIQuestion {
  question: string
  options: string[]
  emoji: string
}
interface SelectedOptions {
  [stepIndex: number]: string
}
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
function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
export default function PromptSection({
  promptText,
  setPromptText,
}: PromptSectionProps) {
  const [activeMode, setActiveMode] = useState(
    'magic' as 'quick' | 'guided' | 'advanced' | 'magic'
  )
  const [showAIChat, setShowAIChat] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null)
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([])
  const [aiPersonality, setAiPersonality] = useState('friendly') // friendly, professional, creative, trendy
  const containerRef = useRef<HTMLDivElement>(null)

  // 고급 카테고리별 키워드 (경쟁사와 차별화)
  const advancedCategories = {
    '✨ 무드': {
      keywords: [
        '몽환적인',
        '빈티지',
        '미니멀',
        '럭셔리',
        '아늑한',
        '역동적인',
        '신비로운',
        '따뜻한',
      ],
      colors: [
        'from-purple-400 to-pink-400',
        'from-amber-400 to-orange-400',
        'from-blue-400 to-cyan-400',
      ],
    },
    '🏞️ 장소': {
      keywords: [
        '프리미엄 카페',
        '루프탑 바',
        '아트 갤러리',
        '비밀 정원',
        '모던 스튜디오',
        '바닷가 별장',
        '도시 전망대',
        '숨겨진 골목',
      ],
      colors: [
        'from-green-400 to-emerald-400',
        'from-teal-400 to-blue-400',
        'from-indigo-400 to-purple-400',
      ],
    },
    '🌅 시간대': {
      keywords: [
        '골든아워',
        '블루아워',
        '새벽 안개',
        '한밤의 네온',
        '석양 무렵',
        '별이 쏟아지는 밤',
        '이른 아침',
        '황혼',
      ],
      colors: [
        'from-yellow-400 to-orange-400',
        'from-blue-600 to-purple-600',
        'from-pink-400 to-rose-400',
      ],
    },
    '🎨 스타일': {
      keywords: [
        '시네마틱',
        '필름 그레인',
        'Y2K 감성',
        '네오 클래식',
        '어반 스트릿',
        '보타니컬',
        '인더스트리얼',
        '드림코어',
      ],
      colors: [
        'from-gray-400 to-gray-600',
        'from-rose-400 to-pink-400',
        'from-cyan-400 to-blue-400',
      ],
    },
    '⚡ 특수효과': {
      keywords: [
        '소프트 글로우',
        '렌즈 플레어',
        '보케 효과',
        '라이트 리크',
        '미스트 오버레이',
        '컬러 그라디언트',
        '샤도우 플레이',
        '실루엣',
      ],
      colors: [
        'from-purple-500 to-indigo-500',
        'from-yellow-500 to-red-500',
        'from-green-500 to-teal-500',
      ],
    },
  }
  // 트렌디한 예시 프롬프트 (2025년 감성)
  const trendyPrompts = [
    '골든아워의 프리미엄 카페, 소프트 글로우와 보케 효과가 어우러진 몽환적인 분위기',
    '네온사인이 반사되는 비 내리는 도시 거리, 시네마틱한 블루아워 감성',
    '별이 쏟아지는 밤 루프탑에서, 도시 전망과 함께하는 로맨틱한 순간',
    '미스트가 감도는 비밀 정원, 드림코어 감성의 보타니컬 배경',
    'Y2K 감성의 아트 갤러리, 컬러 그라디언트와 렌즈 플레어 효과',
    '새벽 안개 속 바닷가 별장, 필름 그레인이 살아있는 빈티지 무드',
    '인더스트리얼한 모던 스튜디오, 샤도우 플레이가 만드는 럭셔리한 분위기',
    '황혼 무렵 숨겨진 골목, 라이트 리크와 실루엣이 연출하는 신비로운 장면',
  ]
  // AI 성격별 질문 스타일
  const aiQuestions: { [key: string]: AIQuestion[] } = {
    friendly: [
      {
        question: '어떤 기분으로 사진을 찍고 싶어요? 🤗',
        options: [
          '설레고 행복한',
          '차분하고 여유로운',
          '신나고 역동적인',
          '로맨틱하고 감성적인',
        ],
        emoji: '💫',
      },
      {
        question: '어떤 장소가 끌리시나요? 🏞️',
        options: [
          '따뜻한 실내 공간',
          '자연이 있는 실외',
          '도시적인 분위기',
          '특별한 컨셉 공간',
        ],
        emoji: '🎯',
      },
      {
        question: '어떤 특별한 효과를 원하세요? ✨',
        options: [
          '부드러운 조명 효과',
          '화려한 색감',
          '빈티지 필름 느낌',
          '미래적인 네온 효과',
        ],
        emoji: '🎨',
      },
    ],
    creative: [
      {
        question: '당신의 창작 영감은? 🎭',
        options: [
          '몽환적인 드림스케이프',
          '시네마틱 스토리텔링',
          '아방가르드 아트',
          '네오 레트로 퓨처',
        ],
        emoji: '🌈',
      },
      {
        question: '공간의 에너지를 선택하세요 ⚡',
        options: [
          '미니멀 젠 스페이스',
          '맥시멀 컬러 익스플로전',
          '인더스트리얼 로우파이',
          '보타니컬 오가닉',
        ],
        emoji: '🔮',
      },
      {
        question: '시각적 텍스처는? 🎪',
        options: [
          '벨벳 소프트니스',
          '크리스탈 샤프니스',
          '필름 그레인 러프니스',
          '디지털 글리치',
        ],
        emoji: '✨',
      },
    ],
  }
  // 모드 목록 + icon
  const modes = [
    { key: 'magic', label: '매직 생성', icon: SparklesIcon },
    { key: 'quick', label: '키워드 빌더', icon: PaintBrushIcon },
    { key: 'guided', label: 'AI 상담', icon: ChatBubbleLeftRightIcon },
    { key: 'advanced', label: '직접 작성', icon: BeakerIcon },
  ]
  // 플로팅 단어 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      if (hoveredKeyword && containerRef.current) {
        const newWord: FloatingWord = {
          id: Date.now(),
          text: hoveredKeyword,
          x: Math.random() * 300,
          y: Math.random() * 200,
          opacity: 1,
          scale: 1,
        }
        setFloatingWords(prev => [...prev.slice(-5), newWord])
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [hoveredKeyword])
  // 플로팅 단어 애니메이션 제거
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFloatingWords(prev =>
        prev
          .map(word => ({
            ...word,
            opacity: word.opacity - 0.1,
            scale: word.scale + 0.1,
          }))
          .filter(word => word.opacity > 0)
      )
    }, 100)
    return () => clearTimeout(timeout)
  }, [floatingWords])
  // 매직 프롬프트 생성 (AI처럼 보이는 로직)
  const generateMagicPrompt = async () => {
    setIsGenerating(true)
    // 선택된 키워드를 조합
    const categories = Object.keys(advancedCategories)
    const selectedFromEach = categories.map(category => {
      const keywords =
        advancedCategories[category as keyof typeof advancedCategories].keywords
      return keywords[Math.floor(Math.random() * keywords.length)]
    })

    // 단계별 프롬프트 생성 시뮬레이션
    const steps = [
      '창의적 영감 수집 중...',
      '시각적 요소 분석 중...',
      '색감 조합 최적화 중...',
      '분위기 완성 중...',
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      // 여기서 실제로는 로딩 상태 업데이트
    }

    const magicPrompt = `${selectedFromEach[0]} 분위기의 ${selectedFromEach[1]}에서, ${selectedFromEach[2]} 시간대의 ${selectedFromEach[3]} 스타일로, ${selectedFromEach[4]} 효과가 어우러진 특별한 순간`

    setPromptText(magicPrompt)
    setIsGenerating(false)
  }
  // 키워드 선택/해제
  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    )
  }
  // 선택된 키워드로 프롬프트 구성
  const buildPromptFromKeywords = () => {
    if (selectedKeywords.length === 0) return
    const prompt = selectedKeywords.join(', ') + '이 어우러진 특별한 배경'
    setPromptText(prompt)
  }
  // AI 대화 진행
  const handleAIOptionSelect = (option: string) => {
    const newSelected = { ...selectedOptions, [currentStep]: option }
    setSelectedOptions(newSelected)
    if (currentStep < aiQuestions[aiPersonality].length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      const generatedPrompt = generateAdvancedPromptFromSelections(newSelected)
      setPromptText(generatedPrompt)
      setShowAIChat(false)
      setCurrentStep(0)
      setSelectedOptions({})
    }
  }
  // 고급 프롬프트 생성
  const generateAdvancedPromptFromSelections = (
    selections: SelectedOptions
  ): string => {
    const mood = selections[0] || '설레고 행복한'
    const space = selections[1] || '따뜻한 실내 공간'
    const effect = selections[2] || '부드러운 조명 효과'
    const templates = {
      '설레고 행복한': {
        '따뜻한 실내 공간': '골든 라이트가 따뜻하게 감싸는 아늑한 카페',
        '자연이 있는 실외': '햇살이 쏟아지는 꽃가득한 정원',
        '도시적인 분위기': '활기찬 도심 속 모던한 루프탑',
        '특별한 컨셉 공간': '드림키처 감성의 파스텔 스튜디오',
      },
      '차분하고 여유로운': {
        '따뜻한 실내 공간': '미니멀한 인테리어의 조용한 서재',
        '자연이 있는 실외': '안개가 살짝 낀 평화로운 호숫가',
        '도시적인 분위기': '고요한 새벽의 도시 전망대',
        '특별한 컨셉 공간': '젠 스타일의 명상 공간',
      },
    }

    const effectMap = {
      '부드러운 조명 효과': ', 소프트 글로우와 보케 효과',
      '화려한 색감': ', 비비드한 컬러 그라디언트',
      '빈티지 필름 느낌': ', 필름 그레인과 레트로 색감',
      '미래적인 네온 효과': ', 네온 라이트와 사이버펑크 무드',
    }

    const baseLocation =
      templates[mood as keyof typeof templates]?.[
        space as keyof (typeof templates)[keyof typeof templates]
      ] || '특별한 공간'
    const effectText = effectMap[effect as keyof typeof effectMap] || ''

    return `${baseLocation}${effectText}가 어우러진 마법같은 순간`
  }
  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-2xl space-y-8 overflow-hidden rounded-3xl bg-white p-8 shadow-xl"
    >
      {/* 플로팅 워드 애니메이션 */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {floatingWords.map(word => (
          <div
            key={word.id}
            className="absolute animate-pulse text-xs text-blue-300/30"
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow">
          <SparklesIcon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 md:text-2xl">
          AI 프롬프트 스튜디오
        </h2>
        <div className="text-sm text-gray-500">
          나만의 감성 배경을 쉽고 트렌디하게!
        </div>
      </div>

      {/* 모드 탭 (Headless UI) */}
      <div className="relative z-10">
        <Tab.Group
          selectedIndex={modes.findIndex(m => m.key === activeMode)}
          onChange={idx => setActiveMode(modes[idx].key as any)}
        >
          <Tab.List className="flex gap-2 rounded-xl bg-gray-100 p-2 shadow-inner">
            {modes.map(({ key, icon: Icon, label }, idx) => (
              <Tab
                key={key}
                className={({ selected }) =>
                  classNames(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-all outline-none',
                    selected
                      ? 'scale-105 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-white hover:text-indigo-600'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-8">
            {/* ====== MAGIC MODE ====== */}
            <Tab.Panel>
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg">
                  <SparklesIcon className="h-10 w-10 text-white" />
                </div>
                <div className="text-center">
                  <h4 className="mb-1 text-xl font-bold">
                    원클릭 매직 프롬프트
                  </h4>
                  <p className="text-gray-500">
                    AI가 트렌드를 분석해 완벽한 배경을 제안합니다
                  </p>
                </div>
                <button
                  onClick={generateMagicPrompt}
                  disabled={isGenerating}
                  className="group mt-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 px-6 py-3 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-98 disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      생성중...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-6 w-6" />✨ 매직 생성
                    </>
                  )}
                </button>
              </div>
            </Tab.Panel>

            {/* ====== QUICK/KEYWORD MODE ====== */}
            <Tab.Panel>
              <div className="space-y-6">
                {Object.entries(advancedCategories).map(
                  ([cat, { keywords, colors }], idx) => (
                    <div key={cat}>
                      <div className="mb-2 flex items-center gap-2">
                        <h5 className="font-semibold text-indigo-700">{cat}</h5>
                        <span className="h-px flex-1 bg-gradient-to-r from-indigo-300 to-transparent" />
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {keywords.map((kw, kidx) => {
                          const isSel = selectedKeywords.includes(kw)
                          const colorClass = colors[kidx % colors.length]
                          return (
                            <button
                              key={kw}
                              onClick={() => toggleKeyword(kw)}
                              onMouseEnter={() => setHoveredKeyword(kw)}
                              onMouseLeave={() => setHoveredKeyword(null)}
                              className={classNames(
                                'flex items-center gap-1 rounded-xl border-2 px-3 py-2 text-sm font-medium shadow-sm transition-all focus:outline-none',
                                isSel
                                  ? `bg-gradient-to-r ${colorClass} scale-105 border-transparent text-white shadow`
                                  : 'border-gray-100 bg-white text-gray-700 hover:scale-105 hover:bg-gradient-to-r'
                              )}
                              aria-pressed={isSel}
                            >
                              {isSel && (
                                <StarIcon className="h-3 w-3 text-yellow-400" />
                              )}
                              {kw}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                )}

                {/* 선택 키워드 */}
                {selectedKeywords.length > 0 && (
                  <div className="mt-2 flex items-end justify-between">
                    <div className="flex flex-wrap gap-2">
                      {selectedKeywords.map(kw => (
                        <span
                          key={kw}
                          className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-600"
                        >
                          {kw}
                          <button
                            onClick={() => toggleKeyword(kw)}
                            className="ml-1 text-indigo-400 hover:text-red-600"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={buildPromptFromKeywords}
                      className="ml-4 rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-bold text-white shadow transition hover:bg-indigo-600"
                    >
                      AI 조합
                    </button>
                  </div>
                )}

                {/* 트렌드 예시 */}
                <div>
                  <h6 className="mb-2 font-semibold text-indigo-700">
                    🔥 트렌디 샘플
                  </h6>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {trendyPrompts.slice(0, 4).map(prompt => (
                      <button
                        key={prompt}
                        className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-4 py-2 text-left shadow-sm transition hover:bg-indigo-50 hover:text-indigo-700"
                        onClick={() => setPromptText(prompt)}
                      >
                        <FireIcon className="h-4 w-4 flex-shrink-0 text-pink-400" />
                        <span className="truncate text-sm">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Tab.Panel>

            {/* ====== GUIDED/AI 상담 MODE ====== */}
            <Tab.Panel>
              <div className="space-y-6 text-center">
                <div className="mb-4 flex justify-center gap-3">
                  {[
                    { key: 'friendly', label: '친근한 AI', emoji: '😊' },
                    { key: 'creative', label: '창작자 AI', emoji: '🎨' },
                  ].map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => setAiPersonality(key)}
                      className={classNames(
                        'flex items-center gap-1 rounded-xl px-4 py-2 font-semibold transition-colors',
                        aiPersonality === key
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      )}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>

                {!showAIChat ? (
                  <>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500">
                      <ChatBubbleLeftRightIcon className="h-10 w-10 text-white" />
                    </div>
                    <button
                      onClick={() => setShowAIChat(true)}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-700 py-3 text-lg font-bold text-white transition hover:scale-105"
                    >
                      <ChatBubbleLeftRightIcon className="mr-1 inline-block h-6 w-6" />
                      상담 시작
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-6 shadow">
                    <div className="mb-5">
                      <span className="inline-flex items-center rounded-full bg-blue-200 px-3 py-1 font-bold text-blue-800">
                        {aiQuestions[aiPersonality][currentStep].emoji}
                        {aiQuestions[aiPersonality][currentStep].question}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aiQuestions[aiPersonality][currentStep].options.map(
                        (option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAIOptionSelect(option)}
                            className="block w-full rounded-lg border border-indigo-100 bg-white px-4 py-2 text-left font-semibold shadow transition hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowAIChat(false)
                        setCurrentStep(0)
                        setSelectedOptions({})
                      }}
                      className="mx-auto mt-5 block text-xs text-gray-500 underline hover:text-gray-900"
                    >
                      처음으로 돌아가기
                    </button>
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* ====== ADVANCED MODE ====== */}
            <Tab.Panel>
              <div className="space-y-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-indigo-800">
                    ✍️ 직접 프롬프트
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPromptText('')}
                      className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      초기화
                    </button>
                    <button
                      onClick={generateMagicPrompt}
                      className="rounded bg-purple-100 px-3 py-1 text-xs text-purple-600 hover:bg-purple-200"
                    >
                      AI 제안
                    </button>
                  </div>
                </div>
                <textarea
                  rows={5}
                  className="block min-h-[120px] w-full rounded-xl border border-indigo-200 p-4 text-gray-700 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="예시: 몽환적인 노을, 네온사인 글로우, 35mm, 드림코어 느낌 ..."
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                  <span>{promptText.length}자</span>
                  <span
                    className={classNames(
                      promptText.length > 150
                        ? 'text-green-600'
                        : promptText.length > 50
                          ? 'text-yellow-600'
                          : ''
                    )}
                  >
                    {promptText.length > 150
                      ? '상급'
                      : promptText.length > 50
                        ? '중급'
                        : '초급'}
                  </span>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* ===== 프롬프트 미리보기 ===== */}
      {promptText && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-6 shadow-md">
          <div
            className="pointer-events-none absolute inset-0 opacity-5"
            style={{
              background:
                'radial-gradient(circle at 50% 40px, #5eead480 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-3 shadow">
              <EyeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-lg font-bold text-emerald-800">
                  🎬 미리보기
                </h5>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon
                        key={star}
                        className={classNames(
                          'h-4 w-4',
                          promptText.length > star * 30
                            ? 'fill-current text-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    품질
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-4 py-3">
                <span className="block font-semibold text-emerald-900">
                  {promptText}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {promptText
                  .split(/[,\s]+/)
                  .filter(word => word.length > 2)
                  .slice(0, 7)
                  .map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700"
                    >
                      ● {word.replace(/[^\w가-힣]/g, '')}
                    </span>
                  ))}
                {promptText.split(/[,\s]+/).filter(word => word.length > 2)
                  .length > 7 && (
                  <span className="text-xs font-bold text-emerald-500">
                    +
                    {promptText.split(/[,\s]+/).filter(word => word.length > 2)
                      .length - 7}{' '}
                    더보기
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 하단 액션버튼 ===== */}
      <div className="relative z-10 flex flex-col gap-4 pt-2 sm:flex-row">
        <button
          onClick={generateMagicPrompt}
          className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white shadow transition hover:scale-105"
        >
          <div className="flex items-center justify-center gap-2">
            <SparklesIcon className="h-5 w-5" />✨ 새로운 아이디어
          </div>
        </button>
        <button
          onClick={() => {
            const randomPrompt =
              trendyPrompts[Math.floor(Math.random() * trendyPrompts.length)]
            setPromptText(randomPrompt)
          }}
          className="flex-1 rounded-xl border-2 border-indigo-200 bg-white px-6 py-3 font-bold text-indigo-600 shadow transition hover:bg-indigo-50"
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowPathIcon className="h-5 w-5" />
            🎲 트렌드 랜덤
          </div>
        </button>
      </div>
    </div>
  )
}
