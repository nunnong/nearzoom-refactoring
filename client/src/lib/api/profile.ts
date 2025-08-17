// ============================================================================
// 📁 /lib/api/profile.ts - 프로필 관련 API 함수들
// ============================================================================

import api from '@/lib/axios'

// ============================================================================
// 타입 정의
// ============================================================================

interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T | null
}

interface UserProfileData {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  profileImage?: string
  prettyFace?: string
  bio?: string
  followerCount?: number
  followingCount?: number
  postCount?: number
  isFollowing?: boolean
  isOwnProfile?: boolean
  joinedAt?: string
  location?: string
  website?: string
}

interface PostData {
  postId: number
  photoId: number
  imgUrl: string
  caption: string | null
  createdAt: string
  likeCount: number
  isLikedByMe: boolean
  authorId: number
  authorAccountName: string
  authorProfileImage: string | null
}

interface FollowCountsData {
  followerCount: number
  followingCount: number
}

// ============================================================================
// 프로필 API 함수들
// ============================================================================

export const profileAPI = {
  // 🔥 GET /feeds/explore로 사용자 프로필 조회 (대안 방법)
  getUserProfile: async (accountName: string): Promise<UserProfileData> => {
    console.log(`🔍 API 요청: 사용자 프로필 조회 (accountName: ${accountName})`)

    const cleanAccountName = accountName.replace(/^@/, '')

    try {
      // 500 에러 때문에 대안 방법 사용: explore API에서 해당 사용자 게시물 찾기
      console.log('🔄 대안 방법: explore API를 통한 사용자 검색')

      const response = await api.get<ApiResponse<any>>(
        '/feeds/explore?limit=100'
      )

      if (response.data.error || !response.data.data) {
        throw new Error('사용자 데이터를 찾을 수 없습니다.')
      }

      // 해당 accountName(이메일)의 게시물을 찾아서 사용자 정보 추출
      const posts = response.data.data.posts || []
      const userPost = posts.find(
        (post: any) => post.authorAccountName === cleanAccountName
      )

      if (!userPost) {
        // 게시물이 없어도 프로필은 존재할 수 있음
        console.log(
          `📝 ${cleanAccountName} 사용자의 게시물 없음 - 기본 프로필 생성`
        )

        // 팔로우 수는 여전히 조회 가능
        let followerCount = 0
        let followingCount = 0
        let isFollowing = false

        try {
          const followCounts =
            await profileAPI.getFollowCounts(cleanAccountName)
          followerCount = followCounts.followerCount
          followingCount = followCounts.followingCount
        } catch (error) {
          console.warn('팔로우 수 조회 실패, 기본값 사용')
        }

        try {
          isFollowing = await profileAPI.checkFollowStatus(cleanAccountName)
        } catch (error) {
          console.warn('팔로우 상태 확인 실패, 기본값 사용')
        }

        return {
          userId: 0, // 임시 ID
          accountName: cleanAccountName,
          userName: cleanAccountName.split('@')[0], // 이메일의 @ 앞부분을 사용자명으로
          userEmail: cleanAccountName,
          profileImage: undefined,
          prettyFace: undefined,
          bio: undefined,
          followerCount,
          followingCount,
          postCount: 0, // 게시물 없음
          isFollowing,
          isOwnProfile: false,
          joinedAt: undefined,
          location: undefined,
          website: undefined,
        }
      }

      // 팔로우 수 조회
      let followerCount = 0
      let followingCount = 0
      let isFollowing = false

      try {
        const followCounts = await profileAPI.getFollowCounts(cleanAccountName)
        followerCount = followCounts.followerCount
        followingCount = followCounts.followingCount
      } catch (error) {
        console.warn('팔로우 수 조회 실패, 기본값 사용')
      }

      try {
        isFollowing = await profileAPI.checkFollowStatus(cleanAccountName)
      } catch (error) {
        console.warn('팔로우 상태 확인 실패, 기본값 사용')
      }

      // 해당 사용자의 게시물 개수 계산
      const postCount = posts.filter(
        (post: any) => post.authorAccountName === cleanAccountName
      ).length

      console.log('✅ 사용자 프로필 조회 성공 (대안 방법):', userPost)

      return {
        userId: userPost.authorId,
        accountName: userPost.authorAccountName,
        userName: userPost.authorAccountName, // 일단 accountName과 동일하게 설정
        userEmail: userPost.authorAccountName, // accountName이 이메일임
        profileImage: userPost.authorProfileImage,
        prettyFace: undefined,
        bio: undefined,
        followerCount,
        followingCount,
        postCount,
        isFollowing,
        isOwnProfile: false, // 일단 false로 설정
        joinedAt: undefined,
        location: undefined,
        website: undefined,
      }
    } catch (error: any) {
      console.error('❌ 사용자 프로필 조회 실패:', error)

      if (error.response?.status === 404) {
        throw new Error(`사용자 ${cleanAccountName}을(를) 찾을 수 없습니다.`)
      } else if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.')
      } else if (error.response?.status >= 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      } else {
        throw new Error(error.message || '알 수 없는 오류가 발생했습니다.')
      }
    }
  },

  // 🔥 GET /feeds/explore로 사용자 게시물 목록 조회 (대안 방법)
  getUserPosts: async (
    accountName: string,
    params: { limit?: number; cursor?: number } = { limit: 20 }
  ): Promise<{
    posts: PostData[]
    hasNext: boolean
    nextCursor: number | null
  }> => {
    console.log(`🔍 API 요청: 사용자 게시물 조회 - ${accountName}`)

    const cleanAccountName = accountName.replace(/^@/, '')

    try {
      console.log('🔄 대안 방법: explore API를 통한 사용자 게시물 필터링')

      // explore API에서 모든 게시물을 가져온 후 필터링
      const response = await api.get<ApiResponse<any>>(
        '/feeds/explore?limit=100'
      )

      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '게시물을 불러올 수 없습니다.')
      }

      // 해당 사용자의 게시물만 필터링
      const allPosts = response.data.data.posts || []
      const userPosts = allPosts.filter(
        (post: any) => post.authorAccountName === cleanAccountName
      )

      console.log(
        `🔍 ${cleanAccountName} 사용자의 게시물: ${userPosts.length}개 발견`
      )

      // 커서 기반 페이지네이션 시뮬레이션
      const limit = params.limit || 20
      let startIndex = 0

      if (params.cursor) {
        const cursorIndex = userPosts.findIndex(
          (post: any) => post.postId === params.cursor
        )
        startIndex = cursorIndex > -1 ? cursorIndex + 1 : 0
      }

      const paginatedPosts = userPosts.slice(startIndex, startIndex + limit)
      const hasNext = startIndex + limit < userPosts.length
      const nextCursor =
        hasNext && paginatedPosts.length > 0
          ? paginatedPosts[paginatedPosts.length - 1].postId
          : null

      console.log(
        `✅ 사용자 게시물 조회 성공 (대안 방법): 전체 ${userPosts.length}개 중 ${paginatedPosts.length}개 반환`
      )

      return {
        posts: paginatedPosts,
        hasNext,
        nextCursor,
      }
    } catch (error: any) {
      console.error('❌ 사용자 게시물 조회 실패:', error)
      throw new Error(
        error.response?.data?.message || '게시물을 불러올 수 없습니다.'
      )
    }
  },

  // 🔥 GET /feeds/posts/{postId} - postId로 게시물 상세 조회
  getPostDetail: async (
    postId: number
  ): Promise<
    PostData & {
      authorFeedId: number
      isMyPost: boolean
      isFollowingAuthor: boolean
    }
  > => {
    console.log(`🔍 API 요청: GET /feeds/posts/${postId}`)

    try {
      const response = await api.get<ApiResponse<any>>(`/feeds/posts/${postId}`)

      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '게시물을 찾을 수 없습니다.')
      }

      const postData = response.data.data
      console.log('✅ 게시물 상세 조회 성공:', postData)

      return postData
    } catch (error: any) {
      console.error('❌ 게시물 상세 조회 실패:', error)

      if (error.response?.status === 404) {
        throw new Error('게시물을 찾을 수 없습니다.')
      } else if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다.')
      } else {
        throw new Error(
          error.response?.data?.message || '게시물을 불러올 수 없습니다.'
        )
      }
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우/언팔로우
  followUser: async (accountName: string): Promise<void> => {
    console.log(`🔍 API 요청: POST /follows/${accountName}`)

    try {
      await api.post(`/follows/${accountName}`)
      console.log('✅ 팔로우 성공')
    } catch (error: any) {
      console.error('❌ 팔로우 실패:', error)
      throw new Error(error.response?.data?.message || '팔로우에 실패했습니다.')
    }
  },

  unfollowUser: async (accountName: string): Promise<void> => {
    console.log(`🔍 API 요청: DELETE /follows/${accountName}`)

    try {
      await api.delete(`/follows/${accountName}`)
      console.log('✅ 언팔로우 성공')
    } catch (error: any) {
      console.error('❌ 언팔로우 실패:', error)
      throw new Error(
        error.response?.data?.message || '언팔로우에 실패했습니다.'
      )
    }
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        `/follows/check/${accountName}`
      )
      return response.data.data || false
    } catch (error) {
      console.error('팔로우 상태 확인 실패:', error)
      return false
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsData> => {
    console.log(`🔍 API 요청: GET /follows/count/${accountName}`)

    try {
      const response = await api.get<ApiResponse<FollowCountsData>>(
        `/follows/count/${accountName}`
      )

      if (response.data.error || !response.data.data) {
        return { followerCount: 0, followingCount: 0 }
      }

      console.log('✅ 팔로우 수 조회 성공:', response.data.data)
      return response.data.data
    } catch (error: any) {
      console.error('❌ 팔로우 수 조회 실패:', error)
      return { followerCount: 0, followingCount: 0 }
    }
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 좋아요/좋아요 취소
  likePost: async (postId: number): Promise<void> => {
    console.log(`🔍 API 요청: POST /likes/posts/${postId}`)

    try {
      await api.post(`/likes/posts/${postId}`)
      console.log('✅ 좋아요 성공')
    } catch (error: any) {
      console.error('❌ 좋아요 실패:', error)
      throw new Error(error.response?.data?.message || '좋아요에 실패했습니다.')
    }
  },

  unlikePost: async (postId: number): Promise<void> => {
    console.log(`🔍 API 요청: DELETE /likes/posts/${postId}`)

    try {
      await api.delete(`/likes/posts/${postId}`)
      console.log('✅ 좋아요 취소 성공')
    } catch (error: any) {
      console.error('❌ 좋아요 취소 실패:', error)
      throw new Error(
        error.response?.data?.message || '좋아요 취소에 실패했습니다.'
      )
    }
  },

  // 🔥 PUT /feeds/posts/{postId} - 게시물 수정
  updatePost: async (postId: number, caption: string): Promise<void> => {
    console.log(`🔍 API 요청: PUT /feeds/posts/${postId}`)

    try {
      await api.put(`/feeds/posts/${postId}`, { caption })
      console.log('✅ 게시물 수정 성공')
    } catch (error: any) {
      console.error('❌ 게시물 수정 실패:', error)
      throw new Error(
        error.response?.data?.message || '게시물 수정에 실패했습니다.'
      )
    }
  },
}
