package com.ssafy.nearzoom.global.auth.jwt;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.auth.oauth2.dto.CustomOAuth2User;
import com.ssafy.nearzoom.global.auth.oauth2.dto.OAuth2UserDto;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JWTFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
        FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        System.out.println("✅ [JWTFilter] Authorization 헤더: " + authHeader);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("⚠️ Authorization 헤더 없음 or Bearer 누락 → 인증 생략");
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        System.out.println("✅ [JWTFilter] 추출된 토큰: " + token);

        try {
            if (jwtUtil.isExpired(token)) {
                System.out.println("❌ [JWTFilter] 토큰 만료됨");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        } catch (ExpiredJwtException e) {
            System.out.println("❌ [JWTFilter] ExpiredJwtException 발생: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String category = jwtUtil.getCategory(token);
        System.out.println("✅ [JWTFilter] 토큰 category: " + category);
        if (!"access".equals(category)) {
            System.out.println("❌ [JWTFilter] access 토큰이 아님");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String email = jwtUtil.getEmail(token);
        Social social = jwtUtil.getSocial(token);
        System.out.println("✅ [JWTFilter] 이메일: " + email + " / 소셜: " + social);

        OAuth2UserDto dto = new OAuth2UserDto(email, social);
        CustomOAuth2User principal = new CustomOAuth2User(dto);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
            principal, null, principal.getAuthorities()
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
