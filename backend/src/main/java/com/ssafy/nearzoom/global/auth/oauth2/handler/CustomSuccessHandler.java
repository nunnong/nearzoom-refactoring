package com.ssafy.nearzoom.global.auth.oauth2.handler;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import com.ssafy.nearzoom.global.auth.oauth2.dto.CustomOAuth2User;
import com.ssafy.nearzoom.global.auth.util.CookieUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CustomSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JWTUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.redirect-url}")
    private String redirectUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
        Authentication authentication) throws IOException {

        CustomOAuth2User customUserDetail = (CustomOAuth2User) authentication.getPrincipal();
        String email = customUserDetail.getEmail();
        Social social = customUserDetail.getSocial();

        String refreshToken = jwtUtil.createRefreshToken(email, social);

        refreshTokenService.save(email, refreshToken);

        Cookie cookie = CookieUtil.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);

        String targetUrl = determineTargetUrl(request);
        response.sendRedirect(targetUrl);
    }

    private String determineTargetUrl(HttpServletRequest request) {
        try {
            // OAuth state 파라미터에서 클라이언트 정보 추출
            String state = request.getParameter("state");
            log.debug("OAuth callback state parameter: {}", state);
            
            if (state != null) {
                // Base64 디코딩 및 JSON 파싱
                String decodedState = new String(Base64.getUrlDecoder().decode(state));
                log.debug("Decoded state: {}", decodedState);
                
                @SuppressWarnings("unchecked")
                Map<String, Object> stateMap = objectMapper.readValue(decodedState, Map.class);
                String client = (String) stateMap.get("client");
                
                if ("localhost".equals(client)) {
                    log.info("Redirecting to localhost callback for development");
                    return "http://localhost:3000/callback";
                }
            }
            
            // Fallback: 기존 쿼리 파라미터 방식도 지원
            String clientParam = request.getParameter("client");
            if ("localhost".equals(clientParam)) {
                log.info("Redirecting to localhost callback via query parameter");
                return "http://localhost:3000/callback";
            }
            
        } catch (Exception e) {
            log.warn("Failed to parse OAuth state parameter: {}", e.getMessage());
            // 파싱 실패 시 기본값으로 fallback
        }
        
        log.info("Redirecting to production callback: {}", redirectUrl);
        return redirectUrl;
    }
}