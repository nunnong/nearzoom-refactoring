package com.ssafy.nearzoom.domain.photoPrompt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.FrameComposeRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ImageServerResponse;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import com.ssafy.nearzoom.domain.photoPrompt.entity.PromptStatus;
import com.ssafy.nearzoom.domain.photoPrompt.repository.PhotoPromptRepository;
import com.ssafy.nearzoom.domain.photoPrompt.repository.RedisPhotoPromptRepository;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
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
    private final RedisPhotoPromptRepository redisPromptRepository;
    private final PhotoPromptRepository photoPromptRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void processIndividualStart(Long roomId,
        String imageUrl, List<String> personIds, ProcessingOptions options,
        String promptId) {
        try {
            ImageServerRequest request = new ImageServerRequest(imageUrl, personIds, options);

            ImageServerResponse response = sendToImageServer("/jobs", request);

            String jobId = response.data().jobId();
            log.info("이미지 서버로부터 받은 JobId:{}", jobId);

            redisPromptRepository.saveIndividualJobInfo(jobId, roomId, imageUrl, options, promptId);

        } catch (Exception e) {
            log.error("개별 이미지 처리 실패 - RoomId: {}, Error: {}", roomId, e.getMessage());

          if (promptId != null) {
            updatePromptStatus(Long.valueOf(promptId), PromptStatus.FAIL);
          }
        }
    }

    public void IndividualCompleted(String jobId, String processedImageUrl) {
        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);

        Long roomId = Long.valueOf((String) jobInfo.get("room_id"));

        redisPromptRepository.saveIndividualCompletedInRoom("room:" + roomId, processedImageUrl);

        String promptId = (String) jobInfo.get("prompt_id");

        if (promptId != null) {
            updatePromptStatus(Long.valueOf(promptId), PromptStatus.SUCCESS);
        }

        checkAndStartFrameComposition(roomId);
    }

    private void checkAndStartFrameComposition(Long roomId) {
        String roomKey = "room:" + roomId;
        Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

        int totalImages = Integer.parseInt((String) roomData.get("total_images"));
        int completedImages = Integer.parseInt((String) roomData.get("completed_count"));

        log.info("개별 처리 진행률 확인 - RoomId: {}, Completed: {}/{}", roomId, completedImages,
            totalImages);

        if (completedImages == totalImages) {
            log.info("모든 개별 처리 완료 - 프레임 합성 시작 - RoomId: {}", roomId);
            startFrameComposition(roomId, roomData, totalImages);
        }
    }

    private void startFrameComposition(Long roomId, Map<Object, Object> roomData, int totalImages) {
        try {
            List<String> processedImageUrls = redisTemplate.opsForList()
                .range("room:" + roomId + ":processed_urls", 0, -1);

            String frameColor = (String) roomData.get("frame_color");

            FrameComposeRequest composeRequest = new FrameComposeRequest(
                processedImageUrls,
                frameColor
            );

            log.info("프레임 합성 요청 시작");

            ImageServerResponse response = sendToImageServer("/frame", composeRequest);

            String JobId = response.data().jobId();

            log.info("프레임 합성 요청 완료 - frame_job:{}", JobId);

            redisPromptRepository.saveFrameJobInfo(JobId, roomId, processedImageUrls, frameColor);
            redisPromptRepository.saveFinalInfoToRoom(JobId, roomId);
        } catch (Exception e) {
            log.error("프레임 합성 시작 실패 - RoomId: {}, Error: {}", roomId, e.getMessage());
            redisTemplate.opsForHash()
                .put("room:" + roomId, "photo_status", "frame_compose_failed");
            redisTemplate.opsForHash().put("room:" + roomId, "error_message",
                "프레임 합성 시작 실패: " + e.getMessage());
        }
    }

    public void FrameCompleted(String jobId, String finalImageUrl) {
        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);

        Long roomId = Long.valueOf((String) jobInfo.get("room_id"));

        redisPromptRepository.saveResultToRoom("room:" + roomId, finalImageUrl);
        log.info("프레임 합성 완료");
    }

    public ImageProcessingResult getProcessingResult(String roomId) {
        try {
            Long roomIdLong = Long.parseLong(roomId);

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

            String roomKey = "room:" + roomIdLong;
            Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

            if (roomData.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "처리 중인 작업을 찾을 수 없습니다.");
            }

            String status = (String) roomData.get("photo_status");
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

            String totalImagesStr = (String) roomData.get("total_images");
            String completedCountStr = (String) roomData.get("completed_individual_count");

            int totalImages = totalImagesStr != null ? Integer.parseInt(totalImagesStr) : 0;
            int completedImages =
                completedCountStr != null ? Integer.parseInt(completedCountStr) : 0;

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