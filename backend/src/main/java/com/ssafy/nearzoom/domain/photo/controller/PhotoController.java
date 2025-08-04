package com.ssafy.nearzoom.domain.photo.controller;

import com.ssafy.nearzoom.domain.photo.dto.imageInfo.BackgroundInfoRequest;
import com.ssafy.nearzoom.domain.photo.dto.imageInfo.PhotoSelectionRequest;
import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
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
  public ResponseEntity<ApiResponse<Void>> savePhotoSelection(
      HttpServletRequest request,
      @RequestBody PhotoSelectionRequest selectionRequest) {

    try {
      photoService.savePhotoSelection(request, selectionRequest);
      return ApiResponse.ok("사진 선택이 저장되었습니다.", null);
    } catch (IllegalArgumentException e) {
      return ApiResponse.failedOf(HttpStatus.BAD_REQUEST, e.getMessage());
    }
  }

  @PostMapping("/background")
  public ResponseEntity<ApiResponse<Void>> saveBackgroundInfo(
      HttpServletRequest request,
      @RequestBody BackgroundInfoRequest backgroundRequest) {

    try {
      photoService.saveBackgroundInfo(request, backgroundRequest);
      return ApiResponse.ok("배경 정보가 저장되었습니다.", null);
    } catch (IllegalArgumentException e) {
      return ApiResponse.failedOf(HttpStatus.BAD_REQUEST, e.getMessage());
    }
  }

  @GetMapping("/result/{jobId}")
  public ResponseEntity<ApiResponse<ImageProcessingResult>> getProcessingResult(
      @PathVariable String jobId) {

    try {
      ImageProcessingResult result = photoService.getProcessingResult(jobId);
      return ApiResponse.ok("처리 결과 조회 성공", result);
    } catch (IllegalArgumentException e) {
      return ApiResponse.failedOf(HttpStatus.BAD_REQUEST, e.getMessage());
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.NOT_FOUND, "처리 결과를 찾을 수 없습니다.");
    }
  }
}