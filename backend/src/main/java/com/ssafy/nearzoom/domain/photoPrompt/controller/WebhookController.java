package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.service.WebhookService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.PostApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.Map;
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
@Tag(name = "Webhook API", description = "외부 서비스 웹훅 처리")
public class WebhookController {

  private final WebhookService webhookService;

  @PostMapping("/image-processing/completed")
  @Operation(summary = "이미지 처리 완료 웹훅", description = "외부 이미지 처리 서비스에서 작업 완료 시 호출되는 웹훅")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleImageProcessingCompleted(
      @RequestBody ImageProcessingCompletedWebhook webhook) {

    try {
      webhookService.handleImageProcessingCompleted(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("timestamp", webhook.timestamp());
      responseData.put("processedImageUrl", webhook.data() != null ? webhook.data().processedImageUrl() : null);
      responseData.put("status", "SUCCESS");

      return ResponseEntity.ok(new ApiResponse<>(false, "이미지 처리 완료 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/image-processing/failed")
  @Operation(summary = "이미지 처리 실패 웹훅", description = "외부 이미지 처리 서비스에서 작업 실패 시 호출되는 웹훅")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleImageProcessingFailed(
      @RequestBody ImageProcessingFailedWebhook webhook) {

    try {
      webhookService.handleImageProcessingFailed(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("timestamp", webhook.timestamp());
      responseData.put("errorCode", webhook.error() != null ? webhook.error().code() : null);
      responseData.put("errorMessage", webhook.error() != null ? webhook.error().message() : null);
      responseData.put("status", "FAILED");

      return ResponseEntity.ok(new ApiResponse<>(false, "이미지 처리 실패 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }
}