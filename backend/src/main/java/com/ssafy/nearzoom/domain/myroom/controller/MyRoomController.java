package com.ssafy.nearzoom.domain.myroom.controller;

import com.ssafy.nearzoom.domain.myroom.dto.*;
import com.ssafy.nearzoom.domain.myroom.service.MyRoomService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoForFeedUploadResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.DeleteApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.GetApiResponses;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.PostApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/myroom")
@RequiredArgsConstructor
@Tag(name = "MyRoom API", description = "마이룸 사진 관리 API")
public class MyRoomController {

    private final MyRoomService myRoomService;

    /**
     * 사진 조회 + 각종 필터(좋아요,친구,날짜 등 모든 조합)
     */
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

    @PostMapping("/photos/save-edited")
    @Operation(
            summary = "수정본 저장",
            description = "편집본 저장, 원본은 수정 불가 상태로 전환"
    )
    @PostApiResponses
    public ResponseEntity<ApiResponse<String>> saveEditedPhoto(
            @RequestBody PhotoEditSaveRequest request,
            Authentication authentication
    ) {
        myRoomService.saveEditedPhoto(authentication, request);
        return ApiResponse.ok("수정본이 저장되었습니다.");
    }

    @PostMapping("/photos/save-edited-url")
    @Operation(
            summary = "편집된 이미지 URL 저장",
            description = "편집된 이미지 URL을 받아서 photo, archive 테이블에 저장"
    )
    @PostApiResponses
    public ResponseEntity<ApiResponse<String>> saveEditedImageUrl(
            @RequestParam("imageUrl") String imageUrl,
            @RequestParam("originalPhotoId") Long originalPhotoId,
            Authentication authentication
    ) {
        String savedUrl = myRoomService.saveEditedImageUrl(imageUrl, originalPhotoId, authentication);
        return ApiResponse.ok("편집된 이미지 URL이 저장되었습니다. URL: " + savedUrl);
    }

    /**
     * 🆕 마이룸 사진을 피드 게시물로 업로드하기 위한 정보 조회
     */
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
        PhotoForFeedUploadResponse response = myRoomService.getPhotoForFeedUpload(photoId, authentication);
        return ApiResponse.ok(response);
    }
}