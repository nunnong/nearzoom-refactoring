package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.entity.LikesId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LikesRepository extends JpaRepository<Likes, LikesId> {
    
    boolean existsByPost_PostIdAndUser_UserId(Long postId, Long userId);

    void deleteByPost_PostIdAndUser_UserId(Long postId, Long userId);

    long countByPost_PostId(Long postId);

    @Query("SELECT l.post.postId FROM Likes l WHERE l.user.userId = :userId")
    java.util.List<Long> findLikedPostIdsByUserId(Long userId);
}