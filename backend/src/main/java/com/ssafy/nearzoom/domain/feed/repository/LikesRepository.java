package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.entity.LikesId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LikesRepository extends JpaRepository<Likes, LikesId> {

    // 🔄 Feed → Post로 변경
    boolean existsByPost_PostIdAndUser_UserId(Long postId, Long userId);

    void deleteByPost_PostIdAndUser_UserId(Long postId, Long userId);

    // 📊 게시물별 좋아요 수 조회 (새로 추가)
    long countByPost_PostId(Long postId);

    // 📊 사용자가 좋아요한 게시물들 조회 (새로 추가)
    @Query("SELECT l.post.postId FROM Likes l WHERE l.user.userId = :userId")
    java.util.List<Long> findLikedPostIdsByUserId(Long userId);
}