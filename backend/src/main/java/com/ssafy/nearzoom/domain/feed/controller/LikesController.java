package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.service.LikesService;
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
@RequestMapping("/likes")
public class LikesController {

    private final LikesService likesService;

    @PostMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> likePost(Authentication authentication,
        @PathVariable Long postId) {
        likesService.likePost(authentication, postId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> unlikePost(Authentication authentication,
        @PathVariable Long postId) {
        likesService.unlikePost(authentication, postId);
        return ApiResponse.ok();
    }

    @GetMapping("/posts/{postId}/check")
    public ResponseEntity<ApiResponse<Boolean>> isPostLikedByMe(Authentication authentication,
        @PathVariable Long postId) {
        return ApiResponse.ok(likesService.isPostLikedByMe(authentication, postId));
    }

    @GetMapping("/posts/{postId}/count")
    public ResponseEntity<ApiResponse<Long>> getPostLikeCount(@PathVariable Long postId) {
        return ApiResponse.ok(likesService.getPostLikeCount(postId));
    }

    @Deprecated
    @PostMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> like(Authentication authentication,
        @PathVariable Long feedId) {
        likesService.likePost(authentication, feedId);
        return ApiResponse.ok();
    }

    @Deprecated
    @DeleteMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> unlike(Authentication authentication,
        @PathVariable Long feedId) {
        likesService.unlikePost(authentication, feedId);
        return ApiResponse.ok();
    }

    @Deprecated
    @GetMapping("/check/{feedId}")
    public ResponseEntity<ApiResponse<Boolean>> likedByMe(Authentication authentication,
        @PathVariable Long feedId) {
        return ApiResponse.ok(likesService.isPostLikedByMe(authentication, feedId));
    }
}