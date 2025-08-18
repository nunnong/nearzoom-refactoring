package com.ssafy.nearzoom.domain.myroom.controller;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoForFeedUploadResponse;
import com.ssafy.nearzoom.domain.myroom.service.MyRoomService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.DeleteApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.GetApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.PostApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/myroom")
@RequiredArgsConstructor
@Tag(name = "MyRoom API", description = "마이룸 사진 관리 API")
public class MyRoomController {

    private final MyRoomService myRoomService;

    @GetMapping("/photos")
    @Operation(
        summary = "사진 목록 조회",
        description = "마이룸 사진을 다양한 조건(좋아요, 날짜, 친구 등)으로 조회"
    )
    @GetApiResponses
    public MyPhotoListResponse getMyPhotos(
        Authentication authentication,
        @ModelAttribute MyPhotoListCondition condition
    ) {
        return myRoomService.getMyPhotos(authentication, condition);
    }

    @PostMapping("/photos/heart")
    @Operation(
        summary = "사진 좋아요 토글",
        description = "특정 사진에 좋아요 설정 및 해제"
    )
    @PostApiResponses
    public ResponseEntity<ApiResponse<String>> updateHeart(
        @RequestBody HeartUpdateRequest request,
        Authentication authentication
    ) {
        myRoomService.updateHeart(authentication, request);
        return ApiResponse.ok("하트 상태가 변경되었습니다.");
    }

    @DeleteMapping("/photos")
    @Operation(
        summary = "사진 삭제",
        description = "특정 사진을 마이룸에서 삭제"
    )
    @DeleteApiResponses
    public ResponseEntity<ApiResponse<String>> deletePhoto(
        @RequestBody PhotoDeleteRequest request,
        Authentication authentication
    ) {
        myRoomService.deletePhoto(authentication, request);
        return ApiResponse.ok("사진이 삭제되었습니다.");
    }

    @PostMapping("/photos/save-edited-url")
    @Operation(
        summary = "편집된 이미지 URL 저장",
        description = "편집된 이미지 URL을 받아서 photo, archive 테이블에 저장"
    )
    @PostApiResponses
    public ResponseEntity<ApiResponse<String>> saveEditedImageUrl(
        @RequestBody PhotoEditSaveRequest request,
        Authentication authentication
    ) {
        String savedUrl = myRoomService.saveEditedImageUrl(request, authentication);
        return ApiResponse.ok("편집된 이미지 URL이 저장되었습니다. URL: " + savedUrl);
    }

    @GetMapping("/photos/{photoId}/feed-upload-info")
    @Operation(
        summary = "피드 업로드용 사진 정보 조회",
        description = "마이룸 사진을 피드에 업로드하기 위한 기본 정보 조회"
    )
    @GetApiResponses
    public ResponseEntity<ApiResponse<PhotoForFeedUploadResponse>> getPhotoForFeedUpload(
        @PathVariable Long photoId,
        Authentication authentication
    ) {
        PhotoForFeedUploadResponse response = myRoomService.getPhotoForFeedUpload(photoId,
            authentication);
        return ApiResponse.ok(response);
    }
}