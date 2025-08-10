package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.entity.LikesId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikesRepository extends JpaRepository<Likes, LikesId> {

    boolean existsByUser_UserIdAndPhoto_PhotoId(Long userId, Long photoId);

    long countByPhoto_PhotoId(Long photoId);

    long deleteByUser_UserIdAndPhoto_PhotoId(Long userId, Long photoId);
}
