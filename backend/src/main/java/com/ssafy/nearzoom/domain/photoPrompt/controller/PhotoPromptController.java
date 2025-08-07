package com.ssafy.nearzoom.domain.photoPrompt.controller;

import com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo.BackgroundInfoRequest;
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
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/photoprompt")
@RequiredArgsConstructor
@Tag(name = "PhotoPrompt API", description = "컷, 배경 저장 및 이미지 서버로 요청")
public class PhotoPromptController {

  private final PhotoPromptService photoService;

  @PostMapping("/selection")
  @Operation(summary = "컷 정보 저장", description = "선택한 컷 순서 저장")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> savePhotoSelection(
      HttpServletRequest request,
      @RequestBody PhotoSelectionRequest selectionRequest) {

    try {
      photoService.savePhotoSelection(request, selectionRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", selectionRequest.roomId());
      responseData.put("cutCount", selectionRequest.cutCount());
      responseData.put("selectedCutIds", selectionRequest.selectedCutIds());
      responseData.put("savedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "사진 선택이 성공적으로 저장되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "사진 선택 저장 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/background")
  @Operation(summary = "배경 정보 저장", description = "배경 및 증강용 프롬프트 저장" +
      """
      사진의 배경을 설정합니다.
      
              **backgroundType별 필수 필드:**
              - `solid`: colorValue 필수, promptText 무시
              - `prompt`: promptText 필수, colorValue 무시
      
              **예시 요청:**
              ```json
              // 단색 배경
              {
                "roomId": 123,
                "backgroundType": "solid",
                "colorValue": "#FF5733",
                "imageUrl": "https://example.com/image.jpg"
              }
      
              // 프롬프트 배경
              {
                "roomId": 123,
                "backgroundType": "prompt",
                "promptText": "아름다운 벚꽃 풍경",
                "imageUrl": "https://example.com/image.jpg"
              }
              ```
      """)
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> saveBackgroundInfo(
      HttpServletRequest request,
      @RequestBody BackgroundInfoRequest backgroundRequest) {

    try {
      photoService.saveBackgroundInfo(request, backgroundRequest); // void 그대로 사용

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", backgroundRequest.roomId());
      responseData.put("backgroundType", backgroundRequest.backgroundType());
      responseData.put("imageUrl", backgroundRequest.imageUrl());
      responseData.put("savedAt", LocalDateTime.now().toString());
      // jobId 관련 정보는 제외

      return ResponseEntity.ok(new ApiResponse<>(false, "배경 정보가 저장되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "배경 정보 저장 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/result/{jobId}")
  @Operation(summary = "처리 결과 조회", description = "이미지 처리 결과 조회")
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getProcessingResult(
      @PathVariable String jobId) {

    try {
      ImageProcessingResult result = photoService.getProcessingResult(jobId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("jobId", result.jobId());
      responseData.put("status", result.status());
      responseData.put("processedImageUrl", result.processedImageUrl());
      responseData.put("personIds", result.personIds());
      responseData.put("errorCode", result.errorCode());
      responseData.put("errorMessage", result.errorMessage());
      responseData.put("retrievedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "처리 결과 조회에 성공했습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "처리 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }
}