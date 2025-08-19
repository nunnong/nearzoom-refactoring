package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.ssafy.nearzoom.domain.photoPrompt.dto.BasicSettingsRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.IndividualBackgroundRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.domain.photoPrompt.repository.RedisPhotoPromptRepository;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
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
    private final RedisPhotoPromptRepository redisPromptRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ImageProcessingService imageProcessingService;

    public void saveBasicSettings(HttpServletRequest request,
        BasicSettingsRequest basicSettingsRequest) {
        validateUser(request);

        redisPromptRepository.saveSettings(basicSettingsRequest);
    }

    public Map<String, Object> saveIndividualImageBackground(HttpServletRequest request,
        IndividualBackgroundRequest backgroundRequest) {
        validateUser(request);

        Long roomId = backgroundRequest.roomId();
        String promptText = backgroundRequest.promptText();

        ProcessingOptions processingOptions;

        String promptId = null;

        if ("prompt".equals(backgroundRequest.backgroundType())) {
            PhotoPrompt photoPrompt = new PhotoPrompt(promptText);
            photoPromptRepository.save(photoPrompt);
            promptId = String.valueOf(photoPrompt.getPromptId());
            processingOptions = new ProcessingOptions("prompt", promptText, null);

        } else {
            String color = backgroundRequest.colorValue();
            processingOptions = new ProcessingOptions("color", null, color);
        }

        redisPromptRepository.saveBackground(backgroundRequest, promptId);

        try {
          // jobId를 반환받도록 수정
          String jobId = imageProcessingService.processIndividualStart(
              backgroundRequest.roomId(),
              backgroundRequest.imageUrl(),
              backgroundRequest.personIds(),
              processingOptions,
              promptId
          );

          log.info("이미지 서버 전송 완료 - Room:{}, JobId:{}", roomId, jobId);

          // 결과 반환
          Map<String, Object> result = new HashMap<>();
          result.put("jobId", jobId);
          result.put("promptId", promptId);
          result.put("status", "processing_started");
          return result;

        } catch (Exception e) {
            log.error("이미지 서버 전송 실패 - RoomId: {}, Error: {}", roomId, e.getMessage());
            PhotoPrompt photoPrompt = photoPromptRepository.findById(Long.valueOf(promptId))
                .orElse(null);
            photoPrompt.updateStatus(PromptStatus.FAIL);
            photoPromptRepository.save(photoPrompt);
            throw e;
        }
    }

    public ImageProcessingResult getProcessingResult(String roomIdOrJobId) {
        try {
            Long roomId = Long.parseLong(roomIdOrJobId);
            return imageProcessingService.getProcessingResult(String.valueOf(roomId));
        } catch (NumberFormatException e) {
            return imageProcessingService.getProcessingResult(roomIdOrJobId);
        }
    }

    public Map<String, Object> getRoomStatus(Long roomId) {
        String roomKey = "room:" + roomId;
        Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

        if (roomData.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "방 정보를 찾을 수 없습니다.");
        }

        Map<String, Object> status = new HashMap<>();

        String totalImagesStr = (String) roomData.get("total_images");
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

    private int countConfiguredImages(Map<Object, Object> roomData) {
        String totalImagesStr = (String) roomData.get("total_images");
        if (totalImagesStr == null) {
            return 0;
        }

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

    public Map<String, Object> getProcessingProgress(Long roomId) {
        String roomKey = "room:" + roomId;
        Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

        if (roomData.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "방 정보를 찾을 수 없습니다.");
        }

        String status = (String) roomData.get("photo_status");
        String totalImagesStr = (String) roomData.get("total_images");
        String completedCountStr = (String) roomData.get("completed_individual_count");

        int totalImages = totalImagesStr != null ? Integer.parseInt(totalImagesStr) : 0;
        int completedImages = completedCountStr != null ? Integer.parseInt(completedCountStr) : 0;

        Map<String, Object> progress = new HashMap<>();
        progress.put("status", status != null ? status : "not_started");
        progress.put("totalImages", totalImages);
        progress.put("completedImages", completedImages);
        progress.put("progressPercentage",
            totalImages > 0 ? (completedImages * 100 / totalImages) : 0);

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

    public void resetRoom(HttpServletRequest request, Long roomId) {
        validateUser(request);

        String roomKey = "room:" + roomId;

        Set<String> batchKeys = redisTemplate.keys("batch:" + roomId + ":*");
        for (String batchKey : batchKeys) {
            redisTemplate.delete(batchKey);
        }

        redisTemplate.delete("final_result:" + roomId);

        redisTemplate.delete(roomKey);

        log.info("방 초기화 완료 - RoomId: {}", roomId);
    }

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