package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

@RequiredArgsConstructor
public class CustomOAuth2User implements OAuth2User {

    private final OAuth2UserDto oAuth2UserDto;

    @Override
    public Map<String, Object> getAttributes() {
        return Map.of(
            "name", oAuth2UserDto.name(),
            "email", oAuth2UserDto.email(),
            "profileImage", oAuth2UserDto.profileImage(),
            "social", oAuth2UserDto.social(),
            "role", oAuth2UserDto.role()
        );
    }

    @Override
    public Collection<SimpleGrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getName() {
        return oAuth2UserDto.name();
    }

    public String getEmail() {
        return oAuth2UserDto.email();
    }

    public Social getSocial() {
        return oAuth2UserDto.social();
    }
}
