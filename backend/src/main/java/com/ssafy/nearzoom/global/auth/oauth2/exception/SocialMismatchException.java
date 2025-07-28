package com.ssafy.nearzoom.global.auth.oauth2.exception;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class SocialMismatchException extends ApiException {

    private static final String MESSAGE_TEMPLATE = "Email '%s' is already registered with %s";

    public SocialMismatchException(String email, Social found) {
        super(
            HttpStatus.BAD_REQUEST,
            String.format(MESSAGE_TEMPLATE, email, found.name())
        );
    }
}