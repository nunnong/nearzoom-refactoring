package com.ssafy.nearzoom.domain.photo.controller;

import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photo.service.WebhookService;
import lombok.RequiredArgsConstructor;
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
  public ResponseEntity<String> handleImageProcessingCompleted(
      @RequestBody ImageProcessingCompletedWebhook webhook) {

    webhookService.handleImageProcessingCompleted(webhook);
    return ResponseEntity.ok("웹훅 처리 완료");
  }

  @PostMapping("/image-processing/failed")
  public ResponseEntity<String> handleImageProcessingFailed(
      @RequestBody ImageProcessingFailedWebhook webhook) {

    webhookService.handleImageProcessingFailed(webhook);
    return ResponseEntity.ok("웹훅 처리 완료");
  }
}