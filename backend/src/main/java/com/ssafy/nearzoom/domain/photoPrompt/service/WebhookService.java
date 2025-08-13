package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

  private final PhotoService photoService;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final ImageProcessingService imageProcessingService;

  // 개별 이미지 처리 완료 웹훅
  public void webhookIndividualCompleted(ImageProcessingCompletedWebhook webhook) {
    String jobId = webhook.jobId();
    log.info("개별 이미지 처리 완료 웹훅 수신 - JobId: {}", jobId);

    try {
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);

      if (jobInfo.isEmpty()) {
        log.error("Individual Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
        return;
      }

      String promptId = (String) jobInfo.get("prompt_id");
      if (promptId != null) {
        updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
      }

      // 개별 처리 결과 Redis에 저장
      saveIndividualCompletedResult(webhook);

      // PhotoService에 개별 이미지 저장 (Photo 테이블에 저장)
      photoService.saveIndividualProcessedPhoto(webhook);

      // ImageProcessingService에 완료 알림
      if (webhook.data() != null && webhook.data().processedImageUrl() != null) {
        imageProcessingService.IndividualCompleted(jobId, webhook.data().processedImageUrl());
      }

      log.info("개별 이미지 처리 완료 처리 성공 - JobId: {}", jobId);

    } catch (Exception e) {
      log.error("개별 이미지 완료 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());

      // 실패한 경우 프롬프트 상태 업데이트
      try {
        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);
        String promptId = (String) jobInfo.get("prompt_id");
        if (promptId != null) {
          updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
        }
      } catch (Exception ex) {
        log.warn("프롬프트 실패 상태 업데이트 실패: {}", ex.getMessage());
      }

      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "개별 이미지 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // 개별 이미지 처리 실패 웹훅
  public void webhookIndividualFailed(ImageProcessingFailedWebhook webhook) {
    String jobId = webhook.jobId();
    log.error("개별 이미지 처리 실패 웹훅 수신 - JobId: {}", jobId);

    try {
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("job:" + jobId);

      if (jobInfo.isEmpty()) {
        log.error("Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
        return;
      }

      String jobType = (String) jobInfo.get("type");
      if (!"individual".equals(jobType)) {
        log.error("잘못된 Job 타입 - JobId: {}, Type: {}", jobId, jobType);
        return;
      }

      // 프롬프트 상태 업데이트
      String promptId = (String) jobInfo.get("prompt_id");
      if (promptId != null) {
        updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
      }

      // 실패 결과 Redis에 저장
      saveIndividualFailureResult(webhook);

      // 배치 전체를 실패로 마킹
      String batchId = (String) jobInfo.get("batch_id");
      if (batchId != null) {
        markBatchAsFailed(batchId, webhook);
      }

      log.info("개별 이미지 처리 실패 처리 완료 - JobId: {}", jobId);

    } catch (Exception e) {
      log.error("개별 이미지 실패 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "개별 이미지 실패 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // 프레임 합성 완료 웹훅
  public void webhookFrameCompleted(FrameCompositionCompletedWebhook webhook) {
    String jobId = webhook.jobId();
    log.info("프레임 합성 완료 웹훅 수신 - JobId: {}", jobId);

    try {
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);

      if (jobInfo.isEmpty()) {
        log.error("Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
        return;
      }

      // 합성 결과 저장
      saveFrameCompletedResult(webhook);

      // PhotoService에 최종 결과 저장 (Photo 테이블에 저장)
      photoService.saveFinalComposedPhoto(webhook);

      // ImageProcessingService에 완료 알림
      if (webhook.data() != null && webhook.data().finalImageUrl() != null) {
        imageProcessingService.handleFrameCompositionCompleted(
            jobId,
            webhook.data().finalImageUrl()
        );
      }

      log.info("프레임 합성 완료 처리 성공 - JobId: {}, FinalUrl: {}",
          jobId, webhook.data() != null ? webhook.data().finalImageUrl() : "null");

    } catch (Exception e) {
      log.error("프레임 합성 완료 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "프레임 합성 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }
//  //디버깅용
//  public void webhookFrameCompleted(FrameCompositionCompletedWebhook webhook) {
//    String jobId = webhook.jobId();
//    log.info("프레임 합성 완료 웹훅 수신 - JobId: {}", jobId);
//
//    // 🔍 1. 웹훅 전체 데이터 구조 확인
//    log.info("=== 웹훅 데이터 구조 분석 ===");
//    log.info("Event: {}", webhook.event());
//    log.info("JobId: {}", webhook.jobId());
//    log.info("Timestamp: {}", webhook.timestamp());
//
//    // 🔍 2. data 객체 존재 여부 확인
//    if (webhook.data() == null) {
//      log.error("❌ webhook.data()가 null입니다!");
//      return;
//    } else {
//      log.info("✅ webhook.data() 존재함");
//    }
//
//    // 🔍 3. data 객체 내부 필드들 하나씩 확인
//    log.info("=== Data 객체 내부 필드 분석 ===");
//
//    try {
//      // finalImageUrl 확인
//      String finalImageUrl = webhook.data().finalImageUrl();
//      log.info("finalImageUrl: {}", finalImageUrl);
//      if (finalImageUrl == null) {
//        log.warn("❌ finalImageUrl이 null입니다");
//      }
//    } catch (Exception e) {
//      log.error("❌ finalImageUrl 필드 접근 실패: {}", e.getMessage());
//    }
//
//    try {
//      // processedImageUrl 확인 (혹시 이 필드가 있는지)
//      String processedImageUrl = webhook.data().finalImageUrl();
//      log.info("processedImageUrl: {}", processedImageUrl);
//      if (processedImageUrl != null) {
//        log.info("✅ processedImageUrl 존재 - 이걸 finalImageUrl 대신 사용할 수 있음");
//      }
//    } catch (Exception e) {
//      log.error("❌ processedImageUrl 필드도 없음: {}", e.getMessage());
//    }
//
//    try {
//      // individualImageUrls 확인
//      List<String> individualUrls = webhook.data().individualImageUrls();
//      log.info("individualImageUrls: {}", individualUrls);
//    } catch (Exception e) {
//      log.error("❌ individualImageUrls 필드 접근 실패: {}", e.getMessage());
//    }
//
//    try {
//      // frameInfo 확인
//      var frameInfo = webhook.data().frameInfo();
//      log.info("frameInfo: {}", frameInfo);
//    } catch (Exception e) {
//      log.error("❌ frameInfo 필드 접근 실패: {}", e.getMessage());
//    }
//
//    log.info("=== 데이터 구조 분석 완료 ===");
//
//    // 🔍 4. Redis 키 존재 여부도 함께 확인
//    String frameJobKey = "frame_job:" + jobId;
//    Boolean keyExists = redisTemplate.hasKey(frameJobKey);
//    log.info("Redis 키 존재 여부 - {}: {}", frameJobKey, keyExists);
//
//    if (!keyExists) {
//      // 다른 패턴의 키들도 확인
//      Set<String> allKeys = redisTemplate.keys("*" + jobId + "*");
//      log.info("JobId 포함된 모든 Redis 키들: {}", allKeys);
//    }
//  }

  // 프레임 합성 실패 웹훅
  public void webhookFrameFailed(FrameCompositionFailedWebhook webhook) {
    String jobId = webhook.jobId();
    log.error("프레임 합성 실패 웹훅 수신 - JobId: {}", jobId);

    try {
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("job:" + jobId);

      if (jobInfo.isEmpty()) {
        log.error("Compose Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
        return;
      }

      String jobType = (String) jobInfo.get("type");
      if (!"compose".equals(jobType)) {
        log.error("잘못된 Job 타입 - JobId: {}, Type: {}", jobId, jobType);
        return;
      }

      // 실패 결과 Redis에 저장
      saveFrameFailureResult(webhook);

      // 배치를 실패로 마킹
      String batchId = (String) jobInfo.get("batch_id");
      if (batchId != null) {
        markBatchAsCompositionFailed(batchId, webhook);
      }

      log.info("프레임 합성 실패 처리 완료 - JobId: {}", jobId);

    } catch (Exception e) {
      log.error("프레임 합성 실패 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "프레임 합성 실패 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  //======= Redis에 저장 =======
  private void saveIndividualCompletedResult(ImageProcessingCompletedWebhook webhook) {
    String resultKey = "individual_result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());
    resultData.put("status", "SUCCESS");

    if (webhook.data() != null) {
      resultData.put("original_image_id", webhook.data().originalImageId());
      resultData.put("processed_image_url", webhook.data().processedImageUrl());

      if (webhook.data().personIds() != null) {
        resultData.put("person_ids", String.join(",", webhook.data().personIds()));
      }
    }

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));
  }

  private void saveIndividualFailureResult(ImageProcessingFailedWebhook webhook) {
    String resultKey = "individual_result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());
    resultData.put("status", "FAILED");

    if (webhook.error() != null) {
      resultData.put("error_code", webhook.error().code());
      resultData.put("error_message", webhook.error().message());
    }

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));
  }

  private void saveFrameCompletedResult(FrameCompositionCompletedWebhook webhook) {
    String resultKey = "compose_result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());
    resultData.put("status", "SUCCESS");

    if (webhook.data() != null) {
      resultData.put("final_image_url", webhook.data().finalImageUrl());

      if (webhook.data().individualImageUrls() != null) {
        resultData.put("individual_images", String.join(",", webhook.data().individualImageUrls()));
      }

      if (webhook.data().frameInfo() != null) {
        resultData.put("frame_color", webhook.data().frameInfo().color());
        resultData.put("frame_layout", webhook.data().frameInfo().layout());
      }
    }

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));
  }

  private void saveFrameFailureResult(FrameCompositionFailedWebhook webhook) {
    String resultKey = "compose_result:" + webhook.jobId();
    Map<String, String> resultData = new HashMap<>();

    resultData.put("event", webhook.event());
    resultData.put("job_id", webhook.jobId());
    resultData.put("timestamp", webhook.timestamp());
    resultData.put("status", "FAILED");

    if (webhook.error() != null) {
      resultData.put("error_code", webhook.error().code());
      resultData.put("error_message", webhook.error().message());
    }

    redisTemplate.opsForHash().putAll(resultKey, resultData);
    redisTemplate.expire(resultKey, Duration.ofHours(24));
  }

  // === 배치 상태 관리 메소드들 ===

  private void markBatchAsFailed(String batchId, ImageProcessingFailedWebhook webhook) {
    Map<String, String> batchUpdate = new HashMap<>();
    batchUpdate.put("status", "failed");
    batchUpdate.put("failed_job_id", webhook.jobId());

    if (webhook.error() != null) {
      batchUpdate.put("error_message",
          String.format("개별 이미지 중 처리 실패: %s - %s",
              webhook.error().code(), webhook.error().message()));
    }

    redisTemplate.opsForHash().putAll(batchId, batchUpdate);
    log.error("배치 실패로 마킹 - BatchId: {}, FailedJobId: {}", batchId, webhook.jobId());
  }

  private void markBatchAsCompositionFailed(String batchId, FrameCompositionFailedWebhook webhook) {
    Map<String, String> batchUpdate = new HashMap<>();
    batchUpdate.put("status", "failed");
    batchUpdate.put("failed_compose_job_id", webhook.jobId());

    if (webhook.error() != null) {
      batchUpdate.put("error_message",
          String.format("프레임 합성 실패: %s - %s",
              webhook.error().code(), webhook.error().message()));
    }

    redisTemplate.opsForHash().putAll(batchId, batchUpdate);
    log.error("배치 합성 실패로 마킹 - BatchId: {}, FailedComposeJobId: {}", batchId, webhook.jobId());
  }

  private void updatePromptStatus(Long promptId, PromptStatus status) {
    try {
      PhotoPrompt photoPrompt = photoPromptRepository.findById(promptId).orElse(null);
      if (photoPrompt != null) {
        photoPrompt.updateStatus(status);
        photoPromptRepository.save(photoPrompt);
        log.info("프롬프트 상태 업데이트 - PromptId: {}, Status: {}", promptId, status);
      }
    } catch (Exception e) {
      log.warn("프롬프트 상태 업데이트 실패 - PromptId: {}, Error: {}", promptId, e.getMessage());
    }
  }

  @Deprecated
  public void handleImageProcessingCompleted(ImageProcessingCompletedWebhook webhook) {
    log.warn("Deprecated 메소드 호출 - handleImageProcessingCompleted: {}", webhook.jobId());
    // 기존 로직과의 호환성을 위해 개별 처리로 리다이렉트
    webhookIndividualCompleted(webhook);
  }

  @Deprecated
  public void handleImageProcessingFailed(ImageProcessingFailedWebhook webhook) {
    log.warn("Deprecated 메소드 호출 - handleImageProcessingFailed: {}", webhook.jobId());
    // 기존 로직과의 호환성을 위해 개별 처리로 리다이렉트
    webhookIndividualFailed(webhook);
  }
}