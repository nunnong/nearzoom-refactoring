package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.BasicSettingsRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.IndividualBackgroundRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photoPrompt.service.PhotoPromptService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.DeleteApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.GetApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.PostApiResponses;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/photoprompt")
@RequiredArgsConstructor
@Tag(name = "PhotoPrompt API", description = "개별 이미지 처리 및 프레임 합성")
public class PhotoPromptController {

    private final PhotoPromptService photoPromptService;

    @PostMapping("/selection")
    @Operation(summary = "기본 설정 저장",
        description = """
            **요청 예시:**
            ```json
            {
              "roomId": 123,
              "cutCount": 3,
              "frameColor": "#FFFFFF"
            }
            ```
            """)
    @PostApiResponses
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveBasicSettings(
        HttpServletRequest request,
        @RequestBody BasicSettingsRequest settingsRequest) {

        photoPromptService.saveBasicSettings(request, settingsRequest);

        return ResponseEntity.ok(new ApiResponse<>(false,
            "기본 설정이 성공적으로 저장되었습니다.",
            Map.of(
                "roomId", settingsRequest.roomId(),
                "cutCount", settingsRequest.cutCount(),
                "frameColor", settingsRequest.frameColor()
            )));
    }

    @PostMapping("/image/background")
    @Operation(summary = "개별 이미지 배경 설정",
        description = """
            **요청 예시:**
            ```json
            {
              "roomId": 123,
              "imageUrl": "https://example.com/image1.jpg",
              "personIds": [
                "https://storage.example.com/users/user1_profile.jpg",
                "https://storage.example.com/users/user2_profile.jpg", 
                "https://storage.example.com/users/user3_profile.jpg"
              ],
              "backgroundType": "color",
              "colorValue": "#FF5733"
            }
            
            {
              "roomId": 123,
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
            """)
    @PostApiResponses
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveIndividualImageBackground(
        HttpServletRequest request,
        @RequestBody IndividualBackgroundRequest imageRequest) {

        try {
            photoPromptService.saveIndividualImageBackground(request, imageRequest);

            return ResponseEntity.ok(new ApiResponse<>(false,
                "기본 설정이 성공적으로 저장되었습니다.",
                Map.of(
                    "roomId", imageRequest.roomId(),
                    "backgroundType", imageRequest.backgroundType(),
                    "personIds", imageRequest.personIds(),
                    "status", "이미지 서버로 전송 완료"
                )));

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