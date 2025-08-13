package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionFailedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.service.WebhookService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.PostApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhook API", description = "외부 이미지 처리 서비스 웹훅 처리")
public class WebhookController {

  private final WebhookService webhookService;

  @PostMapping("/image/individual/completed")
  @Operation(summary = "개별 이미지 처리 완료 웹훅",
      description = """
      외부 이미지 처리 서비스에서 개별 이미지 처리 완료 시 호출되는 웹훅입니다.
      
      **워크플로우:**
      1. 개별 이미지 처리 완료
      2. Photo 테이블에 개별 처리 결과 저장
      3. 완료 카운트 증가
      4. 모든 개별 처리 완료 시 자동으로 프레임 합성 시작
      
      **요청 예시:**
      ```json
      {
        "event": "image_processing_completed",
        "jobId": "job_1691745000123",
        "timestamp": "2024-08-11T10:30:00Z",
        "data": {
          "originalImageId": "img-001",
          "processedImageUrl": "https://cdn.example.com/processed/img-001.jpg",
          "personIds": ["person-1", "person-2"]
        }
      } 
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleIndividualImageCompleted(
      @RequestBody ImageProcessingCompletedWebhook webhook) {

    log.info("개별 이미지 처리 완료 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      webhookService.webhookIndividualCompleted(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("processedImageUrl", webhook.data() != null ? webhook.data().processedImageUrl() : null);
      responseData.put("processedAt", LocalDateTime.now().toString());
      responseData.put("nextStep", "개별 처리 완료. 모든 이미지 완료 시 자동으로 프레임 합성 시작");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "개별 이미지 처리 완료 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("개별 이미지 완료 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "개별 이미지 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/image/individual/failed")
  @Operation(summary = "개별 이미지 처리 실패 웹훅",
      description = """
      외부 이미지 처리 서비스에서 개별 이미지 처리 실패 시 호출되는 웹훅입니다.
      
      **처리 과정:**
      1. 개별 이미지 처리 실패
      2. 프롬프트 상태를 FAIL로 업데이트 (프롬프트인 경우)
      3. 실패 정보를 Redis에 저장
      
      **요청 예시:**
      ```json
      {
        "event": "image_processing_failed",
        "jobId": "job_1691745000123",
        "timestamp": "2024-08-11T10:30:00Z",
        "error": {
          "code": "PROCESSING_ERROR",
          "message": "이미지 처리 중 오류가 발생했습니다."
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleIndividualImageFailed(
      @RequestBody ImageProcessingFailedWebhook webhook) {

    log.warn("개별 이미지 처리 실패 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      webhookService.webhookIndividualFailed(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("errorCode", webhook.error() != null ? webhook.error().code() : null);
      responseData.put("errorMessage", webhook.error() != null ? webhook.error().message() : null);
      responseData.put("processedAt", LocalDateTime.now().toString());
      responseData.put("impact", "해당 이미지의 처리가 실패했습니다. 다른 이미지 처리는 계속됩니다.");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "개별 이미지 처리 실패 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("개별 이미지 실패 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "개별 이미지 실패 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/frame/completed")
  @Operation(summary = "프레임 합성 완료 웹훅",
      description = """
      외부 이미지 처리 서비스에서 프레임 합성 완료 시 호출되는 웹훅입니다.
      
      **워크플로우:**
      1. 모든 개별 이미지 처리 완료 후 자동으로 프레임 합성 시작
      2. 프레임 합성 완료
      3. Photo 테이블에 최종 합성 이미지 저장
      4. 전체 프로세스 완료
      
      **요청 예시:**
      ```json
      {
        "event": "frame_composition_completed",
        "jobId": "compose_1691745100456",
        "timestamp": "2024-08-11T10:35:00Z",
        "data": {
          "finalImageUrl": "https://cdn.example.com/final/composed-image.jpg",
          "individualImageUrls": [
            "https://cdn.example.com/processed/img-001.jpg",
            "https://cdn.example.com/processed/img-002.jpg"
          ],
          "frameInfo": {
            "color": "#FFFFFF",
            "layout": "2x1"
          }
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleFrameCompositionCompleted(
      @RequestBody FrameCompositionCompletedWebhook webhook) {

    log.info("프레임 합성 완료 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      webhookService.webhookFrameCompleted(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("finalImageUrl", webhook.data() != null ? webhook.data().finalImageUrl() : null);
      responseData.put("frameInfo", webhook.data() != null ? webhook.data().frameInfo() : null);
      responseData.put("processedAt", LocalDateTime.now().toString());
      responseData.put("status", "전체 프로세스 완료");
      responseData.put("result", "최종 합성 이미지가 생성되었습니다.");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "프레임 합성 완료 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("프레임 합성 완료 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "프레임 합성 완료 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/frame/failed")
  @Operation(summary = "프레임 합성 실패 웹훅",
      description = """
      외부 이미지 처리 서비스에서 프레임 합성 실패 시 호출되는 웹훅입니다.
      
      **처리 과정:**
      1. 프레임 합성 실패
      2. 방 상태를 실패로 업데이트
      3. 실패 정보를 Redis에 저장
      
      **요청 예시:**
      ```json
      {
        "event": "frame_composition_failed",
        "jobId": "compose_1691745100456",
        "timestamp": "2024-08-11T10:35:00Z",
        "error": {
          "code": "COMPOSITION_ERROR",
          "message": "프레임 합성 중 오류가 발생했습니다."
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleFrameCompositionFailed(
      @RequestBody FrameCompositionFailedWebhook webhook) {

    log.warn("프레임 합성 실패 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      webhookService.webhookFrameFailed(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("errorCode", webhook.error() != null ? webhook.error().code() : null);
      responseData.put("errorMessage", webhook.error() != null ? webhook.error().message() : null);
      responseData.put("processedAt", LocalDateTime.now().toString());
      responseData.put("status", "프레임 합성 실패");
      responseData.put("impact", "개별 이미지들은 처리되었지만 최종 합성에 실패했습니다.");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "프레임 합성 실패 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("프레임 합성 실패 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "프레임 합성 실패 웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // === 기존 호환성을 위한 엔드포인트들 ===

  @PostMapping("/image-processing/completed")
  @Operation(summary = "이미지 처리 완료 웹훅 (호환성)",
      description = """
      **⚠️ DEPRECATED**: 기존 방식의 웹훅 엔드포인트입니다.
      
      개별 이미지 처리 완료 웹훅으로 처리됩니다.
      새로운 `/image/individual/completed` 엔드포인트 사용을 권장합니다.
      
      **기존 요청 예시:**
      ```json
      {
        "event": "image_processing_completed",
        "jobId": "job-12345",
        "timestamp": "2024-08-11T10:30:00Z",
        "data": {
          "originalImageId": "img-001",
          "processedImageUrl": "https://cdn.example.com/processed/img-001.jpg",
          "personIds": ["person-1", "person-2"]
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleImageProcessingCompleted(
      @RequestBody ImageProcessingCompletedWebhook webhook) {

    log.info("기존 방식 이미지 처리 완료 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      // 기존 방식도 개별 처리로 처리 (하위 호환성)
      webhookService.webhookIndividualCompleted(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("timestamp", webhook.timestamp());
      responseData.put("processedImageUrl", webhook.data() != null ? webhook.data().processedImageUrl() : null);
      responseData.put("status", "SUCCESS");
      responseData.put("note", "기존 방식으로 처리됨. 개별 처리 웹훅 사용을 권장합니다.");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "이미지 처리 완료 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("기존 방식 이미지 완료 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/image-processing/failed")
  @Operation(summary = "이미지 처리 실패 웹훅 (호환성)",
      description = """
      **⚠️ DEPRECATED**: 기존 방식의 웹훅 엔드포인트입니다.
      
      개별 이미지 처리 실패 웹훅으로 처리됩니다.
      새로운 `/image/individual/failed` 엔드포인트 사용을 권장합니다.
      
      **기존 요청 예시:**
      ```json
      {
        "event": "image_processing_failed",
        "jobId": "job-12345",
        "timestamp": "2024-08-11T10:30:00Z",
        "error": {
          "code": "PROCESSING_ERROR",
          "message": "이미지 처리 중 오류가 발생했습니다."
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> handleImageProcessingFailed(
      @RequestBody ImageProcessingFailedWebhook webhook) {

    log.warn("기존 방식 이미지 처리 실패 웹훅 수신 - JobId: {}", webhook.jobId());

    try {
      // 기존 방식도 개별 처리로 처리 (하위 호환성)
      webhookService.webhookIndividualFailed(webhook);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", webhook.jobId());
      responseData.put("event", webhook.event());
      responseData.put("timestamp", webhook.timestamp());
      responseData.put("errorCode", webhook.error() != null ? webhook.error().code() : null);
      responseData.put("errorMessage", webhook.error() != null ? webhook.error().message() : null);
      responseData.put("status", "FAILED");
      responseData.put("note", "기존 방식으로 처리됨. 개별 처리 웹훅 사용을 권장합니다.");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "이미지 처리 실패 웹훅이 성공적으로 처리되었습니다.", responseData));

    } catch (Exception e) {
      log.error("기존 방식 이미지 실패 웹훅 처리 실패 - JobId: {}, Error: {}", webhook.jobId(), e.getMessage());
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "웹훅 처리 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/health")
  @Operation(summary = "웹훅 서비스 상태 확인",
      description = """
      웹훅 서비스의 상태를 확인하고 지원되는 웹훅 목록을 반환합니다.
      
      **응답 예시:**
      ```json
      {
        "status": "healthy",
        "timestamp": "2024-08-11T10:30:00",
        "supportedWebhooks": {
          "new_endpoints": [
            "/webhooks/image/individual/completed - 개별 이미지 처리 완료",
            "/webhooks/image/individual/failed - 개별 이미지 처리 실패",
            "/webhooks/frame/completed - 프레임 합성 완료",
            "/webhooks/frame/failed - 프레임 합성 실패"
          ],
          "legacy_endpoints": [
            "/webhooks/image-processing/completed - 기존 방식 (호환성)",
            "/webhooks/image-processing/failed - 기존 방식 (호환성)"
          ]
        },
        "workflow": {
          "step1": "개별 이미지 처리 (individual 웹훅)",
          "step2": "모든 개별 처리 완료 후 자동으로 프레임 합성 시작",
          "step3": "프레임 합성 완료 (composition 웹훅)",
          "result": "Photo 테이블에 개별 및 최종 합성 이미지 저장"
        }
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
    Map<String, Object> responseData = new HashMap<>();
    responseData.put("status", "healthy");
    responseData.put("timestamp", LocalDateTime.now().toString());
    responseData.put("supportedWebhooks", Map.of(
        "new_endpoints", List.of(
            "/webhooks/image/individual/completed - 개별 이미지 처리 완료",
            "/webhooks/image/individual/failed - 개별 이미지 처리 실패",
            "/webhooks/frame/completed - 프레임 합성 완료",
            "/webhooks/frame/failed - 프레임 합성 실패"
        ),
        "legacy_endpoints", List.of(
            "/webhooks/image-processing/completed - 기존 방식 (호환성)",
            "/webhooks/image-processing/failed - 기존 방식 (호환성)"
        )
    ));
    responseData.put("workflow", Map.of(
        "step1", "개별 이미지 처리 (individual 웹훅)",
        "step2", "모든 개별 처리 완료 후 자동으로 프레임 합성 시작",
        "step3", "프레임 합성 완료 (composition 웹훅)",
        "result", "Photo 테이블에 개별 및 최종 합성 이미지 저장"
    ));
    responseData.put("changes", Map.of(
        "removed", "selectedCutIds, cutCount 사전 정의 불필요",
        "added", "동적 이미지 수 관리, 자동 프레임 합성 트리거, person_ids 프론트 전송",
        "improved", "유연한 이미지 순서, 실시간 처리 시작"
    ));

    return ResponseEntity.ok(new ApiResponse<>(false,
        "웹훅 서비스가 정상적으로 작동 중입니다.", responseData));
  }
}