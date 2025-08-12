package com.ssafy.nearzoom.global.auth.util;

import jakarta.servlet.http.Cookie;

public class CookieUtil {

    public static Cookie createRefreshTokenCookie(String token) {
        Cookie cookie = new Cookie("RefreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);  // 🔥 true → false로 변경
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60);
        // cookie.setDomain("nearzoom.store");  // 🔥 이 줄 주석 처리 또는 삭제
        return cookie;
    }
}