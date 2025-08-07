package com.ssafy.nearzoom.domain.myroom.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class PhotoNotFoundException extends ApiException {

    public PhotoNotFoundException() {
        super(HttpStatus.NOT_FOUND, "해당 사진을 찾을 수 없습니다.");
    }
}
