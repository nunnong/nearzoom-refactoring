package com.ssafy.nearzoom.domain.myroom.controller;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/myroom")
@RequiredArgsConstructor
@Tag(name = "MyRoom API", description = "마이룸 사진 관리 API")
public class MyRoomController {

    private final MyRoomService myRoomService;

    /**
     * 사진 조회 + 각종 필터(좋아요,친구,날짜 등 모든 조합) heart: Boolean(좋아요 여부) partnerEmails:comma-seperated(함께 찍은
     * 유저 이메일) startDate, endDate: YYYY-MM-DD 형식 cursor: Long(커서 기반 페이징) limit: Integer(페이지 크기별 개수
     * 제한)
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

    @PostMapping("/photos/upload-edited")
    @Operation(
        summary = "편집된 이미지 업로드",
        description = "편집된 이미지를 업로드하고 my_photo 테이블에 저장"
    )
    @PostApiResponses
    public ResponseEntity<ApiResponse<String>> uploadEditedImage(
        @RequestParam("file") MultipartFile file,
        @RequestParam("originalPhotoId") Long originalPhotoId,
        @RequestParam(value = "description", required = false) String description,
        Authentication authentication
    ) {
        String uploadedUrl = myRoomService.uploadEditedImage(file, originalPhotoId, authentication, description);
        return ApiResponse.ok("편집된 이미지가 업로드되었습니다. URL: " + uploadedUrl);
    }
}
