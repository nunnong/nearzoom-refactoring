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

    public static UserProfileResponse from(UserInfoResponse userInfo, Long userId,
        String accountName) {
        return new UserProfileResponse(
            userId,
            accountName,
            userInfo.userName(),
            userInfo.userEmail(),
            userInfo.userProfileImage(),
            userInfo.faceImageUrl()
        );
    }

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