package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerResponse;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.FrameComposeRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.util.retry.Retry;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageProcessingService {

  @Qualifier("imageServerWebClient")
  private final WebClient imageServerWebClient;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final ObjectMapper objectMapper = new ObjectMapper();

  // 개별 이미지 즉시 처리
//  public void processIndividualImageImmediately(Long roomId, int imageOrder,
//      String imageUrl, List<String> personIds, ProcessingOptions options,
//      String promptId) {
//    try {
//      log.info("=== 개별 이미지 처리 시작 ===");
//      log.info("RoomId: {}, Order: {}, ImageUrl: {}", roomId, imageOrder, imageUrl);
//
//      // 이미지 서버 요청 생성
//      ImageServerRequest request = new ImageServerRequest(
//          imageUrl,
//          personIds,
//          options
//      );
//
//      log.info("이미지 서버 요청 전송 시작...");
//
//      // 이미지 서버로 전송
//      ImageServerResponse response = sendToImageServer("/jobs", request);
//
//      if (response == null || response.data() == null || response.data().jobId() == null) {
//        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
//            "이미지 서버에서 올바른 응답을 받지 못했습니다.");
//      }
//
//      String jobId = response.data().jobId();
//      log.info("✅ 이미지 서버 응답 받음 - JobId: {}", jobId);
//
//      // 🔍 Job 정보 Redis에 저장 (중요!)
//      log.info("Redis에 Job 정보 저장 시작...");
//      saveIndividualJobInfo(jobId, roomId, imageOrder, imageUrl, options, promptId);
//      log.info("✅ Redis에 Job 정보 저장 완료 - JobId: {}", jobId);
//
//      // 🔍 저장 후 즉시 확인
//      Map<Object, Object> savedJobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);
//      log.info("저장된 Job 정보 확인 - 필드 개수: {}", savedJobInfo.size());
//      for (Map.Entry<Object, Object> entry : savedJobInfo.entrySet()) {
//        log.info("  {}: {}", entry.getKey(), entry.getValue());
//      }
//
//      log.info("개별 이미지 처리 요청 완료 - JobId: {}, RoomId: {}, Order: {}",
//          jobId, roomId, imageOrder);
//
//    } catch (Exception e) {
//      log.error("개별 이미지 즉시 처리 실패 - RoomId: {}, Order: {}, Error: {}",
//          roomId, imageOrder, e.getMessage());
//
//      // 프롬프트 상태 업데이트
//      if (promptId != null) {
//        updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
//      }
//
//      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
//          "이미지 처리 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
  public void processIndividualImageImmediately(Long roomId, int imageOrder,
      String imageUrl, List<String> personIds, ProcessingOptions options,
      String promptId) {
    try {
      // 이미지 서버 요청 생성
      ImageServerRequest request = new ImageServerRequest(
          imageUrl,
          personIds,
          options
      );

      // 이미지 서버로 전송
      ImageServerResponse response = sendToImageServer("/jobs", request);

      if (response == null || response.data() == null || response.data().jobId() == null) {
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
            "이미지 서버에서 올바른 응답을 받지 못했습니다.");
      }

      String jobId = response.data().jobId();

      // Job 정보 Redis에 저장
      saveIndividualJobInfo(jobId, roomId, imageOrder, imageUrl, options, promptId);

      log.info("개별 이미지 처리 요청 완료 - JobId: {}, RoomId: {}, Order: {}",
          jobId, roomId, imageOrder);

    } catch (Exception e) {
      log.error("개별 이미지 즉시 처리 실패 - RoomId: {}, Order: {}, Error: {}",
          roomId, imageOrder, e.getMessage());

      // 프롬프트 상태 업데이트
      if (promptId != null) {
        updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
      }

      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "이미지 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // 개별 이미지 처리 완료 시 호출 (웹훅에서 호출)
  public void IndividualCompleted(String jobId, String processedImageUrl) {
    Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);

    if (jobInfo.isEmpty()) {
      log.error("Individual Job 정보를 찾을 수 없습니다: {}", jobId);
      return;
    }

    Long roomId = Long.valueOf((String) jobInfo.get("room_id"));
    int imageOrder = Integer.parseInt((String) jobInfo.get("image_order"));
    String promptId = (String) jobInfo.get("prompt_id");

    log.info("개별 이미지 처리 완료 - JobId: {}, RoomId: {}, Order: {}, ProcessedUrl: {}",
        jobId, roomId, imageOrder, processedImageUrl);

    // 프롬프트 상태 업데이트
    if (promptId != null) {
      updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
    }

    // 처리된 이미지 URL 저장
    String roomKey = "room:" + roomId;
    redisTemplate.opsForHash().put(roomKey, "processed_image_" + imageOrder, processedImageUrl);

    // 완료된 개별 처리 수 증가
    redisTemplate.opsForHash().increment(roomKey, "completed_individual_count", 1);

    // 모든 개별 처리가 완료되었는지 확인
    checkAndStartFrameComposition(roomId);
  }

  // 모든 개별 처리 완료 확인 및 프레임 합성 시작
  private void checkAndStartFrameComposition(Long roomId) {
    String roomKey = "room:" + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    String totalImagesStr = (String) roomData.get("total_images");
    String completedCountStr = (String) roomData.get("completed_individual_count");

    if (totalImagesStr == null || completedCountStr == null) {
      log.warn("총 이미지 수 또는 완료 수 정보가 없습니다 - RoomId: {}", roomId);
      return;
    }

    int totalImages = Integer.parseInt(totalImagesStr);
    int completedImages = Integer.parseInt(completedCountStr);

    log.info("개별 처리 진행률 확인 - RoomId: {}, Completed: {}/{}",
        roomId, completedImages, totalImages);

    if (completedImages == totalImages && totalImages > 0) {
      log.info("모든 개별 처리 완료. 프레임 합성 시작 - RoomId: {}", roomId);
      startFrameComposition(roomId, roomData, totalImages);
    }
  }

  // 프레임 합성 시작
  private void startFrameComposition(Long roomId, Map<Object, Object> roomData, int totalImages) {
    try {
      // 처리된 이미지 URL들을 순서대로 수집
      List<String> processedImageUrls = new ArrayList<>();

      for (int i = 0; i < totalImages; i++) {
        String processedUrl = (String) roomData.get("processed_image_" + i);
        if (processedUrl == null) {
          throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
              "처리된 이미지를 찾을 수 없습니다: order " + i);
        }
        processedImageUrls.add(processedUrl);
      }

      String frameColor = (String) roomData.get("frame_color");
      if (frameColor == null) {
        frameColor = "#FFFFFF"; // 기본값
      }

      // 프레임 합성 요청
      FrameComposeRequest composeRequest = new FrameComposeRequest(
          processedImageUrls,
          frameColor
      );

      log.info("프레임 합성 요청 시작 - RoomId: {}, ImageCount: {}, FrameColor: {}",
          roomId, totalImages, frameColor);

      ImageServerResponse response = sendToImageServer("/frame", composeRequest);

      if (response == null || response.data() == null || response.data().jobId() == null) {
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
            "프레임 합성 서버에서 올바른 응답을 받지 못했습니다.");
      }

      String composeJobId = response.data().jobId();

      // 프레임 합성 Job 정보 저장
      saveFrameComposeJobInfo(composeJobId, roomId, processedImageUrls, frameColor);

      // 방 상태 업데이트
      redisTemplate.opsForHash().put("room:" + roomId, "compose_job_id", composeJobId);
      redisTemplate.opsForHash().put("room:" + roomId, "status", "frame_composing");

      log.info("프레임 합성 요청 완료 - ComposeJobId: {}, RoomId: {}", composeJobId, roomId);

    } catch (Exception e) {
      log.error("프레임 합성 시작 실패 - RoomId: {}, Error: {}", roomId, e.getMessage());
      redisTemplate.opsForHash().put("room:" + roomId, "status", "frame_compose_failed");
      redisTemplate.opsForHash().put("room:" + roomId, "error_message",
          "프레임 합성 시작 실패: " + e.getMessage());
    }
  }
  // 프레임 합성 완료 처리 (웹훅에서 호출)
  public void handleFrameCompositionCompleted(String jobId, String finalImageUrl) {
    Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);

    if (jobInfo.isEmpty()) {
      log.error("Frame Job 정보를 찾을 수 없습니다: {}", jobId);
      return;
    }

    Long roomId = Long.valueOf((String) jobInfo.get("room_id"));

    log.info("프레임 합성 완료 - JobId: {}, RoomId: {}, FinalUrl: {}",
        jobId, roomId, finalImageUrl);

    // 최종 결과 저장
    String roomKey = "room:" + roomId;
    redisTemplate.opsForHash().put(roomKey, "final_image_url", finalImageUrl);
    redisTemplate.opsForHash().put(roomKey, "status", "all_completed");

    // 최종 결과를 별도 키에도 저장 (조회 편의성)
    redisTemplate.opsForValue().set("final_result:" + roomId, finalImageUrl, Duration.ofDays(1));

    log.info("전체 프로세스 완료 - RoomId: {}, FinalImageUrl: {}", roomId, finalImageUrl);
  }

  // 처리 결과 조회
  public ImageProcessingResult getProcessingResult(String roomId) {
    try {
      Long roomIdLong = Long.parseLong(roomId);

      // 최종 결과 확인
      String finalImageUrl = redisTemplate.opsForValue().get("final_result:" + roomIdLong);
      if (finalImageUrl != null) {
        return new ImageProcessingResult(
            roomId,
            "SUCCESS",
            finalImageUrl,
            null,
            null,
            null
        );
      }

      // 진행 중인 상태 확인
      String roomKey = "room:" + roomIdLong;
      Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

      if (roomData.isEmpty()) {
        throw new ApiException(HttpStatus.NOT_FOUND, "처리 중인 작업을 찾을 수 없습니다.");
      }

      String status = (String) roomData.get("status");
      String errorMessage = (String) roomData.get("error_message");

      if ("frame_compose_failed".equals(status) || errorMessage != null) {
        return new ImageProcessingResult(
            roomId,
            "FAILED",
            null,
            null,
            "PROCESSING_ERROR",
            errorMessage != null ? errorMessage : "처리 중 오류가 발생했습니다."
        );
      }

      // 진행 상황 계산
      String totalImagesStr = (String) roomData.get("total_images");
      String completedCountStr = (String) roomData.get("completed_individual_count");

      int totalImages = totalImagesStr != null ? Integer.parseInt(totalImagesStr) : 0;
      int completedImages = completedCountStr != null ? Integer.parseInt(completedCountStr) : 0;

      String progressMessage;
      if ("frame_composing".equals(status)) {
        progressMessage = "개별 처리 완료, 프레임 합성 중...";
      } else {
        progressMessage = String.format("개별 처리 진행 중: %d/%d", completedImages, totalImages);
      }

      return new ImageProcessingResult(
          roomId,
          "PROCESSING",
          null,
          progressMessage,
          null,
          null
      );

    } catch (NumberFormatException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "올바르지 않은 roomId 형식입니다.");
    }
  }

  // 이미지 서버로 요청 전송
  private ImageServerResponse sendToImageServer(String endpoint, Object request) {
    try {
      return imageServerWebClient
          .post()
          .uri(endpoint)
          .bodyValue(request)
          .retrieve()
          .onStatus(
              status -> status.is4xxClientError() || status.is5xxServerError(),
              response -> response.bodyToMono(String.class)
                  .map(this::handleImageServerError)
          )
          .bodyToMono(ImageServerResponse.class)
          .timeout(Duration.ofMinutes(10))
          .retryWhen(
              Retry.backoff(3, Duration.ofSeconds(2))
                  .filter(throwable -> throwable instanceof WebClientRequestException
                      || throwable instanceof TimeoutException)
          )
          .block();

    } catch (Exception e) {
      log.error("이미지 서버 요청 실패 - Endpoint: {}, Error: {}", endpoint, e.getMessage());
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "이미지 서버 요청 실패: " + e.getMessage());
    }
  }

  // 개별 Job 정보 저장
  private void saveIndividualJobInfo(String jobId, Long roomId, int imageOrder,
      String imageUrl, ProcessingOptions options, String promptId) {
    Map<String, String> jobInfo = new HashMap<>();
    jobInfo.put("room_id", String.valueOf(roomId));
    jobInfo.put("image_order", String.valueOf(imageOrder));
    jobInfo.put("image_url", imageUrl);
    jobInfo.put("background_type", options.backgroundType());
    jobInfo.put("job_type", "individual");
    jobInfo.put("status", "processing");
    jobInfo.put("created_at", String.valueOf(System.currentTimeMillis()));

    if (promptId != null) {
      jobInfo.put("prompt_id", promptId);
    }
    if (options.promptText() != null) {
      jobInfo.put("prompt_text", options.promptText());
    }
    if (options.backgroundColor() != null) {
      jobInfo.put("background_color", options.backgroundColor());
    }

    redisTemplate.opsForHash().putAll("individual_job:" + jobId, jobInfo);
    redisTemplate.expire("individual_job:" + jobId, Duration.ofHours(2));
  }

  // 프레임 합성 Job 정보 저장
  private void saveFrameComposeJobInfo(String jobId, Long roomId,
      List<String> processedImageUrls, String frameColor) {
    Map<String, String> jobInfo = new HashMap<>();
    jobInfo.put("room_id", String.valueOf(roomId));
    jobInfo.put("processed_image_urls", String.join(",", processedImageUrls));
    jobInfo.put("frame_color", frameColor);
    jobInfo.put("job_type", "frame_compose");
    jobInfo.put("status", "processing");
    jobInfo.put("created_at", String.valueOf(System.currentTimeMillis()));

    redisTemplate.opsForHash().putAll("frame_job:" + jobId, jobInfo);
    redisTemplate.expire("frame_job:" + jobId, Duration.ofHours(2));
  }

  private ApiException handleImageServerError(String errorBody) {
    try {
      JsonNode root = objectMapper.readTree(errorBody);
      String code = root.path("error").path("code").asText();
      String message = root.path("error").path("message").asText();
      return new ApiException(HttpStatus.BAD_GATEWAY, code + ": " + message);
    } catch (Exception parseException) {
      return new ApiException(HttpStatus.BAD_GATEWAY, "이미지 서버 오류: " + errorBody);
    }
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
}