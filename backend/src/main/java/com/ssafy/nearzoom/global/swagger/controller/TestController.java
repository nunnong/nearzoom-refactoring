package com.ssafy.nearzoom.global.swagger.controller;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
@Tag(name = "Test API", description = "개발/테스트용 API")
public class TestController {

    @Autowired
    private JWTUtil jwtUtil;

    @GetMapping("/dummy-token")
    @Operation(summary = "더미 토큰 발급")
    public ResponseEntity<Map<String, String>> getDummyToken() {
        String accessToken = jwtUtil.createAccessToken(
            "테스트유저",
            "test@kakao.com",
            Social.KAKAO
        );

        Map<String, String> response = new HashMap<>();
        response.put("access_token", accessToken);
        response.put("usage", accessToken);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-token")
    @Operation(summary = "토큰 검증")
    public ResponseEntity<Map<String, Object>> verifyToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");

        Map<String, Object> response = new HashMap<>();
        response.put("authorization_header", authHeader);
        response.put("token_present", authHeader != null);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            response.put("token_length", token.length());
            response.put("token_preview", token.substring(0, Math.min(20, token.length())) + "...");
        }

        return ResponseEntity.ok(response);
    }
}