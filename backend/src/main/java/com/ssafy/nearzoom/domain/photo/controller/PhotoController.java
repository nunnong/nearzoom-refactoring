package com.ssafy.nearzoom.domain.photo.controller;

import com.ssafy.nearzoom.domain.photo.dto.imageInfo.BackgroundInfoRequest;
import com.ssafy.nearzoom.domain.photo.dto.imageInfo.PhotoSelectionRequest;
import com.ssafy.nearzoom.domain.photo.dto.webhook.ImageProcessingResult;
import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
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
  public ResponseEntity<String> savePhotoSelection(
      HttpServletRequest request,
      @RequestBody PhotoSelectionRequest selectionRequest) {

    photoService.savePhotoSelection(request, selectionRequest);
    return ResponseEntity.ok("사진 선택이 저장되었습니다.");
  }

  @PostMapping("/background")
  public ResponseEntity<String> saveBackgroundInfo(
      HttpServletRequest request,
      @RequestBody BackgroundInfoRequest backgroundRequest) {

    photoService.saveBackgroundInfo(request, backgroundRequest);
    return ResponseEntity.ok("배경 정보가 저장되었습니다.");
  }

  @GetMapping("/result/{jobId}")
  public ResponseEntity<ImageProcessingResult> getProcessingResult(
      @PathVariable String jobId) {

    ImageProcessingResult result = photoService.getProcessingResult(jobId);
    return ResponseEntity.ok(result);
  }
}