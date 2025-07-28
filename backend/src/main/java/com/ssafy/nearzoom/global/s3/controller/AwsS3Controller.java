package com.ssafy.nearzoom.global.s3.controller;

import com.ssafy.nearzoom.global.s3.service.AwsS3Service;
import com.ssafy.nearzoom.global.response.ApiResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartRequest;

@RestController
public class AwsS3Controller {

  private final AwsS3Service awsS3Service;

  @Autowired
  public AwsS3Controller(AwsS3Service awsS3Service) {
    this.awsS3Service = awsS3Service;
  }

  @PostMapping("/image/upload")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<ApiResponse<Map<String, String>>> imageUpload(MultipartRequest request) throws IOException {
    String s3Url = awsS3Service.imageUpload(request);
    Map<String, String> data = Map.of("url", s3Url);
    return ApiResponse.of(HttpStatus.OK, "업로드 성공", data);
  }
}

