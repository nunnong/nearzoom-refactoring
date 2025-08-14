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
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    long startTime = System.currentTimeMillis();

    log.info("=== 🔍 웹훅 처리 시작 ===");
    log.info("JobId: {}", jobId);
    log.info("수신 시간: {}", startTime);
    log.info("Event: {}", webhook.event());
    log.info("Timestamp: {}", webhook.timestamp());

    // 웹훅 데이터 상세 분석
    if (webhook.data() != null) {
      log.info("웹훅 Data 존재 - originalImageId: {}, processedImageUrl: {}",
          webhook.data().originalImageId(),
          webhook.data().processedImageUrl());
    } else {
      log.warn("❌ 웹훅 Data가 null입니다!");
    }

    try {
      // 1️⃣ Redis 키 존재 확인
      log.info("=== 1️⃣ Redis 키 존재 확인 ===");
      String jobKey = "individual_job:" + jobId;
      Boolean keyExists = redisTemplate.hasKey(jobKey);
      log.info("타겟 키: {}", jobKey);
      log.info("키 존재 여부: {}", keyExists);

      // 관련된 모든 키 패턴 확인
      Set<String> allJobKeys = redisTemplate.keys("individual_job:*");
      log.info("현재 존재하는 individual_job 키들 ({}개): {}", allJobKeys.size(), allJobKeys);

      Set<String> jobIdKeys = redisTemplate.keys("*" + jobId + "*");
      log.info("JobId({}) 포함된 모든 키들: {}", jobId, jobIdKeys);

      // 2️⃣ Job 정보 조회
      log.info("=== 2️⃣ Job 정보 조회 ===");
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries(jobKey);
      log.info("조회된 필드 개수: {}", jobInfo.size());

      if (!jobInfo.isEmpty()) {
        log.info("✅ Job 정보 발견! 상세 내용:-> JobId: {}", jobId);
        for (Map.Entry<Object, Object> entry : jobInfo.entrySet()) {
          log.info("  {}: {}", entry.getKey(), entry.getValue());
        }
      } else {
        log.error("❌ Job 정보가 비어있음");

        // 3️⃣ 재시도 로직
        log.info("=== 3️⃣ 재시도 시작 ===");
        for (int i = 1; i <= 3; i++) {
          log.info("재시도 {}/3 - 1초 대기 중...", i);
          Thread.sleep(1000);

          keyExists = redisTemplate.hasKey(jobKey);
          jobInfo = redisTemplate.opsForHash().entries(jobKey);
          log.info("재시도 {} 결과 - 키 존재: {}, 필드 개수: {}", i, keyExists, jobInfo.size());

          if (!jobInfo.isEmpty()) {
            log.info("✅ 재시도 {}에서 Job 정보 발견!", i);
            break;
          }
        }
      }

      if (jobInfo.isEmpty()) {
        log.error("=== ❌ 최종 실패: Job 정보를 찾을 수 없음 ===");

        // 4️⃣ 대안 처리
        log.info("=== 4️⃣ Job 정보 없는 대안 처리 시작 ===");
        try {
          saveIndividualCompletedResult(webhook);
          log.info("✅ 웹훅 결과 Redis에 저장 완료");

          photoService.saveIndividualProcessedPhoto(webhook);
          log.info("✅ Photo Table에 저장 완료");

          log.info("✅ Job 정보 없는 웹훅 처리 완료");
        } catch (Exception e) {
          log.error("❌ 대안 처리 실패: {}", e.getMessage(), e);
        }
        return;
      }

      // 5️⃣ 정상 처리 로직
      log.info("=== 5️⃣ 정상 처리 시작 ===");

      String promptId = (String) jobInfo.get("prompt_id");
      log.info("추출된 promptId: {}", promptId);

      if (promptId != null) {
        log.info("프롬프트 상태 업데이트 시작 - PromptId: {}", promptId);
        try {
          updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
          log.info("✅ 프롬프트 상태 업데이트 완료");
        } catch (Exception e) {
          log.error("❌ 프롬프트 상태 업데이트 실패: {}", e.getMessage(), e);
        }
      } else {
        log.warn("⚠️ promptId가 null임");
      }

      // Redis 결과 저장
      log.info("Redis 웹훅 결과 저장 시작...");
      try {
        saveIndividualCompletedResult(webhook);
        log.info("✅ Redis 웹훅 결과 저장 완료");
      } catch (Exception e) {
        log.error("❌ Redis 웹훅 결과 저장 실패: {}", e.getMessage(), e);
      }

      // PhotoService 호출
      log.info("PhotoService 저장 시작...");
      try {
        photoService.saveIndividualProcessedPhoto(webhook);
        log.info("✅ PhotoService 저장 완료");
      } catch (Exception e) {
        log.error("❌ PhotoService 저장 실패: {}", e.getMessage(), e);
      }

      // ImageProcessingService 알림
      if (webhook.data() != null && webhook.data().processedImageUrl() != null) {
        log.info("ImageProcessingService 알림 시작...");
        try {
          imageProcessingService.IndividualCompleted(jobId, webhook.data().processedImageUrl());
          log.info("✅ ImageProcessingService 알림 완료");
        } catch (Exception e) {
          log.error("❌ ImageProcessingService 알림 실패: {}", e.getMessage(), e);
        }
      } else {
        log.warn("⚠️ processedImageUrl이 없어서 ImageProcessingService 알림 생략");
      }

      long endTime = System.currentTimeMillis();
      log.info("=== ✅ 웹훅 처리 완료 ===");
      log.info("JobId: {}, 총 소요시간: {}ms", jobId, (endTime - startTime));

    } catch (Exception e) {
      long endTime = System.currentTimeMillis();
      log.error("=== ❌ 웹훅 처리 실패 ===");
      log.error("JobId: {}, 소요시간: {}ms", jobId, (endTime - startTime));
      log.error("오류 타입: {}", e.getClass().getSimpleName());
      log.error("오류 메시지: {}", e.getMessage());
      log.error("스택 트레이스: ", e);

      // 🔍 예외를 다시 던지지 않음 (트랜잭션 롤백 방지)
      log.warn("⚠️ 예외가 발생했지만 HTTP 200으로 응답하여 재시도 방지");
    }
  }
  /// /////////////////////////////////
//  public void webhookIndividualCompleted(ImageProcessingCompletedWebhook webhook) {
//    String jobId = webhook.jobId();
//    log.info("개별 이미지 처리 완료 웹훅 수신 - JobId: {}", jobId);
//
//    try {
//      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);
//
//      if (jobInfo.isEmpty()) {
//        log.error("Individual Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
//        return;
//      }
//
//      String promptId = (String) jobInfo.get("prompt_id");
//      if (promptId != null) {
//        updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
//      }
//
//      // 개별 처리 결과 Redis에 저장
//      saveIndividualCompletedResult(webhook);
//
//      // PhotoService에 개별 이미지 저장 (Photo 테이블에 저장)
//      photoService.saveIndividualProcessedPhoto(webhook);
//
//      // ImageProcessingService에 완료 알림
//      if (webhook.data() != null && webhook.data().processedImageUrl() != null) {
//        imageProcessingService.IndividualCompleted(jobId, webhook.data().processedImageUrl());
//      }
//
//      log.info("개별 이미지 처리 완료 처리 성공 - JobId: {}", jobId);
//
//    } catch (Exception e) {
//      log.error("개별 이미지 완료 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
//
//      // 실패한 경우 프롬프트 상태 업데이트
//      try {
//        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);
//        String promptId = (String) jobInfo.get("prompt_id");
//        if (promptId != null) {
//          updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
//        }
//      } catch (Exception ex) {
//        log.warn("프롬프트 실패 상태 업데이트 실패: {}", ex.getMessage());
//      }
//
//      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
//          "개별 이미지 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }

  // 개별 이미지 처리 실패 웹훅
  public void webhookIndividualFailed(ImageProcessingFailedWebhook webhook) {
    String jobId = webhook.jobId();
    log.error("개별 이미지 처리 실패 웹훅 수신 - JobId: {}", jobId);

    try {
      //Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("job:" + jobId);
      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);

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

//  // 프레임 합성 완료 웹훅 (기존 로직이나 테스트 성공하면 지워도 됨)
//  public void webhookFrameCompleted(FrameCompositionCompletedWebhook webhook) {
//    String jobId = webhook.jobId();
//    log.info("프레임 합성 완료 웹훅 수신 - JobId: {}", jobId);
//
//    try {
//      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);
//
//      if (jobInfo.isEmpty()) {
//        log.error("Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
//        return;
//      }
//
//      // 합성 결과 저장
//      saveFrameCompletedResult(webhook);
//
//      // PhotoService에 최종 결과 저장 (Photo 테이블에 저장)
//      photoService.saveFinalComposedPhoto(webhook);
//
//      // ImageProcessingService에 완료 알림
//      if (webhook.data() != null && webhook.data().finalImageUrl() != null) {
//        imageProcessingService.handleFrameCompositionCompleted(
//            jobId,
//            webhook.data().finalImageUrl()
//        );
//      }
//
//      log.info("프레임 합성 완료 처리 성공 - JobId: {}, FinalUrl: {}",
//          jobId, webhook.data() != null ? webhook.data().finalImageUrl() : "null");
//
//    } catch (Exception e) {
//      log.error("프레임 합성 완료 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
//      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
//          "프레임 합성 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
//
    // 프레임 합성 실패 웹훅 (기존 로직이나 테스트 성공하면 지워도 됨)
//  public void webhookFrameFailed(FrameCompositionFailedWebhook webhook) {
//    String jobId = webhook.jobId();
//    log.error("프레임 합성 실패 웹훅 수신 - JobId: {}", jobId);
//
//    try {
//      //Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("job:" + jobId);
//      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);
//
//      if (jobInfo.isEmpty()) {
//        log.error("Compose Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
//        return;
//      }
//
//      String jobType = (String) jobInfo.get("type");
//      if (!"compose".equals(jobType)) {
//        log.error("잘못된 Job 타입 - JobId: {}, Type: {}", jobId, jobType);
//        return;
//      }
//
//      // 실패 결과 Redis에 저장
//      saveFrameFailureResult(webhook);
//
//      // 배치를 실패로 마킹
//      String batchId = (String) jobInfo.get("batch_id");
//      if (batchId != null) {
//        markBatchAsCompositionFailed(batchId, webhook);
//      }
//
//      log.info("프레임 합성 실패 처리 완료 - JobId: {}", jobId);
//
//    } catch (Exception e) {
//      log.error("프레임 합성 실패 웹훅 처리 실패 - JobId: {}, Error: {}", jobId, e.getMessage());
//      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
//          "프레임 합성 실패 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
  // WebhookService.java - 프레임 합성 완료 웹훅 상세 로깅
  public void webhookFrameCompleted(FrameCompositionCompletedWebhook webhook) {
    String jobId = webhook.jobId();
    long startTime = System.currentTimeMillis();

    log.info("=== 🖼️ 프레임 합성 완료 웹훅 처리 시작 ===");
    log.info("JobId: {}", jobId);
    log.info("수신 시간: {}", startTime);
    log.info("Event: {}", webhook.event());
    log.info("Timestamp: {}", webhook.timestamp());

    // 웹훅 데이터 상세 분석
    if (webhook.data() != null) {
      log.info("=== 웹훅 Data 상세 분석 ===");
      log.info("finalImageUrl: {}", webhook.data().finalImageUrl());

      try {
        if (webhook.data().individualImageUrls() != null) {
          log.info("individualImageUrls 개수: {}", webhook.data().individualImageUrls().size());
          for (int i = 0; i < webhook.data().individualImageUrls().size(); i++) {
            log.info("  개별 이미지 {}: {}", i, webhook.data().individualImageUrls().get(i));
          }
        } else {
          log.warn("individualImageUrls가 null입니다");
        }
      } catch (Exception e) {
        log.error("individualImageUrls 처리 실패: {}", e.getMessage());
      }

      try {
        if (webhook.data().frameInfo() != null) {
          log.info("frameInfo 존재:");
          log.info("  color: {}", webhook.data().frameInfo().color());
          log.info("  layout: {}", webhook.data().frameInfo().layout());
        } else {
          log.warn("frameInfo가 null입니다");
        }
      } catch (Exception e) {
        log.error("frameInfo 처리 실패: {}", e.getMessage());
      }
    } else {
      log.error("❌ webhook.data()가 null입니다!");
    }

    try {
      // 1️⃣ Redis Frame Job 정보 조회
      log.info("=== 1️⃣ Redis Frame Job 정보 조회 ===");
      String frameJobKey = "frame_job:" + jobId;
      Boolean keyExists = redisTemplate.hasKey(frameJobKey);
      log.info("Frame Job 키: {}", frameJobKey);
      log.info("키 존재 여부: {}", keyExists);

      // 관련된 모든 키 패턴 확인
      Set<String> allFrameKeys = redisTemplate.keys("frame_job:*");
      log.info("현재 존재하는 frame_job 키들 ({}개): {}", allFrameKeys.size(), allFrameKeys);

      Set<String> jobIdKeys = redisTemplate.keys("*" + jobId + "*");
      log.info("JobId({}) 포함된 모든 키들: {}", jobId, jobIdKeys);

      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries(frameJobKey);
      log.info("조회된 Frame Job 필드 개수: {}", jobInfo.size());

      if (jobInfo.isEmpty()) {
        log.error("❌ Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);

        // 재시도 로직
        log.info("=== 재시도 시작 ===");
        for (int i = 1; i <= 3; i++) {
          log.info("재시도 {}/3 - 1초 대기 중...", i);
          Thread.sleep(1000);

          keyExists = redisTemplate.hasKey(frameJobKey);
          jobInfo = redisTemplate.opsForHash().entries(frameJobKey);
          log.info("재시도 {} 결과 - 키 존재: {}, 필드 개수: {}", i, keyExists, jobInfo.size());

          if (!jobInfo.isEmpty()) {
            log.info("✅ 재시도 {}에서 Frame Job 정보 발견!", i);
            break;
          }
        }

        if (jobInfo.isEmpty()) {
          log.error("❌ 3번 재시도 후에도 Frame Job 정보를 찾을 수 없음");
          return;
        }
      }

      log.info("✅ Frame Job 정보 발견! 상세 내용:");
      for (Map.Entry<Object, Object> entry : jobInfo.entrySet()) {
        log.info("  {}: {}", entry.getKey(), entry.getValue());
      }

      // 2️⃣ 합성 결과 저장
      log.info("=== 2️⃣ 합성 결과 Redis 저장 ===");
      try {
        saveFrameCompletedResult(webhook);
        log.info("✅ 합성 결과 Redis 저장 완료");
      } catch (Exception e) {
        log.error("❌ 합성 결과 Redis 저장 실패: {}", e.getMessage(), e);
      }

      // 3️⃣ PhotoService에 최종 결과 저장
      log.info("=== 3️⃣ PhotoService 최종 결과 저장 ===");
      try {
        photoService.saveFinalComposedPhoto(webhook);
        log.info("✅ PhotoService 최종 결과 저장 완료");
      } catch (Exception e) {
        log.error("❌ PhotoService 최종 결과 저장 실패: {}", e.getMessage(), e);
      }

      // 4️⃣ ImageProcessingService에 완료 알림
      log.info("=== 4️⃣ ImageProcessingService 완료 알림 ===");
      if (webhook.data() != null && webhook.data().finalImageUrl() != null) {
        String finalImageUrl = webhook.data().finalImageUrl();
        log.info("최종 이미지 URL: {}", finalImageUrl);

        try {
          imageProcessingService.handleFrameCompositionCompleted(jobId, finalImageUrl);
          log.info("✅ ImageProcessingService 완료 알림 완료");
        } catch (Exception e) {
          log.error("❌ ImageProcessingService 완료 알림 실패: {}", e.getMessage(), e);
        }
      } else {
        log.warn("⚠️ finalImageUrl이 없어서 ImageProcessingService 알림 생략");
      }

      long endTime = System.currentTimeMillis();
      log.info("=== ✅ 프레임 합성 완료 웹훅 처리 성공 ===");
      log.info("JobId: {}, 총 소요시간: {}ms", jobId, (endTime - startTime));
      log.info("FinalUrl: {}", webhook.data() != null ? webhook.data().finalImageUrl() : "null");

    } catch (Exception e) {
      long endTime = System.currentTimeMillis();
      log.error("=== ❌ 프레임 합성 완료 웹훅 처리 실패 ===");
      log.error("JobId: {}, 소요시간: {}ms", jobId, (endTime - startTime));
      log.error("오류 타입: {}", e.getClass().getSimpleName());
      log.error("오류 메시지: {}", e.getMessage());
      log.error("스택 트레이스: ", e);

      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "프레임 합성 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // 프레임 합성 실패 웹훅 상세 로깅
  public void webhookFrameFailed(FrameCompositionFailedWebhook webhook) {
    String jobId = webhook.jobId();
    long startTime = System.currentTimeMillis();

    log.error("=== ❌ 프레임 합성 실패 웹훅 처리 시작 ===");
    log.error("JobId: {}", jobId);
    log.error("수신 시간: {}", startTime);
    log.error("Event: {}", webhook.event());
    log.error("Timestamp: {}", webhook.timestamp());

    // 웹훅 에러 정보 상세 분석
    if (webhook.error() != null) {
      log.error("=== 에러 정보 상세 분석 ===");
      log.error("Error Code: {}", webhook.error().code());
      log.error("Error Message: {}", webhook.error().message());
    } else {
      log.warn("webhook.error()가 null입니다");
    }

    try {
      // 1️⃣ Redis Frame Job 정보 조회
      log.info("=== 1️⃣ Redis Frame Job 정보 조회 ===");
      String frameJobKey = "frame_job:" + jobId;
      Boolean keyExists = redisTemplate.hasKey(frameJobKey);
      log.info("Frame Job 키: {}", frameJobKey);
      log.info("키 존재 여부: {}", keyExists);

      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries(frameJobKey);
      log.info("조회된 Frame Job 필드 개수: {}", jobInfo.size());

      if (jobInfo.isEmpty()) {
        log.error("❌ Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);

        // 다른 키 패턴들도 확인
        Set<String> allFrameKeys = redisTemplate.keys("frame_job:*");
        log.info("현재 존재하는 frame_job 키들: {}", allFrameKeys);

        Set<String> jobIdKeys = redisTemplate.keys("*" + jobId + "*");
        log.info("JobId 포함된 모든 키들: {}", jobIdKeys);

        return;
      }

      log.info("✅ Frame Job 정보 발견! 상세 내용:");
      for (Map.Entry<Object, Object> entry : jobInfo.entrySet()) {
        log.info("  {}: {}", entry.getKey(), entry.getValue());
      }

      // 2️⃣ Job Type 확인
      log.info("=== 2️⃣ Job Type 확인 ===");
      String jobType = (String) jobInfo.get("job_type");
      log.info("Job Type: {}", jobType);

      if (!"frame_compose".equals(jobType)) {
        log.error("❌ 잘못된 Job 타입 - JobId: {}, 예상: frame_compose, 실제: {}", jobId, jobType);
        return;
      }
      log.info("✅ Job Type 확인 완료");

      // 3️⃣ 실패 결과 Redis에 저장
      log.info("=== 3️⃣ 실패 결과 Redis 저장 ===");
      try {
        saveFrameFailureResult(webhook);
        log.info("✅ 실패 결과 Redis 저장 완료");
      } catch (Exception e) {
        log.error("❌ 실패 결과 Redis 저장 실패: {}", e.getMessage(), e);
      }

      // 4️⃣ 배치를 실패로 마킹
      log.info("=== 4️⃣ 배치 실패 마킹 ===");
      String roomId = (String) jobInfo.get("room_id");
      if (roomId != null) {
        String batchKey = "room:" + roomId;
        log.info("배치 키: {}", batchKey);

        try {
          markBatchAsCompositionFailed(batchKey, webhook);
          log.info("✅ 배치 실패 마킹 완료");
        } catch (Exception e) {
          log.error("❌ 배치 실패 마킹 실패: {}", e.getMessage(), e);
        }
      } else {
        log.warn("⚠️ roomId가 없어서 배치 실패 마킹 생략");
      }

      long endTime = System.currentTimeMillis();
      log.info("=== ✅ 프레임 합성 실패 웹훅 처리 완료 ===");
      log.info("JobId: {}, 소요시간: {}ms", jobId, (endTime - startTime));

    } catch (Exception e) {
      long endTime = System.currentTimeMillis();
      log.error("=== ❌ 프레임 합성 실패 웹훅 처리 중 오류 ===");
      log.error("JobId: {}, 소요시간: {}ms", jobId, (endTime - startTime));
      log.error("오류 타입: {}", e.getClass().getSimpleName());
      log.error("오류 메시지: {}", e.getMessage());
      log.error("스택 트레이스: ", e);

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

//  private void updatePromptStatus(Long promptId, PromptStatus status) {
//    try {
//      PhotoPrompt photoPrompt = photoPromptRepository.findById(promptId).orElse(null);
//      if (photoPrompt != null) {
//        photoPrompt.updateStatus(status);
//        photoPromptRepository.save(photoPrompt);
//        log.info("프롬프트 상태 업데이트 - PromptId: {}, Status: {}", promptId, status);
//      }
//    } catch (Exception e) {
//      log.warn("프롬프트 상태 업데이트 실패 - PromptId: {}, Error: {}", promptId, e.getMessage());
//    }
//  }

@Transactional(propagation = Propagation.REQUIRES_NEW)
private void updatePromptStatus(Long promptId, PromptStatus status) {
  log.info("=== 🔍 프롬프트 상태 업데이트 시작 ===");
  log.info("PromptId: {}, 목표 Status: {}", promptId, status);

  try {
    // 1️⃣ 프롬프트 조회
    log.info("1️⃣ 프롬프트 조회 중...");
    Optional<PhotoPrompt> optionalPrompt = photoPromptRepository.findById(promptId);

    if (optionalPrompt.isEmpty()) {
      log.error("❌ 프롬프트를 찾을 수 없음 - PromptId: {}", promptId);

      // 모든 프롬프트 확인
      log.info("현재 DB에 있는 모든 프롬프트 확인...");
      List<PhotoPrompt> allPrompts = photoPromptRepository.findAll();
      log.info("총 프롬프트 개수: {}", allPrompts.size());
      for (PhotoPrompt p : allPrompts) {
        log.info("  PromptId: {}, Text: {}, Status: {}",
            p.getPromptId(), p.getPromptText(), p.getStatus());
      }
      return;
    }

    PhotoPrompt photoPrompt = optionalPrompt.get();
    log.info("✅ 프롬프트 조회 성공");
    log.info("현재 상태 - ID: {}, Text: {}, Status: {}, CreatedAt: {}",
        photoPrompt.getPromptId(),
        photoPrompt.getPromptText(),
        photoPrompt.getStatus(),
        photoPrompt.getCreatedAt());

    // 2️⃣ 상태 변경
    log.info("2️⃣ 상태 변경: {} → {}", photoPrompt.getStatus(), status);
    PromptStatus oldStatus = photoPrompt.getStatus();
    photoPrompt.updateStatus(status);
    log.info("객체 상태 변경 완료: {} → {}", oldStatus, photoPrompt.getStatus());

    // 3️⃣ 저장
    log.info("3️⃣ DB 저장 시작...");
    PhotoPrompt savedPrompt = photoPromptRepository.save(photoPrompt);
    log.info("✅ DB 저장 완료");
    log.info("저장된 상태 - ID: {}, Status: {}, UpdatedAt: {}",
        savedPrompt.getPromptId(),
        savedPrompt.getStatus(),
        savedPrompt.getUpdatedAt());

    // 4️⃣ 저장 확인
    log.info("4️⃣ 저장 결과 재확인...");
    PhotoPrompt reloadedPrompt = photoPromptRepository.findById(promptId).orElse(null);
    if (reloadedPrompt != null) {
      log.info("✅ 재확인 성공 - Status: {}", reloadedPrompt.getStatus());
      if (!status.equals(reloadedPrompt.getStatus())) {
        log.error("❌ 상태 불일치! 목표: {}, 실제: {}", status, reloadedPrompt.getStatus());
      }
    } else {
      log.error("❌ 재확인 실패 - 프롬프트가 사라짐");
    }

    log.info("=== ✅ 프롬프트 상태 업데이트 완료 ===");

  } catch (Exception e) {
    log.error("=== ❌ 프롬프트 상태 업데이트 실패 ===");
    log.error("PromptId: {}, 목표 Status: {}", promptId, status);
    log.error("오류 타입: {}", e.getClass().getSimpleName());
    log.error("오류 메시지: {}", e.getMessage());
    log.error("스택 트레이스: ", e);

    // 트랜잭션 상태 확인
    try {
      boolean isRollbackOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
      log.error("현재 트랜잭션 읽기전용 여부: {}", isRollbackOnly);
    } catch (Exception txEx) {
      log.error("트랜잭션 상태 확인 실패: {}", txEx.getMessage());
    }

    // 🔍 예외를 다시 던지지 않음
    log.warn("⚠️ 프롬프트 상태 업데이트 실패했지만 예외를 억제하여 웹훅 처리 계속 진행");
  }
}
//  @Deprecated
//  public void handleImageProcessingCompleted(ImageProcessingCompletedWebhook webhook) {
//    log.warn("Deprecated 메소드 호출 - handleImageProcessingCompleted: {}", webhook.jobId());
//    // 기존 로직과의 호환성을 위해 개별 처리로 리다이렉트
//    webhookIndividualCompleted(webhook);
//  }
//
//  @Deprecated
//  public void handleImageProcessingFailed(ImageProcessingFailedWebhook webhook) {
//    log.warn("Deprecated 메소드 호출 - handleImageProcessingFailed: {}", webhook.jobId());
//    // 기존 로직과의 호환성을 위해 개별 처리로 리다이렉트
//    webhookIndividualFailed(webhook);
//  }
}