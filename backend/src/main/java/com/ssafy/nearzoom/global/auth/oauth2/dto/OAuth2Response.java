package com.ssafy.nearzoom.global.auth.oauth2.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;

public interface OAuth2Response {

    String getName();

    String getEmail();

    String getProfileImage();

    Social social();

    User toEntity();
}
