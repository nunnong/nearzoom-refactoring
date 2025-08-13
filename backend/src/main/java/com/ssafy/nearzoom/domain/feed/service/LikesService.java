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
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LikesService {

    private final LikesRepository likesRepository;
    private final PostRepository postRepository;  // FeedRepository → PostRepository로 변경
    private final UserRepository userRepository;

    /**
     * 🔄 게시물에 좋아요 (Feed → Post로 변경)
     */
    @Transactional
    public void likePost(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        if (likesRepository.existsByPost_PostIdAndUser_UserId(postId, user.getUserId())) {
            return; // 이미 좋아요한 경우 무시
        }

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 게시물입니다."));

        try {
            likesRepository.save(Likes.of(post, user));
        } catch (DataIntegrityViolationException e) {
            // 동시성 문제로 인한 중복 삽입 시 무시
        }
    }

    /**
     * 🔄 게시물 좋아요 취소 (Feed → Post로 변경)
     */
    @Transactional
    public void unlikePost(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        likesRepository.deleteByPost_PostIdAndUser_UserId(postId, user.getUserId());
    }

    /**
     * 🔄 게시물 좋아요 상태 확인 (Feed → Post로 변경)
     */
    @Transactional(readOnly = true)
    public boolean isPostLikedByMe(Authentication authentication, Long postId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.existsByPost_PostIdAndUser_UserId(postId, user.getUserId());
    }

    /**
     * 📊 게시물 좋아요 수 조회 (새로 추가)
     */
    @Transactional(readOnly = true)
    public long getPostLikeCount(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 게시물입니다.");
        }
        return likesRepository.countByPost_PostId(postId);
    }

    /**
     * 📊 사용자가 좋아요한 게시물 ID 목록 조회 (새로 추가)
     */
    @Transactional(readOnly = true)
    public List<Long> getLikedPostIds(Authentication authentication) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.findLikedPostIdsByUserId(user.getUserId());
    }

    // ===== 🔄 기존 메서드들 (하위 호환성) =====

    /**
     * @deprecated Post 구조로 변경되었습니다. likePost()를 사용하세요.
     */
    @Deprecated
    public void like(Authentication authentication, Long feedId) {
        likePost(authentication, feedId);
    }

    /**
     * @deprecated Post 구조로 변경되었습니다. unlikePost()를 사용하세요.
     */
    @Deprecated
    public void unlike(Authentication authentication, Long feedId) {
        unlikePost(authentication, feedId);
    }

    /**
     * @deprecated Post 구조로 변경되었습니다. isPostLikedByMe()를 사용하세요.
     */
    @Deprecated
    public boolean isLikedByMe(Authentication authentication, Long feedId) {
        return isPostLikedByMe(authentication, feedId);
    }
}