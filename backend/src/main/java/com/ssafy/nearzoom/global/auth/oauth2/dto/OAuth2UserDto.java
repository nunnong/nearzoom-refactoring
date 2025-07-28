package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;

// 소셜로그인한 사용자의 정보를 담는 dto (역할, 이름, 이메일, 소셜로그인 타입))
public record OAuth2UserDto(

    String name,

    String email,

    String profileImage,

    Social social,

    String role
) {

    public OAuth2UserDto(String email) {
        this(null, email, null, null, null);
    }
}
