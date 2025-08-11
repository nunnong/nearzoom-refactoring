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

    @PostMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> like(Authentication authentication,
        @PathVariable Long feedId) {
        likesService.like(authentication, feedId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{feedId}")
    public ResponseEntity<ApiResponse<Void>> unlike(Authentication authentication,
        @PathVariable Long feedId) {
        likesService.unlike(authentication, feedId);
        return ApiResponse.ok();
    }

    @GetMapping("/check/{feedId}")
    public ResponseEntity<ApiResponse<Boolean>> likedByMe(Authentication authentication,
        @PathVariable Long feedId) {
        return ApiResponse.ok(likesService.isLikedByMe(authentication, feedId));
    }
}