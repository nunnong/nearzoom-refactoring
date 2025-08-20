'use client'

import React from 'react'
import { ArrowLeftIcon, ShareIcon, CogIcon } from '@heroicons/react/24/outline'
import { UserIcon as UserSolidIcon } from '@heroicons/react/24/solid'

interface ProfileHeaderProps {
  profile: {
    accountName: string;
    postCount?: number;
    isOwnProfile?: boolean;
  };
  onGoBack: () => void;
  onShare: () => void;
  onEdit: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  onGoBack,
  onShare,
  onEdit
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={onGoBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="font-medium hidden sm:block">뒤로</span>
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">@{profile.accountName}</h1>
            <p className="text-xs text-gray-500">{profile.postCount || 0}개 게시물</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onShare}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title="공유"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
            
            {profile.isOwnProfile && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="프로필 편집"
              >
                <CogIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;