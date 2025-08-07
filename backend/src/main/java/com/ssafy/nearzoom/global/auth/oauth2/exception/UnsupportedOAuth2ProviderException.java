package com.ssafy.nearzoom.global.auth.oauth2.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class UnsupportedOAuth2ProviderException extends ApiException {

    private static final String MESSAGE = "지원하지 않는 소셜 로그인입니다.";

    public UnsupportedOAuth2ProviderException() {
        super(HttpStatus.BAD_REQUEST, MESSAGE);
    }
}