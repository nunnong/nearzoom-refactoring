package com.ssafy.nearzoom.global.s3.exception;

import com.ssafy.nearzoom.global.exception.ApiException;
import org.springframework.http.HttpStatus;

public class EmptyFileException extends ApiException {
  private static final String MESSAGE = "업로드된 파일이 비어 있습니다.";

  public EmptyFileException() {
    super(HttpStatus.BAD_REQUEST, MESSAGE);
  }
}
