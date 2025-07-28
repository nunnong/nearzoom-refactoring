package com.ssafy.nearzoom.global.auth.jwt.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class InvalidRefreshTokenException extends ApiException {

    private static final String MESSAGE = "유효하지 않은 토큰입니다.";

    public InvalidRefreshTokenException() {
        super(HttpStatus.UNAUTHORIZED, MESSAGE);
    }
}
