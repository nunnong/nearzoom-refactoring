package com.ssafy.nearzoom.domain.user.dto;

import com.ssafy.nearzoom.domain.user.entity.User;

public record UserProfileResponse(
    Long userId,
    String accountName,
    String userName,
    String userEmail,
    String userProfileImage,
    String faceImageUrl
) {
    // 기존 UserInfoResponse에서 변환
    public static UserProfileResponse from(UserInfoResponse userInfo, Long userId, String accountName) {
        return new UserProfileResponse(
            userId,
            accountName,
            userInfo.userName(),
            userInfo.userEmail(),
            userInfo.userProfileImage(),
            userInfo.faceImageUrl()
        );
    }

    // 🔥 User 엔티티에서 직접 변환하는 from 메서드 추가
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
            user.getUserId(),
            user.getAccountName(),
            user.getUserName(),
            user.getUserEmail(),
            user.getProfileImage(),
            user.getPrettyFace()
        );
    }
}