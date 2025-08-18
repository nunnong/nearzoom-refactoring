// FeedController.java - 마이룸 방식에 맞춘 무한 스크롤

package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.CreatePostFromMyRoomRequest;
import com.ssafy.nearzoom.domain.feed.dto.FeedSearchResponse;
import com.ssafy.nearzoom.domain.feed.dto.PostDetailResponse;
import com.ssafy.nearzoom.domain.feed.dto.PostListResponse;
import com.ssafy.nearzoom.domain.feed.dto.UpdatePostRequest;
import com.ssafy.nearzoom.domain.feed.service.FeedService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/feeds")
public class FeedController {

    private final FeedService feedService;

    @GetMapping("/explore")
    public ResponseEntity<ApiResponse<PostListResponse>> getExplorePosts(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) Long cursor) {
        return ApiResponse.ok(feedService.getRandomPosts(authentication, limit, cursor));
    }

    @GetMapping("/timeline")
    public ResponseEntity<ApiResponse<PostListResponse>> getTimelinePosts(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) Long cursor) {
        return ApiResponse.ok(feedService.getFollowingLatestPosts(authentication, limit, cursor));
    }

    @PostMapping("/posts/from-myroom")
    public ResponseEntity<ApiResponse<Long>> createPostFromMyRoom(
        Authentication authentication,
        @RequestBody CreatePostFromMyRoomRequest req) {
        return ApiResponse.create(feedService.createPostFromMyRoom(authentication, req));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPostDetail(
        Authentication authentication,
        @PathVariable Long postId) {
        return ApiResponse.ok(feedService.getPostDetail(authentication, postId));
    }

    @PutMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
        Authentication authentication,
        @PathVariable Long postId,
        @RequestBody UpdatePostRequest req) {
        feedService.updatePost(authentication, postId, req);
        return ApiResponse.ok();
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
        Authentication authentication,
        @PathVariable Long postId) {
        feedService.deletePost(authentication, postId);
        return ApiResponse.ok();
    }
    
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<FeedSearchResponse>> searchFeeds(
        Authentication authentication,
        @RequestParam String query,
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(required = false) Long cursor) {
        return ApiResponse.ok(feedService.searchFeeds(authentication, query, limit, cursor));
    }
}