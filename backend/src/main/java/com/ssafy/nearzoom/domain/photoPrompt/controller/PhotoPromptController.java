package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.IndividualBackgroundRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.service.PhotoPromptService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/photoprompt")
@RequiredArgsConstructor
@Tag(name = "PhotoPrompt API", description = "개별 이미지 처리 및 프레임 합성")
public class PhotoPromptController {

  private final PhotoPromptService photoPromptService;

  @PostMapping("/selection")
  @Operation(summary = "기본 설정 저장 (선택적)",
      description = """
      프레임 색상 등 기본 설정을 저장합니다. 선택적으로 호출할 수 있습니다.
      
      **요청 예시:**
      ```json
      {
        "roomId": 123,
        "frameColor": "#FFFFFF"
      }
      ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> saveBasicSettings(
      HttpServletRequest request,
      @RequestBody Map<String, Object> body) {

    try {
      Long roomId = Long.valueOf(body.get("roomId").toString());
      String frameColor = body.get("frameColor").toString();
      int cutCount = Integer.parseInt(body.get("cutCount").toString());

      photoPromptService.saveBasicSettings(request, roomId, cutCount, frameColor);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("cutCount", cutCount);
      responseData.put("frameColor", frameColor);
      responseData.put("savedAt", LocalDateTime.now().toString());
      responseData.put("nextStep", "각 이미지별로 배경을 설정해주세요");

      return ResponseEntity.ok(new ApiResponse<>(false,
          "기본 설정이 성공적으로 저장되었습니다. 이제 이미지별로 배경을 설정해주세요.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "기본 설정 저장 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/image/background")
  @Operation(summary = "개별 이미지 배경 설정",
      description = """
      각 이미지별로 개별적으로 배경을 설정합니다.
      설정 완료 즉시 이미지 서버로 전송되며, 이미지 순서와 개수가 동적으로 관리됩니다.
      
      **backgroundType별 필수 필드:**
      - `solid`: colorValue 필수, promptText 무시
      - `prompt`: promptText 필수, colorValue 무시
      
      **요청 예시:**
      ```json
      // 첫 번째 이미지 - 단색 배경
      {
        "roomId": 123,
        "imageOrder": 0,
        "imageUrl": "https://example.com/image1.jpg",
        "personIds": [
          "https://storage.example.com/users/user1_profile.jpg",
          "https://storage.example.com/users/user2_profile.jpg", 
          "https://storage.example.com/users/user3_profile.jpg"
        ],
        "backgroundType": "color",
        "colorValue": "#FF5733"
      }
      
      // 두 번째 이미지 - 프롬프트 배경
      {
        "roomId": 123,
        "imageOrder": 1,
        "imageUrl": "https://example.com/image2.jpg",
        "personIds": [
          "https://storage.example.com/users/user1_profile.jpg",
          "https://storage.example.com/users/user2_profile.jpg", 
          "https://storage.example.com/users/user3_profile.jpg"
        ],
        "backgroundType": "prompt",
        "promptText": "아름다운 벚꽃 풍경"
      }
      ```
      
      **주요 특징:**
      - 이미지 순서는 연속적이지 않아도 됩니다 (0, 2, 1 순서도 가능)
      - personIds는 프론트에서 전달하며, 개별 이쁜사진 URL들입니다
      - 각 이미지 설정 시 즉시 개별 처리가 시작됩니다
      - 모든 개별 처리 완료 시 자동으로 프레임 합성이 시작됩니다
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> saveIndividualImageBackground(
      HttpServletRequest request,
      @RequestBody IndividualBackgroundRequest imageRequest) {

    try {
      photoPromptService.saveIndividualImageBackground(request, imageRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", imageRequest.roomId());
      responseData.put("imageOrder", imageRequest.imageOrder());
      responseData.put("backgroundType", imageRequest.backgroundType());
      responseData.put("personIds", imageRequest.personIds());
      responseData.put("savedAt", LocalDateTime.now().toString());
      responseData.put("status", "이미지 서버로 전송 완료");

      if ("prompt".equals(imageRequest.backgroundType())) {
        responseData.put("promptText", imageRequest.promptText());
      } else {
        responseData.put("colorValue", imageRequest.colorValue());
      }

      return ResponseEntity.ok(new ApiResponse<>(false,
          "이미지 배경 설정이 저장되고 처리가 시작되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "배경 설정 저장 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/room/{roomId}/status")
  @Operation(summary = "방 상태 조회",
      description = """
      방의 현재 설정 상태를 조회합니다.
      
      **응답 예시:**
      ```json
      {
        "roomId": 123,
        "status": "basic_settings_saved|frame_composing|all_completed",
        "totalImages": 2,
        "configurationProgress": {
          "total": 2,
          "configured": 2,
          "isComplete": true
        },
        "imageConfigurations": {
          "image_0": {
            "hasImageUrl": true,
            "hasBackgroundType": true,
            "backgroundType": "solid"
          },
          "image_1": {
            "hasImageUrl": true,
            "hasBackgroundType": true,
            "backgroundType": "prompt",
            "promptId": "456"
          }
        }
      }
      ```
      """)
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getRoomStatus(
      @PathVariable Long roomId) {

    try {
      Map<String, Object> status = photoPromptService.getRoomStatus(roomId);

      return ResponseEntity.ok(new ApiResponse<>(false,
          "방 상태 조회에 성공했습니다.", status));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 상태 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/room/{roomId}/progress")
  @Operation(summary = "처리 진행률 조회",
      description = """
      이미지 처리 및 합성 진행률을 조회합니다.
      
      **응답 예시:**
      ```json
      {
        "status": "frame_composing",
        "totalImages": 2,
        "completedImages": 2,
        "progressPercentage": 100,
        "message": "개별 처리 완료, 최종 합성 중...",
        "composeJobId": "compose_1691745100456"
      }
      ```
      """)
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getProcessingProgress(
      @PathVariable Long roomId) {

    try {
      Map<String, Object> progress = photoPromptService.getProcessingProgress(roomId);

      return ResponseEntity.ok(new ApiResponse<>(false,
          "처리 진행률 조회에 성공했습니다.", progress));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "처리 진행률 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/result/{roomId}")
  @Operation(summary = "최종 결과 조회",
      description = """
      최종 처리 결과를 조회합니다. roomId로 조회합니다.
      
      **응답 예시:**
      ```json
      {
        "roomId": "123",
        "status": "SUCCESS|PROCESSING|FAILED",
        "processedImageUrl": "최종 합성된 이미지 URL",
        "progressInfo": "진행률 정보 (PROCESSING인 경우)",
        "errorCode": "오류 코드 (FAILED인 경우)",
        "errorMessage": "오류 메시지 (FAILED인 경우)"
      }
      ```
      """)
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getProcessingResult(
      @PathVariable String roomId) {

    try {
      ImageProcessingResult result = photoPromptService.getProcessingResult(roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("status", result.status());
      responseData.put("processedImageUrl", result.processedImageUrl());
      responseData.put("progressInfo", result.personIds()); // 진행률 정보로 재활용
      responseData.put("errorCode", result.errorCode());
      responseData.put("errorMessage", result.errorMessage());
      responseData.put("retrievedAt", LocalDateTime.now().toString());

      String message = switch (result.status()) {
        case "SUCCESS" -> "처리가 완료되었습니다.";
        case "PROCESSING" -> "처리가 진행 중입니다.";
        case "FAILED" -> "처리 중 오류가 발생했습니다.";
        default -> "알 수 없는 상태입니다.";
      };

      return ResponseEntity.ok(new ApiResponse<>(false, message, responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "처리 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @DeleteMapping("/room/{roomId}/reset")
  @Operation(summary = "방 초기화",
      description = """
      방의 모든 설정을 초기화하고 진행 중인 작업을 중단합니다.
      
      **응답 예시:**
      ```json
      {
        "roomId": 123,
        "resetAt": "2024-08-11T10:40:00"
      }
      ```
      """)
  @DeleteApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> resetRoom(
      HttpServletRequest request,
      @PathVariable Long roomId) {

    try {
      photoPromptService.resetRoom(request, roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("resetAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false,
          "방이 성공적으로 초기화되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 초기화 중 오류가 발생했습니다: " + e.getMessage());
    }
  }
}