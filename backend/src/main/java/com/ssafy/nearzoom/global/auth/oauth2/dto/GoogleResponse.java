package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import java.util.Map;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class GoogleResponse implements OAuth2Response {

    private final Map<String, Object> attribute;

    @Override
    public String getName() {
        return attribute.get("name").toString();
    }

    @Override
    public String getEmail() {
        return attribute.get("email").toString();
    }

    @Override
    public String getAccountName() {
        return attribute.get("email").toString();
    }

    @Override
    public String getProfileImage() {
        return attribute.get("picture").toString();
    }

    @Override
    public Social social() {
        return Social.GOOGLE;
    }

    @Override
    public User toEntity() {
        return User.of(getName(), getEmail(), getAccountName(), getProfileImage(), social());
    }
}
