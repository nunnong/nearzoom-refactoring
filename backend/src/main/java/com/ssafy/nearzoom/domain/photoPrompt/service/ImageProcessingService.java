package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerResponse;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingServerResponse;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.RoomImageData;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.util.retry.Retry;

@Service
@RequiredArgsConstructor
public class ImageProcessingService {

  @Qualifier("imageServerWebClient")
  private final WebClient imageServerWebClient;
  private final PhotoPromptRepository photoPromptRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public ProcessingServerResponse processImage(Long roomId) {
    String roomKey = "room:" + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "방 정보를 찾을 수 없습니다.");
    }

    RoomImageData extractedData = extractAndValidateRoomData(roomData);

    ImageServerRequest serverRequest = new ImageServerRequest(
        extractedData.imageUrl(),
        extractedData.personIds(),
        extractedData.processingOptions()
    );

    return sendRequestToImageServer(serverRequest, roomId, extractedData.backgroundPromptId());
  }

  private ProcessingServerResponse sendRequestToImageServer(
      ImageServerRequest serverRequest, Long roomId, String backgroundPromptId) {
      String uploadUrl = "/upload"; ///image/jobs
    try {
      ImageServerResponse serverResponse = imageServerWebClient
          .post()
          .uri(uploadUrl)
          .bodyValue(serverRequest)

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

      return handleSuccessResponse(serverResponse, roomId, backgroundPromptId);

    } catch (Exception e) {
      return handleFailureResponse(e, backgroundPromptId);
    }
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

  private ProcessingServerResponse handleSuccessResponse(
      ImageServerResponse serverResponse, Long roomId, String backgroundPromptId) {

    if (serverResponse == null || serverResponse.data() == null || serverResponse.data().jobId() == null) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "이미지 서버에서 올바른 응답을 받지 못했습니다.");
    }

    String jobId = serverResponse.data().jobId();

    if (backgroundPromptId != null) {
      redisTemplate.opsForValue().set(
          "job:" + jobId,
          backgroundPromptId,
          Duration.ofMinutes(30)
      );
    }

    redisTemplate.opsForValue().set(
        "job_room:" + jobId,
        String.valueOf(roomId),
        Duration.ofMinutes(30)
    );

    return new ProcessingServerResponse(
        roomId,
        jobId,
        "이미지 서버로 전송 완료",
        String.format("서버 응답: %s (상태: %s)",
            "처리 요청이 성공적으로 접수되었습니다.", serverResponse.data().status())
    );
  }

  private ProcessingServerResponse handleFailureResponse(Exception e, String backgroundPromptId) {
    if (backgroundPromptId != null) {
      updatePromptStatus(Long.valueOf(backgroundPromptId), PromptStatus.FAIL);
    }

    throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
        "이미지 서버 전송 실패: " + e.getMessage());
  }

  public ImageProcessingResult getProcessingResult(String jobId) {
    String resultKey = "result:" + jobId;
    Map<Object, Object> resultData = redisTemplate.opsForHash().entries(resultKey);

    if (resultData.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "처리 결과를 찾을 수 없습니다.");
    }

    String status = (String) resultData.get("status");
    if ("SUCCESS".equals(status)) {
      return new ImageProcessingResult(
          jobId,
          status,
          (String) resultData.get("processed_image_url"),
          (String) resultData.get("person_ids"),
          null,
          null
      );
    } else {
      return new ImageProcessingResult(
          jobId,
          status,
          null,
          null,
          (String) resultData.get("error_code"),
          (String) resultData.get("error_message")
      );
    }
  }

  private RoomImageData extractAndValidateRoomData(Map<Object, Object> roomData) {
    String selectedImages = (String) roomData.get("selectedImages");
    String imageCount = (String) roomData.get("imageCount");
    String imageUrl = (String) roomData.get("image_url");
    String roomUsers = (String) roomData.get("users");
    String backgroundType = (String) roomData.get("background_type");

    String backgroundColor = (String) roomData.get("background_color");
    String backgroundPromptText = (String) roomData.get("background_prompt_text");
    String backgroundPromptId = (String) roomData.get("background_prompt_id");

    if (selectedImages == null || imageCount == null || imageUrl == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "선택된 이미지 정보가 없습니다.");
    }

    if (roomUsers == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "방 사용자 정보가 없습니다.");
    }

    if (backgroundType == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "배경 타입 정보가 없습니다.");
    }

    ProcessingOptions processingOptions;
    if ("color".equals(backgroundType)) {
      if (backgroundColor == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "배경 색상 정보가 없습니다.");
      }
      processingOptions = new ProcessingOptions("color", null, backgroundColor);
    } else if ("prompt".equals(backgroundType)) {
      if (backgroundPromptText == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "배경 프롬프트 정보가 없습니다.");
      }
      processingOptions = new ProcessingOptions("prompt", backgroundPromptText, null);
    } else {
      throw new ApiException(HttpStatus.BAD_REQUEST, "유효하지 않은 배경 타입입니다.");
    }

    List<String> personIds = Arrays.asList(roomUsers.split(","));

    return new RoomImageData(imageUrl, personIds, processingOptions, backgroundPromptId);
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
}