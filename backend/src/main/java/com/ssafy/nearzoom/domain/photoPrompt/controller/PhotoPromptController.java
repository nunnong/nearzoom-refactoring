package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.BackgroundInfoRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.IndividualImageRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.PhotoSelectionRequest;
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
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/photoprompt")
@RequiredArgsConstructor
@Tag(name = "PhotoPrompt API", description = "개별 이미지 처리 및 프레임 합성")
public class PhotoPromptController {

  private final PhotoPromptService photoService;

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
      @RequestBody PhotoSelectionRequest selectionRequest) {

    try {
      photoService.saveBasicSettings(request, selectionRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", selectionRequest.roomId());
      responseData.put("frameColor", selectionRequest.frameColor());
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
        "backgroundType": "solid",
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
      @RequestBody IndividualImageRequest imageRequest) {

    try {
      photoService.saveIndividualImageBackground(request, imageRequest);

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
      Map<String, Object> status = photoService.getRoomStatus(roomId);

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
      Map<String, Object> progress = photoService.getProcessingProgress(roomId);

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
      ImageProcessingResult result = photoService.getProcessingResult(roomId);

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
      photoService.resetRoom(request, roomId);

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

//  // === 기존 호환성을 위한 엔드포인트들 ===
//
//  @PostMapping("/selection")
//  @Operation(summary = "사진 선택 및 순서 저장 (호환성)",
//      description = """
//      **⚠️ DEPRECATED**: 기존 방식의 엔드포인트입니다.
//
//      selectedCutIds와 cutCount는 무시되고, frameColor만 처리됩니다.
//      새로운 워크플로우에서는 `/basic-settings` 엔드포인트 사용을 권장합니다.
//
//      **요청 예시:**
//      ```json
//      {
//        "roomId": 123,
//        "selectedCutIds": [1, 3],  // 무시됨
//        "cutCount": 2,             // 무시됨
//        "frameColor": "#FFFFFF"
//      }
//      ```
//      """)
//  @PostApiResponses
//  public ResponseEntity<ApiResponse<Map<String, Object>>> savePhotoSelection(
//      HttpServletRequest request,
//      @RequestBody PhotoSelectionRequest selectionRequest) {
//
//    try {
//      // 기존 호환성: frameColor만 기본 설정으로 저장
//      photoService.saveBasicSettings(request, selectionRequest);
//
//      Map<String, Object> responseData = new HashMap<>();
//      responseData.put("roomId", selectionRequest.roomId());
//      responseData.put("frameColor", selectionRequest.frameColor());
//      responseData.put("savedAt", LocalDateTime.now().toString());
//      responseData.put("nextStep", "각 이미지별로 배경을 설정해주세요");
//      responseData.put("note", "기존 방식으로 처리됨. selectedCutIds와 cutCount는 무시됨");
//
//      return ResponseEntity.ok(new ApiResponse<>(false,
//          "기본 설정이 성공적으로 저장되었습니다. 이제 각 이미지의 배경을 설정해주세요.", responseData));
//
//    } catch (ApiException e) {
//      return ApiResponse.failedOf(e);
//    } catch (Exception e) {
//      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
//          "기본 설정 저장 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
//
//  @PostMapping("/background")
//  @Operation(summary = "배경 정보 저장 (호환성)",
//      description = """
//      **⚠️ DEPRECATED**: 기존 BackgroundInfoRequest를 새로운 IndividualImageRequest로 변환해서 처리합니다.
//
//      imageOrder는 0으로 고정되고, personIds는 빈 리스트로 설정됩니다.
//      새로운 `/image/background` 엔드포인트 사용을 권장합니다.
//
//      **요청 예시:**
//      ```json
//      {
//        "roomId": 123,
//        "imageUrl": "https://example.com/image.jpg",
//        "backgroundType": "solid",
//        "colorValue": "#FF5733"
//      }
//      ```
//      """)
//  @PostApiResponses
//  public ResponseEntity<ApiResponse<Map<String, Object>>> saveBackgroundInfo(
//      HttpServletRequest request,
//      @RequestBody BackgroundInfoRequest backgroundRequest) {
//
//    try {
//      // BackgroundInfoRequest를 IndividualImageRequest로 변환
//      IndividualImageRequest individualRequest = new IndividualImageRequest(
//          backgroundRequest.roomId(),
//          0, // 기존 방식에서는 순서가 없으므로 0으로 고정
//          backgroundRequest.imageUrl(),
//          List.of(), // 기존 방식에서는 personIds가 없으므로 빈 리스트
//          backgroundRequest.backgroundType(),
//          backgroundRequest.colorValue(),
//          backgroundRequest.promptText()
//      );
//
//      photoService.saveIndividualImageBackground(request, individualRequest);
//
//      Map<String, Object> responseData = new HashMap<>();
//      responseData.put("roomId", backgroundRequest.roomId());
//      responseData.put("backgroundType", backgroundRequest.backgroundType());
//      responseData.put("imageUrl", backgroundRequest.imageUrl());
//      responseData.put("savedAt", LocalDateTime.now().toString());
//      responseData.put("note", "기존 방식으로 처리되었습니다. imageOrder=0, personIds=빈리스트로 설정됨");
//
//      return ResponseEntity.ok(new ApiResponse<>(false,
//          "배경 정보가 저장되고 처리가 시작되었습니다.", responseData));
//
//    } catch (ApiException e) {
//      return ApiResponse.failedOf(e);
//    } catch (Exception e) {
//      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
//          "배경 정보 저장 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
//
//  @GetMapping("/result/job/{jobId}")
//  @Operation(summary = "Job ID로 결과 조회 (호환성)",
//      description = """
//      **⚠️ DEPRECATED**: 기존 jobId 방식의 결과 조회입니다.
//
//      roomId 방식 사용을 권장합니다: `/result/{roomId}`
//
//      **응답 예시:**
//      ```json
//      {
//        "jobId": "job_12345",
//        "status": "SUCCESS|PROCESSING|FAILED",
//        "processedImageUrl": "처리된 이미지 URL",
//        "note": "기존 jobId 방식으로 조회됨. roomId 방식 사용을 권장합니다."
//      }
//      ```
//      """)
//  @GetApiResponses
//  public ResponseEntity<ApiResponse<Map<String, Object>>> getProcessingResultByJobId(
//      @PathVariable String jobId) {
//
//    try {
//      // 기존 방식으로 시도 (하위 호환성)
//      ImageProcessingResult result = photoService.getProcessingResult(jobId);
//
//      Map<String, Object> responseData = new HashMap<>();
//      responseData.put("jobId", result.jobId());
//      responseData.put("status", result.status());
//      responseData.put("processedImageUrl", result.processedImageUrl());
//      responseData.put("personIds", result.personIds());
//      responseData.put("errorCode", result.errorCode());
//      responseData.put("errorMessage", result.errorMessage());
//      responseData.put("retrievedAt", LocalDateTime.now().toString());
//      responseData.put("note", "기존 jobId 방식으로 조회됨. roomId 방식 사용을 권장합니다.");
//
//      return ResponseEntity.ok(new ApiResponse<>(false,
//          "처리 결과 조회에 성공했습니다.", responseData));
//
//    } catch (ApiException e) {
//      return ApiResponse.failedOf(e);
//    } catch (Exception e) {
//      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
//          "처리 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
//    }
//  }
}