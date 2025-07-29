package com.ssafy.nearzoom.global.auth.util;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthUtil {

    /**
     * JWT Claims에서 userId를 Long 타입으로 추출
     */
    public Long getUserId(Authentication authentication) {
        Jwt jwt = extractJwt(authentication);
        Object userId = jwt.getClaims().get("userId");
        return Long.valueOf(userId.toString());
    }

    /**
     * Authentication 객체에서 JWT 객체를 안전하게 추출
     */
    private Jwt extractJwt(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            throw new IllegalArgumentException("Invalid authentication principal: not a JWT");
        }
        return (Jwt) authentication.getPrincipal();
    }
}
