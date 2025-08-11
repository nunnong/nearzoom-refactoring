package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.CreateFeedRequest;
import com.ssafy.nearzoom.domain.feed.dto.FeedDetailResponse;
import com.ssafy.nearzoom.domain.feed.service.FeedService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/feeds")
public class FeedController {

    private final FeedService feedService;

    @PostMapping
    public ResponseEntity<ApiResponse<Long>> create(Authentication authentication,
        @RequestBody CreateFeedRequest req) {
        return ApiResponse.create(feedService.create(authentication, req));
    }

    @GetMapping("/{feedId}")
    public ResponseEntity<ApiResponse<FeedDetailResponse>> detailFeeds(
        Authentication authentication,
        @PathVariable Long feedId) {
        return ApiResponse.ok(feedService.detailFeeds(authentication, feedId));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<List<FeedDetailResponse>>> userFeeds(
        Authentication authentication,
        @PathVariable Long userId,
        @RequestParam(required = false) LocalDateTime cursorCreatedAt,
        @RequestParam(required = false) Long cursorId,
        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(
            feedService.userFeed(authentication, userId, cursorCreatedAt, cursorId, size)
        );
    }

    @GetMapping("/following")
    public ResponseEntity<ApiResponse<List<FeedDetailResponse>>> followingFeeds(
        Authentication authentication,
        @RequestParam(required = false) LocalDateTime cursorCreatedAt,
        @RequestParam(required = false) Long cursorId,
        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(
            feedService.followingFeed(authentication, cursorCreatedAt, cursorId, size)
        );
    }

    @GetMapping("/random")
    public ResponseEntity<ApiResponse<List<FeedDetailResponse>>> random(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(
            feedService.randomFeed(authentication, size)
        );
    }
}
