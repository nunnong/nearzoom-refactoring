package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.repository.LikesRepository;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikesService {

    private final LikesRepository likesRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;

    @Transactional
    public void like(Authentication authentication, Long photoId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        if (likesRepository.existsByUser_UserIdAndPhoto_PhotoId(user.getUserId(), photoId)) {
            return;
        }

        Photo photo = photoRepository.getReferenceById(photoId);
        likesRepository.save(Likes.of(user, photo));
    }

    @Transactional
    public void unlike(Authentication authentication, Long photoId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());

        long affected = likesRepository.deleteByUser_UserIdAndPhoto_PhotoId(user.getUserId(),
            photoId);
    }

    @Transactional(readOnly = true)
    public long getLikeCount(Long photoId) {
        return likesRepository.countByPhoto_PhotoId(photoId);
    }

    @Transactional(readOnly = true)
    public boolean isLikedByMe(Authentication authentication, Long photoId) {
        UserAuthInfoResponse auth = AuthUtil.getUserAuthInfo(authentication);
        User user = userRepository.getByEmailAndSocial(auth.email(), auth.social());
        return likesRepository.existsByUser_UserIdAndPhoto_PhotoId(user.getUserId(), photoId);
    }
}