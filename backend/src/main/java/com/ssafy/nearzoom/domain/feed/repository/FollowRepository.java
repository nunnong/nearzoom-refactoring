package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Follow;
import com.ssafy.nearzoom.domain.user.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    void deleteByFollower_UserIdAndFollowee_UserId(Long followerId, Long followeeId);

    @Query("SELECT f.followee FROM Follow f WHERE f.follower.userId = :userId")
    List<User> findFollowing(Long userId);

    @Query("SELECT f.follower FROM Follow f WHERE f.followee.userId = :userId")
    List<User> findFollowers(Long userId);

    boolean existsByFollower_UserIdAndFollowee_UserId(Long followerId, Long followeeId);

    @Query("select f.followee.userId from Follow f where f.follower.userId = :followerId")
    List<Long> findFolloweeIdsByFollowerId(Long followerId);
}
