'use client'

import React from 'react'
import { UserIcon as UserSolidIcon } from '@heroicons/react/24/solid'

interface ProfileInfoProps {
  profile: {
    userName: string;
    accountName: string;
    profileImage?: string;
    bio?: string;
    location?: string;
    website?: string;
    joinedAt?: string;
    postCount?: number;
    followerCount?: number;
    followingCount?: number;
    isOwnProfile?: boolean;
    isFollowing?: boolean;
  };
  onFollowToggle: () => void;
  onEdit: () => void;
  isFollowLoading: boolean;
  hideStats?: boolean; // 통계 정보 숨김 여부
  hideEdit?: boolean; // 편집 버튼 숨김 여부
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({
  profile,
  onFollowToggle,
  onEdit,
  isFollowLoading,
  hideStats = false,
  hideEdit = false
}) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
          {/* 프로필 이미지 */}
          <div className="flex justify-center sm:justify-start mb-4 sm:mb-0">
            <div className="relative">
              <img
                src={profile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.userName)}&size=120&background=random`}
                alt={profile.userName}
                className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-white shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.userName)}&size=120&background=random`;
                }}
              />
              {profile.isOwnProfile && (
                <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1">
                  <UserSolidIcon className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* 프로필 정보 */}
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.userName}</h1>
              <p className="text-gray-600 mb-2">@{profile.accountName}</p>
              
              {profile.bio && (
                <p className="text-gray-700 mb-3 leading-relaxed">{profile.bio}</p>
              )}

              {/* 추가 정보 */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-500">
                {profile.location && (
                  <span className="flex items-center">
                    📍 {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a 
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    🔗 {profile.website}
                  </a>
                )}
                {profile.joinedAt && (
                  <span>
                    📅 {new Date(profile.joinedAt).getFullYear()}년 가입
                  </span>
                )}
              </div>
            </div>

            {/* 통계 - hideStats가 true면 숨김 */}
            {!hideStats && (
              <div className="flex justify-center sm:justify-start space-x-6 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{profile.postCount || 0}</div>
                  <div className="text-sm text-gray-600">게시물</div>
                </div>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{profile.followerCount || 0}</div>
                  <div className="text-sm text-gray-600">팔로워</div>
                </button>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{profile.followingCount || 0}</div>
                  <div className="text-sm text-gray-600">팔로잉</div>
                </button>
              </div>
            )}

            {/* 팔로우 버튼 - 다른 사용자의 프로필일 때만 표시 */}
            {!profile.isOwnProfile && (
              <button
                onClick={onFollowToggle}
                disabled={isFollowLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  profile.isFollowing
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isFollowLoading 
                  ? '처리중...' 
                  : profile.isFollowing 
                    ? '팔로우 취소' 
                    : '팔로우'
                }
              </button>
            )}
            
            {/* 자신의 프로필일 때는 편집 버튼만 표시 (hideEdit이 true면 숨김) */}
            {profile.isOwnProfile && !hideEdit && (
              <button
                onClick={onEdit}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                프로필 편집
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
