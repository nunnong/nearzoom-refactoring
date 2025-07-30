package com.ssafy.nearzoom.domain.myroom.controller;

import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.service.MyRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/myroom")
@RequiredArgsConstructor
public class MyRoomController {

    private final MyRoomService myRoomService;

    /**
     * 사진 조회 + 각종 필터(좋아요,친구,날짜 등 모든 조합) liked: Boolean(좋아요 여부) partnerEmails:comma-seperated(함께 찍은
     * 유저 이메일) startDate, endDate: YYYY-MM-DD 형식 cursor: Long(커서 기반 페이징) limit: Integer(페이지 크기별 개수
     * 제한)
     */
    @GetMapping("/photos")
    public MyPhotoListResponse getMyPhotos(
        Authentication authentication,
        @ModelAttribute MyPhotoListCondition condition
    ) {
        return myRoomService.getMyPhotos(authentication, condition);
    }
}
