package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.FeedDetailResponse;
import com.ssafy.nearzoom.domain.feed.service.FeedService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/feeds")
public class FeedController {

    private final FeedService feedService;

    @PostMapping("{photoId}")
    public ResponseEntity<ApiResponse<FeedDetailResponse>> createFeed(
        Authentication authentication,
        @PathVariable Long photoId) {
        FeedDetailResponse created = feedService.create(authentication, photoId);
        return ApiResponse.create(created);
    }

    @GetMapping("/{feedId}")
    public ResponseEntity<ApiResponse<FeedDetailResponse>> getDetail(@PathVariable Long feedId) {
        return ApiResponse.ok(feedService.getDetail(feedId));
    }

    @DeleteMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication,
        @PathVariable Long feedId) {
        feedService.delete(authentication, feedId);
        return ApiResponse.ok();
    }
}
