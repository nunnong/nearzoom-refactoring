package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.entity.Post;
import com.ssafy.nearzoom.domain.feed.repository.LikesRepository;
import com.ssafy.nearzoom.domain.feed.repository.PostRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikesService {

    private final LikesRepository likesRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public void likePost(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        if (likesRepository.existsByPost_PostIdAndUser_UserId(postId, user.getUserId())) {
            return;
        }

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 게시물입니다."));

        try {
            likesRepository.save(Likes.of(post, user));
        } catch (DataIntegrityViolationException e) {

        }
    }

    @Transactional
    public void unlikePost(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        likesRepository.deleteByPost_PostIdAndUser_UserId(postId, user.getUserId());
    }

    @Transactional(readOnly = true)
    public boolean isPostLikedByMe(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.existsByPost_PostIdAndUser_UserId(postId, user.getUserId());
    }

    @Transactional(readOnly = true)
    public long getPostLikeCount(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 게시물입니다.");
        }
        return likesRepository.countByPost_PostId(postId);
    }

    @Transactional(readOnly = true)
    public List<Long> getLikedPostIds(Authentication authentication) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.findLikedPostIdsByUserId(user.getUserId());
    }

    @Deprecated
    public void like(Authentication authentication, Long feedId) {
        likePost(authentication, feedId);
    }

    @Deprecated
    public void unlike(Authentication authentication, Long feedId) {
        unlikePost(authentication, feedId);
    }


    @Deprecated
    public boolean isLikedByMe(Authentication authentication, Long feedId) {
        return isPostLikedByMe(authentication, feedId);
    }
}