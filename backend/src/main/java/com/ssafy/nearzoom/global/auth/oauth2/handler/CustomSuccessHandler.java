package com.ssafy.nearzoom.global.auth.oauth2.handler;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import com.ssafy.nearzoom.global.auth.oauth2.dto.CustomOAuth2User;
import com.ssafy.nearzoom.global.auth.util.CookieUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional
public class CustomSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JWTUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.redirect-url}")
    private String redirectUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
        Authentication authentication) throws IOException {

        CustomOAuth2User customUserDetail = (CustomOAuth2User) authentication.getPrincipal();
        String email = customUserDetail.getEmail();
        String name= customUserDetail.getName();
        Social social = customUserDetail.getSocial();

        String accessToken = jwtUtil.createAccessToken(name, email, social);
        String refreshToken = jwtUtil.createRefreshToken(email, social);

        refreshTokenService.save(email, refreshToken);

        Cookie cookie = CookieUtil.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);

        // ✅ 로그 추가 위치
        System.out.println("✅ [REDIRECT CHECK] redirectUrl: " + redirectUrl);
        System.out.println("✅ [REDIRECT CHECK] final redirectWithToken: " + redirectUrl + "?token=" + accessToken);

        String redirectWithToken = redirectUrl + "?token=" + accessToken; // token 파라미터 추가

        response.sendRedirect(redirectWithToken); // token 포함된 URL로 리다이렉트
    }
}