package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.FollowCountsResponse;
import com.ssafy.nearzoom.domain.feed.service.FollowService;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.global.response.ApiResponse;
import java.util.List;
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
@RequestMapping("follows")
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{followeeId}")
    public ResponseEntity<ApiResponse<Void>> follow(Authentication authentication,
        @PathVariable Long followeeId) {
        followService.follow(authentication, followeeId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{followeeId}")
    public ResponseEntity<ApiResponse<Void>> unfollow(Authentication authentication,
        @PathVariable Long followeeId) {
        followService.unfollow(authentication, followeeId);
        return ApiResponse.ok();
    }

    @GetMapping("/following/{userId}")
    public ResponseEntity<ApiResponse<List<UserInfoResponse>>> getFollowing(
        @PathVariable Long userId) {
        return ApiResponse.ok(followService.getFollowing(userId));
    }

    @GetMapping("/followers/{userId}")
    public ResponseEntity<ApiResponse<List<UserInfoResponse>>> getFollowers(
        @PathVariable Long userId) {
        return ApiResponse.ok(followService.getFollowers(userId));
    }

    @GetMapping("/count/{userId}")
    public ResponseEntity<ApiResponse<FollowCountsResponse>> countFollow(
        @PathVariable Long userId) {
        return ApiResponse.ok(followService.getCounts(userId));
    }

    @GetMapping("/check/{followeeId}")
    public ResponseEntity<ApiResponse<Boolean>> isFollowing(Authentication authentication,
        @PathVariable Long followeeId) {
        return ApiResponse.ok(followService.isFollowing(authentication, followeeId));
    }

}
