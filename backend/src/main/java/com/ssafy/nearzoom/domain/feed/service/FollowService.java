package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.entity.Follow;
import com.ssafy.nearzoom.domain.feed.repository.FollowRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public void follow(Authentication authentication, Long followeeId) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);

        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());
        User followee = userRepository.getReferenceById(followeeId);

        followRepository.save(Follow.of(follower, followee));
    }

    @Transactional
    public void unfollow(Authentication authentication, Long followeeId) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);

        User follower = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social());

        followRepository.deleteByFollower_UserIdAndFollowee_UserId(follower.getUserId(),
            followeeId);
    }

    @Transactional(readOnly = true)
    public List<UserInfoResponse> getFollowing(Long userId) {
        return followRepository.findFollowing(userId).stream()
            .map(user -> new UserInfoResponse(
                user.getUserName(),
                user.getUserEmail(),
                user.getProfileImage()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<UserInfoResponse> getFollowers(Long userId) {
        return followRepository.findFollowers(userId).stream()
            .map(user -> new UserInfoResponse(
                user.getUserName(),
                user.getUserEmail(),
                user.getProfileImage()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public Boolean isFollowing(Authentication authentication, Long followeeId) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);

        User follower = userRepository.getByEmailAndSocial(
            loginUserInfo.email(),
            loginUserInfo.social()
        );

        return followRepository.existsByFollower_UserIdAndFollowee_UserId(follower.getUserId(),
            followeeId);
    }
}
