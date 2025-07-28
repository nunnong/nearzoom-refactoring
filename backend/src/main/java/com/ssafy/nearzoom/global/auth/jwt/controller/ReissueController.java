package com.ssafy.nearzoom.global.auth.jwt.controller;

import com.ssafy.nearzoom.global.auth.jwt.dto.TokenDto;
import com.ssafy.nearzoom.global.auth.jwt.service.ReissueService;
import com.ssafy.nearzoom.global.auth.util.CookieUtil;
import com.ssafy.nearzoom.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("auth")
@RequiredArgsConstructor
public class ReissueController {

    private final ReissueService reissueService;

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenDto>> reissue(
        @CookieValue(value = "RefreshToken", required = false) String refreshToken,
        HttpServletResponse response) {

        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            return ApiResponse.failedOf(HttpStatus.UNAUTHORIZED, "RefreshToken이 존재하지 않습니다.");
        }

        TokenDto tokens = reissueService.reissue(refreshToken);
        TokenDto responseDto = new TokenDto(tokens.accessToken(), null);

        Cookie refreshCookie = CookieUtil.createRefreshTokenCookie(tokens.refreshToken());
        response.addCookie(refreshCookie);
        return ApiResponse.of(HttpStatus.OK, "accesToken이 전달되었습니다.", responseDto);
    }
}
