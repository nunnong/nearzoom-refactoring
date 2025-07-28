package com.ssafy.nearzoom.global.s3.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class InvalidImageExtensionException extends ApiException {
  private static final String MESSAGE = "허용되지 않은 이미지 확장자입니다.";

  public InvalidImageExtensionException() {
    super(HttpStatus.BAD_REQUEST, MESSAGE);
  }
}
