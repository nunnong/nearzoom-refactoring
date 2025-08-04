package com.ssafy.nearzoom.domain.photo.controller;

import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photo.service.WebhookService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
public class WebhookController {

  private final WebhookService webhookService;

  @PostMapping("/image-processing/completed")
  public ResponseEntity<ApiResponse<Void>> handleImageProcessingCompleted(
      @RequestBody ImageProcessingCompletedWebhook webhook) {

    try {
      webhookService.handleImageProcessingCompleted(webhook);
      return ApiResponse.ok("웹훅 처리 완료", null);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "웹훅 처리 중 오류가 발생했습니다.");
    }
  }

  @PostMapping("/image-processing/failed")
  public ResponseEntity<ApiResponse<Void>> handleImageProcessingFailed(
      @RequestBody ImageProcessingFailedWebhook webhook) {

    try {
      webhookService.handleImageProcessingFailed(webhook);
      return ApiResponse.ok("웹훅 처리 완료", null);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "웹훅 처리 중 오류가 발생했습니다.");
    }
  }
}