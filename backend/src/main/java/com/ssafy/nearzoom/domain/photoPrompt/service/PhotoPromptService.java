package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.ssafy.nearzoom.domain.photoPrompt.dto.IndividualBackgroundRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.HashMap;
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
public class PhotoPromptService {

  private final JWTUtil jwtUtil;
  private final UserRepository userRepository;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final ImageProcessingService imageProcessingService;

  // 1단계: 기본 설정 저장 (프레임 색상만)
  public void saveBasicSettings(HttpServletRequest request, Long roomId, String frameColor) {
    validateUser(request);

    String roomKey = "room:" + roomId;

    // ✅ 수정: putAll() 대신 개별 put() 사용
    redisTemplate.opsForHash().put(roomKey, "frame_color", frameColor);
    redisTemplate.opsForHash().put(roomKey, "photo_status", "basic_settings_saved");

    redisTemplate.expire(roomKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));

    log.info("기본 설정 저장 완료 - RoomId: {}, FrameColor: {}", roomId, frameColor);
  }

  // 2단계: 개별 이미지별 배경 설정 저장 및 즉시 처리
  public void saveIndividualImageBackground(HttpServletRequest request, IndividualBackgroundRequest backgroundRequest) {
    validateUser(request);

    Long roomId = backgroundRequest.roomId();
    String roomKey = "room:" + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "방 정보를 찾을 수 없습니다.");
    }

    int imageOrder = backgroundRequest.imageOrder();
    String backgroundType = backgroundRequest.backgroundType();

    // ProcessingOptions 생성
    ProcessingOptions processingOptions;
    String promptId = null;
    System.out.println("backgroundType = " + backgroundType);
    if ("prompt".equals(backgroundType)) {
      String promptText = backgroundRequest.promptText();

      // 프롬프트 테이블에 저장
      PhotoPrompt photoPrompt = new PhotoPrompt(promptText);
      photoPromptRepository.save(photoPrompt);
      promptId = String.valueOf(photoPrompt.getPromptId());

      processingOptions = new ProcessingOptions("prompt", promptText, null);
    } else { // solid
      String color = backgroundRequest.colorValue();
      processingOptions = new ProcessingOptions("color", null, color);
    }

    // ✅ 수정: Map 생성하지 말고 개별 put() 사용
    redisTemplate.opsForHash().put(roomKey, "image_url_" + imageOrder, backgroundRequest.imageUrl());
    redisTemplate.opsForHash().put(roomKey, "background_type_" + imageOrder, backgroundType);

    if (promptId != null) {
      redisTemplate.opsForHash().put(roomKey, "prompt_id_" + imageOrder, promptId);
    }

    // 총 이미지 수 업데이트 (동적으로 증가)
    String currentMaxOrder = (String) roomData.get("max_image_order");
    int maxOrder = currentMaxOrder != null ? Integer.parseInt(currentMaxOrder) : -1;
    if (imageOrder > maxOrder) {
      redisTemplate.opsForHash().put(roomKey, "max_image_order", String.valueOf(imageOrder));
      redisTemplate.opsForHash().put(roomKey, "total_images", String.valueOf(imageOrder + 1));
    }

    // 즉시 이미지 서버로 전송
    try {
      imageProcessingService.processIndividualStart(
              roomId,
              imageOrder,
              backgroundRequest.imageUrl(),
              backgroundRequest.personIds(),
              processingOptions,
              promptId
      );

      log.info("이미지 서버 전송 완료 - RoomId: {}, Order: {}", roomId, imageOrder);

    } catch (Exception e) {
      log.error("이미지 서버 전송 실패 - RoomId: {}, Order: {}, Error: {}", roomId, imageOrder, e.getMessage());

      // 프롬프트 상태를 실패로 업데이트
      if (promptId != null) {
        try {
          PhotoPrompt photoPrompt = photoPromptRepository.findById(Long.valueOf(promptId)).orElse(null);
          if (photoPrompt != null) {
            photoPrompt.updateStatus(PromptStatus.FAIL);
            photoPromptRepository.save(photoPrompt);
          }
        } catch (Exception ex) {
          log.warn("프롬프트 상태 업데이트 실패: {}", ex.getMessage());
        }
      }

      throw e;
    }
  }

  // 3단계: 처리 결과 조회
  public ImageProcessingResult getProcessingResult(String roomIdOrJobId) {
    // roomId로 조회하는 경우
    try {
      Long roomId = Long.parseLong(roomIdOrJobId);
      return imageProcessingService.getProcessingResult(String.valueOf(roomId));
    } catch (NumberFormatException e) {
      // jobId로 조회하는 경우 (기존 호환성)
      return imageProcessingService.getProcessingResult(roomIdOrJobId);
    }
  }

  // 방 상태 조회
  public Map<String, Object> getRoomStatus(Long roomId) {
    String roomKey = "room:" + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "방 정보를 찾을 수 없습니다.");
    }

    Map<String, Object> status = new HashMap<>();

    String totalImagesStr = (String) roomData.get("total_images");
    // ✅ 수정: "status" → "photo_status" 키 사용
    String currentStatus = (String) roomData.get("photo_status");

    status.put("roomId", roomId);
    status.put("status", currentStatus != null ? currentStatus : "unknown");
    status.put("totalImages", totalImagesStr != null ? Integer.parseInt(totalImagesStr) : 0);

    if (totalImagesStr != null) {
      int totalImages = Integer.parseInt(totalImagesStr);
      int configuredImages = countConfiguredImages(roomData);

      status.put("configurationProgress", Map.of(
              "total", totalImages,
              "configured", configuredImages,
              "isComplete", configuredImages == totalImages
      ));

      // 각 이미지별 설정 상태
      Map<String, Object> imageConfigs = new HashMap<>();
      for (int i = 0; i < totalImages; i++) {
        Map<String, Object> config = new HashMap<>();
        config.put("hasImageUrl", roomData.containsKey("image_url_" + i));
        config.put("hasBackgroundType", roomData.containsKey("background_type_" + i));
        config.put("backgroundType", roomData.get("background_type_" + i));

        if ("prompt".equals(roomData.get("background_type_" + i))) {
          config.put("promptId", roomData.get("prompt_id_" + i));
        }

        imageConfigs.put("image_" + i, config);
      }
      status.put("imageConfigurations", imageConfigs);
    }

    return status;
  }

  // 설정 완료된 이미지 개수 카운트
  private int countConfiguredImages(Map<Object, Object> roomData) {
    String totalImagesStr = (String) roomData.get("total_images");
    if (totalImagesStr == null) return 0;

    int totalImages = Integer.parseInt(totalImagesStr);
    int count = 0;

    for (int i = 0; i < totalImages; i++) {
      if (roomData.containsKey("image_url_" + i) &&
              roomData.containsKey("background_type_" + i)) {
        count++;
      }
    }
    return count;
  }

  // 처리 진행률 조회
  public Map<String, Object> getProcessingProgress(Long roomId) {
    String roomKey = "room:" + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "방 정보를 찾을 수 없습니다.");
    }

    // ✅ 수정: "status" → "photo_status" 키 사용 (RoomService의 status와 구분)
    String status = (String) roomData.get("photo_status");
    String totalImagesStr = (String) roomData.get("total_images");
    String completedCountStr = (String) roomData.get("completed_individual_count");

    int totalImages = totalImagesStr != null ? Integer.parseInt(totalImagesStr) : 0;
    int completedImages = completedCountStr != null ? Integer.parseInt(completedCountStr) : 0;

    Map<String, Object> progress = new HashMap<>();
    progress.put("status", status != null ? status : "not_started");
    progress.put("totalImages", totalImages);
    progress.put("completedImages", completedImages);
    progress.put("progressPercentage", totalImages > 0 ? (completedImages * 100 / totalImages) : 0);

    if ("frame_compose_failed".equals(status)) {
      progress.put("errorMessage", roomData.get("error_message"));
    } else if ("all_completed".equals(status)) {
      progress.put("finalImageUrl", roomData.get("final_image_url"));
    } else if ("frame_composing".equals(status)) {
      progress.put("message", "개별 처리 완료, 최종 합성 중...");
      progress.put("composeJobId", roomData.get("compose_job_id"));
    }

    return progress;
  }

  // 방 초기화
  public void resetRoom(HttpServletRequest request, Long roomId) {
    validateUser(request);

    String roomKey = "room:" + roomId;

    // 기존 배치 작업들 정리
    Set<String> batchKeys = redisTemplate.keys("batch:" + roomId + ":*");
    for (String batchKey : batchKeys) {
      redisTemplate.delete(batchKey);
    }

    // 최종 결과 삭제
    redisTemplate.delete("final_result:" + roomId);

    // 방 데이터 초기화
    redisTemplate.delete(roomKey);

    log.info("방 초기화 완료 - RoomId: {}", roomId);
  }

  // 사용자 검증
  private void validateUser(HttpServletRequest request) {
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다.");
    }

    String accessToken = authHeader.substring(7);
    String email = jwtUtil.getEmail(accessToken);
    Social social = jwtUtil.getSocial(accessToken);

    User user = userRepository.getByEmailAndSocial(email, social);
    if (user == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다.");
    }
  }
}