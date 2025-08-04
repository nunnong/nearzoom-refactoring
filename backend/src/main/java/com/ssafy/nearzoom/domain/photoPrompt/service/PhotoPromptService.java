package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.BackgroundInfoRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.PhotoSelectionRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PhotoPromptService {

  private final JWTUtil jwtUtil;
  private final UserRepository userRepository;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final ImageProcessingService imageProcessingService;

  public void savePhotoSelection(HttpServletRequest request, PhotoSelectionRequest selectionRequest) {
    validateUser(request);

    int cutCount = selectionRequest.cutCount();
    if (cutCount != 1 && cutCount != 2 && cutCount != 4) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "컷 개수가 유효하지 않습니다. (1, 2, 4개만 가능)");
    }

    String roomKey = "room:" + selectionRequest.roomId();
    String imageIds = String.join(",", selectionRequest.selectedCutIds().stream()
        .map(String::valueOf).toArray(String[]::new));

    Map<String, String> imageData = new HashMap<>();
    imageData.put("selectedImages", imageIds);
    imageData.put("imageCount", String.valueOf(cutCount));

    redisTemplate.opsForHash().putAll(roomKey, imageData);
  }

  @Transactional
  public void saveBackgroundInfo(HttpServletRequest request, BackgroundInfoRequest backgroundRequest) {
    validateUser(request);

    String type = backgroundRequest.backgroundType();
    if (!"solid".equals(type) && !"prompt".equals(type)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "유효하지 않은 처리 타입입니다.");
    }

    String roomKey = "room:" + backgroundRequest.roomId();
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "방 정보를 찾을 수 없습니다.");
    }

    String imageUrl = backgroundRequest.imageUrl();
    if (imageUrl == null || imageUrl.trim().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 URL이 필요합니다.");
    }
    redisTemplate.opsForHash().put(roomKey, "image_url", imageUrl);

    if ("prompt".equals(type)) {
      String promptText = backgroundRequest.promptText();
      if (promptText == null || promptText.trim().isEmpty()) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "프롬프트 텍스트가 공백입니다.");
      }

      PhotoPrompt photoPrompt = new PhotoPrompt(promptText);
      photoPromptRepository.save(photoPrompt);

      redisTemplate.opsForHash().put(roomKey, "background_prompt_text", promptText);
      redisTemplate.opsForHash().put(roomKey, "background_prompt_id", String.valueOf(photoPrompt.getPromptId()));
      redisTemplate.opsForHash().put(roomKey, "background_type", "prompt");

    } else { // solid
      String color = backgroundRequest.colorValue();
      if (color == null || color.trim().isEmpty()) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "색상 값이 필요합니다.");
      }

      redisTemplate.opsForHash().put(roomKey, "background_color", color);
      redisTemplate.opsForHash().put(roomKey, "background_type", "color");
    }

    imageProcessingService.processImage(backgroundRequest.roomId());
  }

  public ImageProcessingResult getProcessingResult(String jobId) {
    return imageProcessingService.getProcessingResult(jobId);
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