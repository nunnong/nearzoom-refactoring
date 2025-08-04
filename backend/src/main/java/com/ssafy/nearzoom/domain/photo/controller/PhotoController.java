package com.ssafy.nearzoom.domain.photo.controller;

import com.ssafy.nearzoom.domain.photo.dto.imageInfo.BackgroundInfoRequest;
import com.ssafy.nearzoom.domain.photo.dto.imageInfo.PhotoSelectionRequest;
import com.ssafy.nearzoom.domain.photo.dto.imageServer.ProcessingServerResponse;
import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
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
@RequestMapping("/photo")
@RequiredArgsConstructor
public class PhotoController {

  private final PhotoService photoService;

  @PostMapping("/selection")
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