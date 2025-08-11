package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.repository.FeedRepository;
import com.ssafy.nearzoom.domain.feed.repository.LikesRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikesService {

    private final LikesRepository likesRepository;
    private final FeedRepository feedRepository;
    private final UserRepository userRepository;

    @Transactional
    public void like(Authentication authentication, Long feedId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        if (likesRepository.existsByFeed_FeedIdAndUser_UserId(feedId, user.getUserId())) {
            return;
        }

        Feed feed = feedRepository.findById(feedId)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시물입니다."));

        try {
            likesRepository.save(Likes.of(feed, user));
        } catch (DataIntegrityViolationException e) {
        }
    }

    @Transactional
    public void unlike(Authentication authentication, Long feedId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        likesRepository.deleteByFeed_FeedIdAndUser_UserId(feedId, user.getUserId());
    }

    @Transactional(readOnly = true)
    public boolean isLikedByMe(Authentication authentication, Long feedId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.existsByFeed_FeedIdAndUser_UserId(feedId, user.getUserId());
    }
}