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

    /**
     * 🔄 게시물에 좋아요 (feedId → postId로 변경)
     */
    @PostMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> likePost(Authentication authentication,
        @PathVariable Long postId) {
        likesService.likePost(authentication, postId);
        return ApiResponse.ok();
    }

    /**
     * 🔄 게시물 좋아요 취소 (feedId → postId로 변경)
     */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> unlikePost(Authentication authentication,
        @PathVariable Long postId) {
        likesService.unlikePost(authentication, postId);
        return ApiResponse.ok();
    }

    /**
     * 🔄 게시물 좋아요 상태 확인 (feedId → postId로 변경)
     */
    @GetMapping("/posts/{postId}/check")
    public ResponseEntity<ApiResponse<Boolean>> isPostLikedByMe(Authentication authentication,
        @PathVariable Long postId) {
        return ApiResponse.ok(likesService.isPostLikedByMe(authentication, postId));
    }

    /**
     * 📊 게시물 좋아요 수 조회 (새로 추가)
     */
    @GetMapping("/posts/{postId}/count")
    public ResponseEntity<ApiResponse<Long>> getPostLikeCount(@PathVariable Long postId) {
        return ApiResponse.ok(likesService.getPostLikeCount(postId));
    }

    // ===== 🔄 기존 API 호환성 유지 (Deprecated) =====

    /**
     * @deprecated Feed 구조 변경으로 인해 더 이상 사용되지 않습니다.
     * POST /likes/posts/{postId} 를 사용하세요.
     */
    @Deprecated
    @PostMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> like(Authentication authentication,
        @PathVariable Long feedId) {
        // 기존 프론트엔드 호환성을 위해 임시로 유지
        // feedId를 postId로 해석하여 처리
        likesService.likePost(authentication, feedId);
        return ApiResponse.ok();
    }

    /**
     * @deprecated Feed 구조 변경으로 인해 더 이상 사용되지 않습니다.
     * DELETE /likes/posts/{postId} 를 사용하세요.
     */
    @Deprecated
    @DeleteMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> unlike(Authentication authentication,
        @PathVariable Long feedId) {
        // 기존 프론트엔드 호환성을 위해 임시로 유지
        likesService.unlikePost(authentication, feedId);
        return ApiResponse.ok();
    }

    /**
     * @deprecated Feed 구조 변경으로 인해 더 이상 사용되지 않습니다.
     * GET /likes/posts/{postId}/check 를 사용하세요.
     */
    @Deprecated
    @GetMapping("/check/{feedId}")
    public ResponseEntity<ApiResponse<Boolean>> likedByMe(Authentication authentication,
        @PathVariable Long feedId) {
        // 기존 프론트엔드 호환성을 위해 임시로 유지
        return ApiResponse.ok(likesService.isPostLikedByMe(authentication, feedId));
    }
}