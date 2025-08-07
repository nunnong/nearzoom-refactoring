package com.ssafy.nearzoom.global.auth.jwt.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class RefreshTokenExpiredException extends ApiException {

    private static final String MESSAGE = "만료된 토큰입니다.";

    public RefreshTokenExpiredException() {
        super(HttpStatus.UNAUTHORIZED, MESSAGE);
    }
}
