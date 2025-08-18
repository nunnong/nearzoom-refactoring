// src/utils/profileNavigation.ts - 통합 프로필 라우팅 유틸리티

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// 🔥 사용자 정보 타입 (다양한 형태 지원)
interface User {
  id?: string | number;
  userId?: string | number;
  accountName?: string;
  email?: string;
  name?: string;
}

// 🔥 메인 프로필 클릭 핸들러 함수
export const handleUserProfileClick = (
  targetAccountName: string | null | undefined, 
  router: AppRouterInstance, 
  currentUser?: User | null,
  options?: {
    debug?: boolean;
    fallbackToExplore?: boolean;
  }
) => {
  const { debug = false, fallbackToExplore = false } = options || {};
  
  if (debug) {
    console.log('🔍 사용자 프로필 클릭:', { 
      targetAccountName, 
      currentUser: currentUser?.accountName || currentUser?.email 
    });
  }
  
  // targetAccountName 유효성 검사
  if (!targetAccountName || targetAccountName.trim() === '') {
    console.error('❌ targetAccountName이 없거나 비어있습니다');
    if (fallbackToExplore) {
      router.push('/explore');
    }
    return;
  }
  
  const cleanAccountName = targetAccountName.trim();
  
  // 현재 사용자인지 확인
  if (currentUser) {
    const currentUserEmail = currentUser.email || '';
    const currentUserAccountName = currentUser.accountName || 
                                   currentUserEmail.split('@')[0] || 
                                   currentUserEmail;
    
    // 본인 프로필이면 /my로 이동
    if (currentUserEmail === cleanAccountName || 
        currentUserAccountName === cleanAccountName) {
      if (debug) {
        console.log('✅ 본인 프로필 클릭 - /my로 이동');
      }
      router.push('/my');
      return;
    }
  }
  
  // 다른 사용자 프로필이면 동적 라우팅으로 이동
  const encodedAccountName = encodeURIComponent(cleanAccountName);
  const profileUrl = `/profile/${encodedAccountName}`;
  
  if (debug) {
    console.log('🔗 다른 사용자 프로필로 이동:', { 
      targetAccountName: cleanAccountName, 
      encodedAccountName, 
      profileUrl 
    });
  }
  
  router.push(profileUrl);
};

// 🔥 React Hook으로 래핑된 버전
export const useProfileNavigation = (currentUser?: User | null) => {
  return {
    navigateToProfile: (accountName: string, router: AppRouterInstance) => {
      handleUserProfileClick(accountName, router, currentUser, { debug: true });
    }
  };
};

// 🔥 간단한 헬퍼 함수들
export const isOwnProfile = (targetAccountName: string, currentUser?: User | null): boolean => {
  if (!currentUser || !targetAccountName) return false;
  
  const currentUserEmail = currentUser.email || '';
  const currentUserAccountName = currentUser.accountName || 
                                 currentUserEmail.split('@')[0] || 
                                 currentUserEmail;
  
  return currentUserEmail === targetAccountName || 
         currentUserAccountName === targetAccountName;
};

export const getProfileUrl = (accountName: string, currentUser?: User | null): string => {
  if (isOwnProfile(accountName, currentUser)) {
    return '/my';
  }
  return `/profile/${encodeURIComponent(accountName)}`;
};

// 🔥 타입 가드 함수들
export const hasValidAccountName = (user: any): user is { accountName: string } => {
  return user && typeof user.accountName === 'string' && user.accountName.trim() !== '';
};

export const extractAccountName = (user: any): string | null => {
  if (hasValidAccountName(user)) {
    return user.accountName;
  }
  
  if (user?.email && typeof user.email === 'string') {
    const emailPart = user.email.split('@')[0];
    return emailPart || user.email;
  }
  
  return null;
};