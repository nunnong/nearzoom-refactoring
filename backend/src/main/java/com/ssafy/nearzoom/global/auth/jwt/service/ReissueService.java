package com.ssafy.nearzoom.global.auth.jwt.service;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.dto.TokenDto;
import com.ssafy.nearzoom.global.auth.jwt.exception.InvalidRefreshTokenException;
import com.ssafy.nearzoom.global.auth.jwt.exception.RefreshTokenExpiredException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReissueService {

    private final JWTUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    public TokenDto reissue(String refreshToken) {

        String name = jwtUtil.getName(refreshToken);
        String email = jwtUtil.getEmail(refreshToken);
        Social social = jwtUtil.getSocial(refreshToken);
        String token = refreshTokenService.get(email);

        if (token == null || !token.equals(refreshToken)) {
            throw new InvalidRefreshTokenException();
        }

        if (jwtUtil.isExpired(refreshToken)) {
            refreshTokenService.delete(email);
            throw new RefreshTokenExpiredException();
        }

        String newAccessToken = jwtUtil.createAccessToken(name, email, social);
        String newRefreshToken = jwtUtil.createRefreshToken(email);

        refreshTokenService.save(email, newRefreshToken);

        TokenDto tokenDto = new TokenDto(newAccessToken, newRefreshToken);

        return tokenDto;
    }
}
