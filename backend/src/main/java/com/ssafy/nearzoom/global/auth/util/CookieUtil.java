package com.ssafy.nearzoom.global.auth.util;

import jakarta.servlet.http.Cookie;

public class CookieUtil {

    public static Cookie createRefreshTokenCookie(String token) {
        Cookie cookie = new Cookie("RefreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60);
        //cookie.setDomain(".nearzoom.store");
        return cookie;
    }
}
