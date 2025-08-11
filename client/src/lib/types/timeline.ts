// src/lib/types/timeline.ts

import { FeedItem, CanvasElement } from './feed'

// 타임라인 포스트 (피드 아이템 확장)
export interface TimelinePost extends FeedItem {
  // 타임라인 특화 속성
  priority: number // 노출 우선순위 (0-100)
  engagementScore: number // 참여도 점수 (0-100)
  algorithmScore: number // 알고리즘 점수 (0-100)
  isPromoted?: boolean // 프로모션 포스트 여부
  promotionType?: 'sponsored' | 'featured' | 'trending'
  
  // 상호작용 메타데이터
  interactions?: {
    views: number
    shares: number
    saves: number
    comments: number
    reactions: TimelineReaction[]
  }
  
  // 타임라인 컨텍스트
  context?: {
    source: 'following' | 'recommended' | 'trending' | 'promoted'
    reason?: string // 추천 이유
    relatedUsers?: string[] // 관련 사용자 ID들
  }
}

// 타임라인 반응
export interface TimelineReaction {
  type: 'like' | 'love' | 'wow' | 'laugh' | 'sad' | 'angry'
  count: number
  userReacted?: boolean
}

// 타임라인 필터 옵션
export interface TimelineFilters {
  followingOnly?: boolean // 팔로잉만 표시
  includePromoted?: boolean // 프로모션 포스트 포함
  contentTypes?: TimelineContentType[] // 컨텐츠 타입 필터
  hashtags?: string[] // 해시태그 필터
  dateRange?: {
    from: string
    to: string
  }
  minEngagement?: number // 최소 참여도
  excludeUsers?: string[] // 제외할 사용자들
}

// 타임라인 컨텐츠 타입
export type TimelineContentType = 
  | 'image' 
  | 'drawing' 
  | 'mixed' 
  | 'text_only'
  | 'video' // 미래 확장용

// 타임라인 정렬 옵션
export type TimelineSort = 
  | 'chronological' // 시간순
  | 'algorithmic' // 알고리즘 기반
  | 'engagement' // 참여도순
  | 'trending' // 트렌딩순

// 타임라인 설정
export interface TimelineSettings {
  defaultSort: TimelineSort
  autoRefresh: boolean
  refreshInterval: number // 초 단위
  showPromoted: boolean
  showRecommended: boolean
  enableInfiniteScroll: boolean
  postsPerPage: number
  
  // 콘텐츠 선호도
  contentPreferences: {
    showSensitive: boolean
    preferredLanguages: string[]
    blockedKeywords: string[]
    favoriteTopics: string[]
  }
  
  // 알고리즘 조정
  algorithmWeights: {
    recency: number // 최신성 가중치
    engagement: number // 참여도 가중치
    relationship: number // 관계성 가중치 (팔로우 등)
    personalization: number // 개인화 가중치
  }
}

// 타임라인 상태
export interface TimelineState {
  posts: TimelinePost[]
  loading: boolean
  error: string | null
  hasMore: boolean
  lastRefresh: string
  currentPage: number
  totalPosts: number
  
  // 실시간 상태
  newPostsAvailable: number
  isAutoRefreshing: boolean
  
  // 필터 상태
  activeFilters: TimelineFilters
  appliedSort: TimelineSort
}

// 타임라인 메타데이터
export interface TimelineMeta {
  generatedAt: string
  algorithm: string
  version: string
  personalizedFor: string // 사용자 ID
  
  // 통계
  stats: {
    totalAvailablePosts: number
    filteredPosts: number
    promotedPosts: number
    followingPosts: number
    recommendedPosts: number
  }
  
  // 성능 메트릭
  performance: {
    loadTime: number
    renderTime: number
    cacheHitRate: number
  }
}

// 타임라인 이벤트
export type TimelineEvent = 
  | { type: 'POST_LIKED'; postId: string; userId: string }
  | { type: 'POST_SHARED'; postId: string; userId: string }
  | { type: 'POST_SAVED'; postId: string; userId: string }
  | { type: 'POST_COMMENTED'; postId: string; userId: string; commentId: string }
  | { type: 'POST_VIEWED'; postId: string; userId: string; viewDuration: number }
  | { type: 'TIMELINE_REFRESHED'; timestamp: string }
  | { type: 'FILTER_APPLIED'; filters: TimelineFilters }
  | { type: 'SORT_CHANGED'; sort: TimelineSort }

// 타임라인 분석 데이터
export interface TimelineAnalytics {
  userId: string
  period: {
    start: string
    end: string
  }
  
  // 사용 패턴
  usage: {
    totalViews: number
    totalTime: number // 초 단위
    averageSessionTime: number
    postsViewed: number
    postsEngaged: number // 좋아요, 댓글, 공유 등
  }
  
  // 선호도 분석
  preferences: {
    preferredContentTypes: ContentTypePreference[]
    favoriteHashtags: HashtagPreference[]
    activeHours: HourlyActivity[]
    engagementPatterns: EngagementPattern[]
  }
  
  // 소셜 상호작용
  social: {
    mostInteractedUsers: UserInteraction[]
    discoveredUsers: string[] // 새로 발견한 사용자들
    followingGrowth: number
  }
}

export interface ContentTypePreference {
  type: TimelineContentType
  viewCount: number
  engagementRate: number
  preference: number // 0-100
}

export interface HashtagPreference {
  hashtag: string
  frequency: number
  lastSeen: string
  interest: number // 0-100
}

export interface HourlyActivity {
  hour: number // 0-23
  activity: number // 활동량
  engagement: number // 참여도
}

export interface EngagementPattern {
  action: 'like' | 'comment' | 'share' | 'save'
  frequency: number
  averageTime: number // 포스트 본 후 액션까지의 시간
}

export interface UserInteraction {
  userId: string
  username: string
  interactionCount: number
  lastInteraction: string
  interactionTypes: {
    likes: number
    comments: number
    shares: number
  }
}

// 타임라인 알고리즘 구성
export interface TimelineAlgorithmConfig {
  name: string
  version: string
  
  // 신호 가중치
  signals: {
    // 컨텐츠 신호
    contentFreshness: number // 컨텐츠 신선도
    contentQuality: number // 컨텐츠 품질
    contentRelevance: number // 사용자와의 관련성
    
    // 사회적 신호
    authorFollowStatus: number // 작성자 팔로우 상태
    authorInteractionHistory: number // 작성자와의 상호작용 이력
    mutualEngagement: number // 상호 참여도
    
    // 참여 신호
    likesWeight: number
    commentsWeight: number
    sharesWeight: number
    savesWeight: number
    viewTimeWeight: number
    
    // 시간적 신호
    recencyBoost: number // 최신성 부스트
    trendingBoost: number // 트렌딩 부스트
    timeDecay: number // 시간 감쇠율
  }
  
  // 다양성 설정
  diversity: {
    enableContentTypeDiversity: boolean
    enableAuthorDiversity: boolean
    enableTopicDiversity: boolean
    diversityThreshold: number // 0-1
  }
  
  // 개인화 설정
  personalization: {
    useViewHistory: boolean
    useEngagementHistory: boolean
    useFollowingBehavior: boolean
    useDemographics: boolean
    personalizationStrength: number // 0-1
  }
}

// 타임라인 A/B 테스트 구성
export interface TimelineExperiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'completed' | 'paused'
  
  // 실험 설정
  config: {
    startDate: string
    endDate: string
    targetUsers: number
    userAllocation: number // 0-1, 실험에 참여할 사용자 비율
  }
  
  // 실험 변형
  variants: {
    control: TimelineAlgorithmConfig
    treatment: TimelineAlgorithmConfig
  }
  
  // 측정 지표
  metrics: {
    primary: TimelineMetric[]
    secondary: TimelineMetric[]
  }
}

export interface TimelineMetric {
  name: string
  type: 'engagement_rate' | 'time_spent' | 'posts_viewed' | 'user_retention' | 'custom'
  target: number
  current?: number
  improvement?: number // 개선율 (%)
}

// 타임라인 캐시 구조
export interface TimelineCache {
  key: string
  userId: string
  posts: TimelinePost[]
  metadata: TimelineMeta
  createdAt: string
  expiresAt: string
  version: number
  
  // 캐시 메트릭
  metrics: {
    hitRate: number
    missRate: number
    averageLoadTime: number
    lastAccessed: string
  }
}