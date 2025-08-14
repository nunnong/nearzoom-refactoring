package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.*;
import com.ssafy.nearzoom.domain.feed.service.FeedService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/feeds")
public class FeedController {

    private final FeedService feedService;

    // =========================================
    // 📱 EXPLORE: 모든 게시물 탐색
    // =========================================

    /**
     * 🌍 Explore: 모든 사용자의 게시물 랜덤 조회
     */
    @GetMapping("/explore")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getExplorePosts(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(feedService.getRandomPosts(authentication, size));
    }

    // =========================================
    // 📰 TIMELINE: 팔로잉 피드
    // =========================================

    /**
     * 📰 Timeline: 팔로잉하는 사용자들의 최신 게시물들 조회
     */
    @GetMapping("/timeline")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getTimelinePosts(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(feedService.getFollowingLatestPosts(authentication, size));
    }

    // =========================================
    // 👤 USER FEED: 특정 사용자 피드 조회
    // =========================================

    /**
     * 👤 특정 사용자의 피드 조회 (게시물 포함) - 읽기 권한
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<FeedWithPostsResponse>> getUserFeed(
        Authentication authentication,
        @PathVariable Long userId) {
        return ApiResponse.ok(feedService.getUserFeedWithPosts(authentication, userId));
    }

    /**
     * 👤 계정명으로 사용자 피드 조회 (게시물 포함) - 읽기 권한
     */
    @GetMapping("/users/account/{accountName}")
    public ResponseEntity<ApiResponse<FeedWithPostsResponse>> getUserFeedByAccountName(
        Authentication authentication,
        @PathVariable String accountName) {
        return ApiResponse.ok(feedService.getUserFeedByAccountName(authentication, accountName));
    }

    // =========================================
    // 📝 POST MANAGEMENT: 게시물 관리
    // =========================================

    /**
     * 📝 마이룸 사진으로 피드에 게시물 추가
     */
    @PostMapping("/posts/from-myroom")
    public ResponseEntity<ApiResponse<Long>> createPostFromMyRoom(
        Authentication authentication,
        @RequestBody CreatePostFromMyRoomRequest req) {
        return ApiResponse.create(feedService.createPostFromMyRoom(authentication, req));
    }

    /**
     * 📄 게시물 상세 조회 (단일 게시물)
     */
    @GetMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPostDetail(
        Authentication authentication,
        @PathVariable Long postId) {
        return ApiResponse.ok(feedService.getPostDetail(authentication, postId));
    }

    /**
     * ✏️ 게시물 수정 (캡션)
     */
    @PutMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
        Authentication authentication,
        @PathVariable Long postId,
        @RequestBody UpdatePostRequest req) {
        feedService.updatePost(authentication, postId, req);
        return ApiResponse.ok();
    }

    /**
     * 🗑️ 게시물 삭제
     */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
        Authentication authentication,
        @PathVariable Long postId) {
        feedService.deletePost(authentication, postId);
        return ApiResponse.ok();
    }

    // =========================================
    // 🔍 SEARCH: 피드/사용자 검색
    // =========================================

    /**
     * 🔍 피드 검색 (사용자 검색)
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FeedWithPostsResponse>>> searchFeeds(
        Authentication authentication,
        @RequestParam String query,
        @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(feedService.searchFeeds(authentication, query, size));
    }


}