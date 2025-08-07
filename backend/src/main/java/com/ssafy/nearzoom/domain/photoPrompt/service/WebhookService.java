package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebhookService {

  private final PhotoService photoService;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;

  public void handleImageProcessingCompleted(ImageProcessingCompletedWebhook webhook) {
    String jobId = webhook.jobId();

    try {
      String promptId = redisTemplate.opsForValue().get("job:" + jobId);

      if (promptId != null) {
        updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
      }

      saveProcessingResult(webhook);

    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  public void handleImageProcessingFailed(ImageProcessingFailedWebhook webhook) {
    String jobId = webhook.jobId();

    try {
      String promptId = redisTemplate.opsForValue().get("job:" + jobId);

      if (promptId != null) {
        updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
      }

      saveFailureResult(webhook);

    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  private void updatePromptStatus(Long promptId, PromptStatus status) {
    try {
      PhotoPrompt photoPrompt = photoPromptRepository.findById(promptId).orElse(null);
      if (photoPrompt != null) {
        photoPrompt.updateStatus(status);
        photoPromptRepository.save(photoPrompt);
      }
    } catch (Exception e) {
      // 실패해도 전체 프로세스에 영향주지 않도록 예외 처리만
    }
  }

  private void saveProcessingResult(ImageProcessingCompletedWebhook webhook) {
    String resultKey = "result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());

    if (webhook.data() != null) {
      resultData.put("original_image_id", webhook.data().originalImageId());
      resultData.put("processed_image_url", webhook.data().processedImageUrl());

      if (webhook.data().personIds() != null) {
        resultData.put("person_ids", String.join(",", webhook.data().personIds()));
      }
    }

    resultData.put("status", "SUCCESS");

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));


    photoService.saveCompletedPhoto(webhook);
  }

  private void saveFailureResult(ImageProcessingFailedWebhook webhook) {
    String resultKey = "result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());

    if (webhook.error() != null) {
      resultData.put("error_code", webhook.error().code());
      resultData.put("error_message", webhook.error().message());
    }

    resultData.put("status", "FAILED");

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));
  }
}