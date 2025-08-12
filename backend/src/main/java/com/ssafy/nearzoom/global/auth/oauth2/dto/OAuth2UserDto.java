package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;

public record OAuth2UserDto(

    String name,

    String email,

    String profileImage,

    Social social,

    String role
) {

    public OAuth2UserDto(String email, Social social) {
        this(null, email, null, social, null);
    }
}
