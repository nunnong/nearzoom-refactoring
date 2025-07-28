package com.ssafy.nearzoom.domain.user.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends ApiException {

    private static final String MESSAGE = "유저를 찾을 수 없습니다.";

    public UserNotFoundException() {
        super(HttpStatus.NOT_FOUND, MESSAGE);
    }
}

