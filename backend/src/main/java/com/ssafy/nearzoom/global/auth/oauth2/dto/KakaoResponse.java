package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import java.util.Map;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class KakaoResponse implements OAuth2Response {

    private final Map<String, Object> attribute;

    private Map<String, Object> getKakaoAccount() {
        return (Map<String, Object>) attribute.get("kakao_account");
    }

    private Map<String, Object> getProfile() {
        Map<String, Object> kakaoAccount = getKakaoAccount();
        if (kakaoAccount == null) {
            return null;
        }
        return (Map<String, Object>) kakaoAccount.get("profile");
    }

    @Override
    public String getName() {
        return getProfile().get("nickname").toString();
    }

    @Override
    public String getEmail() {
        return getKakaoAccount().get("email").toString();
    }

    @Override
    public String getAccountName() {
        return getKakaoAccount().get("email").toString();
    }

    @Override
    public String getProfileImage() {
        return getProfile().get("profile_image_url").toString();
    }

    @Override
    public Social social() {
        return Social.KAKAO;
    }


    @Override
    public User toEntity() {
        return User.of(getName(), getEmail(), getAccountName(), getProfileImage(), social());
    }
}