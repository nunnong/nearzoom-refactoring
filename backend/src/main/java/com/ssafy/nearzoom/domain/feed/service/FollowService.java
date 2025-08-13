package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.FollowCountsResponse; // 🔥 추가
import com.ssafy.nearzoom.domain.feed.entity.Follow;
import com.ssafy.nearzoom.domain.feed.repository.FollowRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserProfileResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    /**
     * 🔥 accountName으로 팔로우
     */
    @Transactional
    public void followByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());

        // accountName으로 팔로우할 사용자 찾기
        User followee = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        followRepository.save(Follow.of(follower, followee));
    }

    /**
     * 🔥 accountName으로 언팔로우
     */
    @Transactional
    public void unfollowByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());

        // accountName으로 언팔로우할 사용자 찾기
        User followee = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        followRepository.deleteByFollower_UserIdAndFollowee_UserId(
                follower.getUserId(),
                followee.getUserId()
        );
    }

    /**
     * 🔥 accountName으로 팔로우 상태 확인
     */
    @Transactional(readOnly = true)
    public Boolean isFollowingByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(loginUserInfo.email(), loginUserInfo.social());

        // accountName으로 팔로우 대상 찾기
        User followee = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRepository.existsByFollower_UserIdAndFollowee_UserId(
                follower.getUserId(),
                followee.getUserId()
        );
    }

    /**
     * 🔥 accountName으로 팔로잉 목록 조회 - UserProfileResponse 사용
     */
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getFollowingByAccountName(String accountName) {
        // accountName으로 사용자 찾기
        User user = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRepository.findFollowing(user.getUserId()).stream()
                .map(followingUser -> new UserProfileResponse(
                        followingUser.getUserId(),
                        followingUser.getAccountName(),
                        followingUser.getUserName(),
                        followingUser.getUserEmail(),
                        followingUser.getProfileImage(),
                        followingUser.getPrettyFace()
                ))
                .toList();
    }

    /**
     * 🔥 accountName으로 팔로워 목록 조회 - UserProfileResponse 사용
     */
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getFollowersByAccountName(String accountName) {
        // accountName으로 사용자 찾기
        User user = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRepository.findFollowers(user.getUserId()).stream()
                .map(followerUser -> new UserProfileResponse(
                        followerUser.getUserId(),
                        followerUser.getAccountName(),
                        followerUser.getUserName(),
                        followerUser.getUserEmail(),
                        followerUser.getProfileImage(),
                        followerUser.getPrettyFace()
                ))
                .toList();
    }

    /**
     * 🔥 accountName으로 팔로우 수 조회
     */
    @Transactional(readOnly = true)
    public FollowCountsResponse getCountsByAccountName(String accountName) {
        // accountName으로 사용자 찾기
        User user = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        int followers = followRepository.countByFollowee_UserId(user.getUserId());
        int following = followRepository.countByFollower_UserId(user.getUserId());
        return new FollowCountsResponse(followers, following);
    }
}