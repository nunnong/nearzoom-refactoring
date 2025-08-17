// src/components/ui/EnhancedHeader.tsx - 아키텍처 원칙 완전 준수

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import HomeButton from '@/components/page/myroom/HomeButton'
import MainNavigation from './MainNavigation'

// 🔥 아키텍처 원칙 준수: 인터셉터가 적용된 axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 User 정보 (실제 UserProfileResponse 타입과 일치)
interface BackendUserProfile {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// 헤더에서 사용할 사용자 타입 (간소화)
interface HeaderUser {
  id: number;
  name: string;
  email: string;
  accountName: string;
  profileImage?: string;
  avatar?: string; // profileImage alias
}

interface EnhancedHeaderProps {
  title?: string;
  userProfile?: HeaderUser | null; // 외부에서 전달받은 사용자 정보 (선택적)
  onMenuToggle?: () => void;
  showNavigation?: boolean;
  showUserInfo?: boolean; // 사용자 정보 표시 여부
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// 🔥 백엔드 API 함수들 (인터셉터 적용된 api 사용)
// ============================================================================

const headerAPI = {
  // 🔥 현재 사용자 정보 조회 (여러 엔드포인트 시도)
  getCurrentUser: async (): Promise<BackendUserProfile> => {
    const endpoints = [
      '/user/my',      // 가장 일반적인 엔드포인트
      '/user/profile', // 대안 엔드포인트
      '/auth/me',       // 인증 관련 엔드포인트
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 사용자 정보 조회 시도: ${endpoint}`);
        
        const response = await api.get<ApiResponse<BackendUserProfile>>(endpoint);
        
        if (response.data.error) {
          throw new Error(response.data.message || '사용자 정보를 가져올 수 없습니다.');
        }
        
        if (!response.data.data) {
          throw new Error('사용자 데이터가 없습니다.');
        }
        
        console.log(`✅ 사용자 정보 조회 성공: ${endpoint}`, response.data.data);
        return response.data.data;
        
      } catch (error) {
        console.warn(`❌ ${endpoint} 실패:`, error);
        lastError = error;
        continue;
      }
    }

    // 모든 엔드포인트 실패 시 최종 에러
    console.error('❌ 모든 사용자 정보 엔드포인트 실패');
    throw lastError || new Error('사용자 정보를 가져올 수 없습니다.');
  },

  // 🔥 계정명으로 사용자 정보 조회 (백엔드 User API 기반)
  getUserByAccountName: async (accountName: string): Promise<BackendUserProfile> => {
    try {
      console.log(`🔍 계정명으로 사용자 조회: ${accountName}`);
      
      // 여러 가능한 엔드포인트 시도
      const endpoints = [
        `/user/profile/${accountName}`,
        `/feeds/user/account/${accountName}`, // FeedController의 엔드포인트
        `/user/${accountName}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await api.get<ApiResponse<any>>(endpoint);
          
          if (response.data.error) {
            continue; // 다음 엔드포인트 시도
          }
          
          const data = response.data.data;
          if (!data) {
            continue;
          }

          // FeedWithPostsResponse인 경우 처리
          if (data.userId && data.accountName) {
            const userProfile: BackendUserProfile = {
              userId: data.userId,
              accountName: data.accountName,
              userName: data.accountName, // 이름이 없으면 계정명 사용
              userEmail: `${data.accountName}@unknown.com`, // 임시 이메일
              profileImage: data.profileImage,
            };
            
            console.log(`✅ 계정명으로 사용자 조회 성공: ${endpoint}`, userProfile);
            return userProfile;
          }
          
          // 직접 UserProfile인 경우 처리
          if (data.userId || data.id) {
            const userProfile: BackendUserProfile = {
              userId: data.userId || data.id,
              accountName: data.accountName,
              userName: data.userName || data.name || data.accountName,
              userEmail: data.userEmail || data.email || `${data.accountName}@unknown.com`,
              profileImage: data.profileImage,
              prettyFace: data.prettyFace,
            };
            
            console.log(`✅ 계정명으로 사용자 조회 성공: ${endpoint}`, userProfile);
            return userProfile;
          }
          
        } catch (endpointError) {
          console.warn(`❌ ${endpoint} 실패:`, endpointError);
          continue;
        }
      }
      
      throw new Error(`사용자 '${accountName}'을 찾을 수 없습니다.`);
      
    } catch (error) {
      console.error('❌ 계정명으로 사용자 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 로그아웃 (여러 엔드포인트 시도)
  logout: async (): Promise<void> => {
    const endpoints = ['/auth/logout', '/user/logout', '/logout'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 로그아웃 시도: ${endpoint}`);
        await api.post<ApiResponse<void>>(endpoint);
        console.log(`✅ 로그아웃 성공: ${endpoint}`);
        return; // 성공하면 즉시 반환
      } catch (error) {
        console.warn(`❌ ${endpoint} 로그아웃 실패:`, error);
        continue;
      }
    }
    
    // 모든 엔드포인트 실패해도 로컬 상태는 클리어
    console.warn('⚠️ 모든 로그아웃 엔드포인트 실패, 로컬 상태만 클리어');
  },
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, className = '' }) => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-16 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center h-16 bg-red-50 border border-red-200 ${className}`}>
        <div className="flex items-center space-x-3">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-600 text-sm font-medium">로그인이 필요합니다</span>
          <button
            onClick={handleLogin}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// EnhancedHeader 컴포넌트 (인증 보호 적용)
// ============================================================================

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  title,
  userProfile: externalUserProfile,
  onMenuToggle,
  showNavigation = true,
  showUserInfo = true,
  children,
  className = '',
}) => {
  const router = useRouter();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // 🔥 아키텍처 원칙 준수: Zustand 기반 인증 훅 사용
  const { user: authUser, isAuthenticated, logout: authLogout } = useAuth();

  // ============================================================================
  // 🔥 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null);
      return;
    }

    // 이미 외부에서 사용자 정보가 제공된 경우 스킵
    if (externalUserProfile) {
      setCurrentUser(externalUserProfile);
      return;
    }

    setIsLoadingUser(true);
    setUserError(null);

    try {
      console.log('=== 헤더에서 사용자 정보 로드 시작 ===');

      const backendUser = await headerAPI.getCurrentUser();
      
      // 백엔드 응답을 HeaderUser 형식으로 변환
      const headerUser: HeaderUser = {
        id: backendUser.userId,
        name: backendUser.userName,
        email: backendUser.userEmail,
        accountName: backendUser.accountName,
        profileImage: backendUser.profileImage,
        avatar: backendUser.profileImage, // alias
      };

      setCurrentUser(headerUser);
      
      console.log('✅ 헤더 사용자 정보 로드 완료:', headerUser);

    } catch (error) {
      console.error('❌ 헤더 사용자 정보 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.';
      setUserError(errorMessage);
      
      // 심각한 인증 오류인 경우에만 로그아웃 (401 등)
      if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('토큰') ||
        (error as any)?.response?.status === 401
      )) {
        console.log('🔓 인증 오류로 인한 자동 로그아웃');
        setTimeout(() => {
          authLogout();
        }, 1000); // 1초 후 로그아웃 (UI 상태 업데이트를 위해)
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, externalUserProfile, authLogout]);

  // ============================================================================
  // 초기 로드 및 인증 상태 변경 감지
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUser();
    } else {
      setCurrentUser(null);
      setUserError(null);
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, loadCurrentUser]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleMyDiaryClick = useCallback(() => {
    router.push('/');
  }, [router]);

  // 🔥 백엔드 연동 로그아웃 (Zustand 토큰 관리 사용)
  const handleLogout = useCallback(async () => {
    try {
      console.log('=== 헤더에서 로그아웃 시작 ===');
      
      // 백엔드 로그아웃 API 호출
      await headerAPI.logout();
      
      console.log('✅ 백엔드 로그아웃 완료');
      
    } catch (error) {
      console.error('❌ 백엔드 로그아웃 실패:', error);
      // 실패해도 로컬 상태는 클리어
    } finally {
      // 🔥 아키텍처 원칙 준수: Zustand를 통한 로그아웃 (토큰 자동 관리)
      authLogout();
      
      // 사용자 상태 초기화
      setCurrentUser(null);
      setUserError(null);
      
      // 홈으로 리다이렉트
      router.push('/');
      
      console.log('✅ 로그아웃 완료');
    }
  }, [authLogout, router]);

  // 🔥 프로필 클릭 - 백엔드 연동
  const handleProfileClick = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const user = displayUser;
    if (!user) return;

    try {
      console.log('🔍 프로필 클릭:', user.accountName);
      
      // 백엔드에서 최신 사용자 정보 확인
      try {
        await headerAPI.getUserByAccountName(user.accountName);
        // 사용자가 존재하면 프로필 페이지로 이동
        router.push(`/profile/${user.accountName}`);
      } catch (error) {
        // 사용자가 존재하지 않으면 피드 페이지로 이동
        console.warn('사용자 프로필 조회 실패, 피드 페이지로 이동:', error);
        router.push(`/feeds/user/account/${user.accountName}`);
      }
      
    } catch (error) {
      console.error('프로필 클릭 처리 실패:', error);
      // 실패해도 기본 프로필 페이지로 이동
      router.push(`/profile/${user.accountName}`);
    }
  }, [router, isAuthenticated]);

  const handleRetryUserLoad = useCallback(() => {
    setUserError(null);
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ============================================================================
  // 🔥 사용자 정보 결정 (우선순위: 외부 전달 > 로드된 사용자 > 인증 사용자)
  // ============================================================================

  const displayUser = externalUserProfile || currentUser || (authUser ? {
    id: typeof authUser.id === 'string' ? parseInt(authUser.id) : authUser.id,
    name: authUser.name || authUser.email,
    email: authUser.email,
    accountName: (authUser as any)?.accountName || authUser.email.split('@')[0],
    profileImage: (authUser as any)?.profileImage,
    avatar: (authUser as any)?.profileImage,
  } : null);

  // ============================================================================
  // 렌더링 (AuthGuard로 보호)
  // ============================================================================

  const renderContent = () => (
    <header className={`border-b bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {/* MyDiary 브랜드 - 왼쪽 상단 */}
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleMyDiaryClick}
          >
            <span className="text-xl font-semibold text-blue-600">📖 MyDiary</span>
          </div>

          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          
          {title && (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
          
          {children}
        </div>

        {/* 중앙 네비게이션 */}
        {showNavigation && (
          <div className="hidden lg:block">
            <MainNavigation variant="header" />
          </div>
        )}

        {/* 우측 영역 */}
        <div className="flex items-center space-x-3">
          {/* 🔥 사용자 정보 표시 (백엔드 연동) */}
          {showUserInfo && isAuthenticated && (
            <div className="flex items-center space-x-3">
              {/* 사용자 프로필 */}
              {displayUser && !isLoadingUser && (
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                  onClick={handleProfileClick}
                  title={`${displayUser.name} 프로필 보기`}
                >
                  {/* 프로필 이미지 */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {displayUser.profileImage || displayUser.avatar ? (
                      <img
                        src={displayUser.profileImage || displayUser.avatar}
                        alt={displayUser.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                              ${displayUser.name.charAt(0).toUpperCase()}
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                        {displayUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* 사용자 이름 (데스크톱에서만 표시) */}
                  <div className="hidden md:block text-right">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-24">
                      {displayUser.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-24">
                      @{displayUser.accountName}
                    </div>
                  </div>
                </div>
              )}

              {/* 로딩 상태 */}
              {isLoadingUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="hidden md:block">
                    <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="w-12 h-2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* 에러 상태 */}
              {userError && !displayUser && !isLoadingUser && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={handleRetryUserLoad}
                    className="hidden md:block text-xs text-red-600 hover:text-red-800 underline"
                    title={userError}
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 기존 버튼들 */}
          <HomeButton />
          
          {/* 🔥 백엔드 연동 로그아웃 버튼 */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="로그아웃"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          )}

          {/* 로그인되지 않은 경우 로그인 버튼 */}
          {!isAuthenticated && (
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      {showNavigation && (
        <div className="border-t bg-gray-50 px-4 py-2 lg:hidden">
          <MainNavigation variant="header" className="justify-center" />
        </div>
      )}

      {/* 🔥 개발 모드에서 백엔드 연동 상태 디버깅 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-xs">
          <details>
            <summary className="cursor-pointer text-yellow-800 font-medium">
              🔧 헤더 아키텍처 원칙 준수 상태 (개발용)
            </summary>
            <div className="mt-2 text-yellow-700 space-y-1">
              <div><strong>✅ API:</strong> @/lib/axios 사용 (인터셉터 적용)</div>
              <div><strong>✅ 토큰:</strong> Zustand 관리</div>
              <div><strong>✅ 인증:</strong> useAuth 훅 사용</div>
              <div><strong>인증 상태:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
              <div><strong>로딩 중:</strong> {isLoadingUser ? 'Yes' : 'No'}</div>
              <div><strong>에러:</strong> {userError || 'None'}</div>
              {displayUser && (
                <>
                  <div><strong>표시 사용자:</strong></div>
                  <div className="ml-4">
                    <div>ID: {displayUser.id}</div>
                    <div>이름: {displayUser.name}</div>
                    <div>계정명: {displayUser.accountName}</div>
                    <div>이메일: {displayUser.email}</div>
                    <div>프로필 이미지: {displayUser.profileImage ? 'Yes' : 'No'}</div>
                    <div>소스: {externalUserProfile ? 'External' : currentUser ? 'Backend' : 'Auth'}</div>
                  </div>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </header>
  );

  return (
    <AuthGuard className={className}>
      {renderContent()}
    </AuthGuard>
  );
};

export default EnhancedHeader