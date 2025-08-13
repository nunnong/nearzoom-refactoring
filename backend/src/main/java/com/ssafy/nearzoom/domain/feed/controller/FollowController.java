package com.ssafy.nearzoom.domain.feed.controller;

import com.ssafy.nearzoom.domain.feed.dto.FollowCountsResponse;
import com.ssafy.nearzoom.domain.feed.service.FollowService;
import com.ssafy.nearzoom.domain.user.dto.UserProfileResponse;  // 🔥 User 도메인의 DTO 사용
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

    /**
     * 🔥 accountName으로 팔로우
     */
    @PostMapping("/{accountName}")
    public ResponseEntity<ApiResponse<Void>> follow(Authentication authentication,
                                                    @PathVariable String accountName) {
        followService.followByAccountName(authentication, accountName);
        return ApiResponse.ok();
    }

    /**
     * 🔥 accountName으로 언팔로우
     */
    @DeleteMapping("/{accountName}")
    public ResponseEntity<ApiResponse<Void>> unfollow(Authentication authentication,
                                                      @PathVariable String accountName) {
        followService.unfollowByAccountName(authentication, accountName);
        return ApiResponse.ok();
    }

    /**
     * 🔥 accountName으로 팔로잉 목록 조회 - UserProfileResponse 반환
     */
    @GetMapping("/following/{accountName}")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getFollowing(
            @PathVariable String accountName) {
        return ApiResponse.ok(followService.getFollowingByAccountName(accountName));
    }

    /**
     * 🔥 accountName으로 팔로워 목록 조회 - UserProfileResponse 반환
     */
    @GetMapping("/followers/{accountName}")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getFollowers(
            @PathVariable String accountName) {
        return ApiResponse.ok(followService.getFollowersByAccountName(accountName));
    }

    /**
     * 🔥 accountName으로 팔로우 수 조회
     */
    @GetMapping("/count/{accountName}")
    public ResponseEntity<ApiResponse<FollowCountsResponse>> countFollow(
            @PathVariable String accountName) {
        return ApiResponse.ok(followService.getCountsByAccountName(accountName));
    }

    /**
     * 🔥 accountName으로 팔로우 상태 확인
     */
    @GetMapping("/check/{accountName}")
    public ResponseEntity<ApiResponse<Boolean>> isFollowing(Authentication authentication,
                                                            @PathVariable String accountName) {
        return ApiResponse.ok(followService.isFollowingByAccountName(authentication, accountName));
    }
}