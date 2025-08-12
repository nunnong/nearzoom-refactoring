package com.ssafy.nearzoom.domain.user.dto;

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
}
