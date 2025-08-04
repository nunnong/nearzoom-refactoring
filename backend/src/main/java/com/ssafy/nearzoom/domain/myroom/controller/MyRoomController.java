package com.ssafy.nearzoom.domain.myroom.controller;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.service.MyRoomService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/myroom")
@RequiredArgsConstructor
public class MyRoomController {

    private final MyRoomService myRoomService;

    /**
     * 사진 조회 + 각종 필터(좋아요,친구,날짜 등 모든 조합) heart: Boolean(좋아요 여부) partnerEmails:comma-seperated(함께 찍은
     * 유저 이메일) startDate, endDate: YYYY-MM-DD 형식 cursor: Long(커서 기반 페이징) limit: Integer(페이지 크기별 개수
     * 제한)
     */
    @GetMapping("/photos")
    public MyPhotoListResponse getMyPhotos(
        Authentication authentication,
        @ModelAttribute MyPhotoListCondition condition
    ) {
        System.out.println(">>> [MyRoomController] partnerEmails = " + condition.partnerEmails());

        return myRoomService.getMyPhotos(authentication, condition);
    }

    @PostMapping("/photos/heart")
    public ResponseEntity<ApiResponse<String>> updateHeart(
        @RequestBody HeartUpdateRequest request,
        Authentication authentication
    ) {
        myRoomService.updateHeart(authentication, request);
        return ApiResponse.ok("하트 상태가 변경되었습니다.");
    }

    @DeleteMapping("/photos")
    public ResponseEntity<ApiResponse<String>> deletePhoto(
        @RequestBody PhotoDeleteRequest request,
        Authentication authentication
    ) {
        myRoomService.deletePhoto(authentication, request);
        return ApiResponse.ok("사진이 삭제되었습니다.");
    }

    @PostMapping("/photos/save-edited")
    public ResponseEntity<ApiResponse<String>> saveEditedPhoto(
        @RequestBody PhotoEditSaveRequest request,
        Authentication authentication
    ) {
        myRoomService.saveEditedPhoto(authentication, request);
        return ApiResponse.ok("수정본이 저장되었습니다.");
    }
}
