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

    @PostMapping("/{photoId}")
    public ResponseEntity<ApiResponse<Void>> like(Authentication authentication,
        @PathVariable Long photoId) {
        likesService.like(authentication, photoId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{photoId}")
    public ResponseEntity<ApiResponse<Void>> unlike(Authentication authentication,
        @PathVariable Long photoId) {
        likesService.unlike(authentication, photoId);
        return ApiResponse.ok();
    }

    @GetMapping("/{photoId}/count")
    public ResponseEntity<ApiResponse<Long>> count(@PathVariable Long photoId) {
        return ApiResponse.ok(likesService.getLikeCount(photoId));
    }

    @GetMapping("/{photoId}/me")
    public ResponseEntity<ApiResponse<Boolean>> likedByMe(Authentication authentication,
        @PathVariable Long photoId) {
        return ApiResponse.ok(likesService.isLikedByMe(authentication, photoId));
    }
}