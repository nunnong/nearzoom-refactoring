package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.FollowCountsResponse;
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

    @Transactional
    public void followByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());

        User followee = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        followRepository.save(Follow.of(follower, followee));
    }

    @Transactional
    public void unfollowByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());

        User followee = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        followRepository.deleteByFollower_UserIdAndFollowee_UserId(
            follower.getUserId(),
            followee.getUserId()
        );
    }

    @Transactional(readOnly = true)
    public Boolean isFollowingByAccountName(Authentication authentication, String accountName) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        User follower = userRepository.getByEmailAndSocial(loginUserInfo.email(),
            loginUserInfo.social());

        User followee = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRepository.existsByFollower_UserIdAndFollowee_UserId(
            follower.getUserId(),
            followee.getUserId()
        );
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getFollowingByAccountName(String accountName) {

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

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getFollowersByAccountName(String accountName) {

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

    @Transactional(readOnly = true)
    public FollowCountsResponse getCountsByAccountName(String accountName) {
        User user = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        long followers = followRepository.countByFollowee_UserId(user.getUserId());
        long following = followRepository.countByFollower_UserId(user.getUserId());

        return new FollowCountsResponse(followers, following);
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getMutualFollowsByAccountName(Authentication authentication,
        String accountName) {

        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        User loginUser = userRepository.getByEmailAndSocial(loginUserInfo.email(),
            loginUserInfo.social());

        User targetUser = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRepository.findMutualFollows(loginUser.getUserId(), targetUser.getUserId())
            .stream()
            .map(mutualUser -> new UserProfileResponse(
                mutualUser.getUserId(),
                mutualUser.getAccountName(),
                mutualUser.getUserName(),
                mutualUser.getUserEmail(),
                mutualUser.getProfileImage(),
                mutualUser.getPrettyFace()
            ))
            .toList();
    }
}