package com.ssafy.nearzoom.global.auth.util;

import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.global.auth.oauth2.dto.CustomOAuth2User;
import com.ssafy.nearzoom.global.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthUtil {

    public static UserAuthInfoResponse getUserAuthInfo(Authentication authentication) {

        if (authentication == null
            || !(authentication.getPrincipal() instanceof CustomOAuth2User customUser)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인 정보가 올바르지 않습니다.");
        }
        UserAuthInfoResponse userAuthInfoResponse = new UserAuthInfoResponse(customUser.getEmail(),
            customUser.getSocial());
        return userAuthInfoResponse;
    }
}
