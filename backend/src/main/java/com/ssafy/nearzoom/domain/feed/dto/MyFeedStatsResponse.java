package com.ssafy.nearzoom.domain.feed.dto;

public record MyFeedStatsResponse(
    long postCount,      // 내 게시물 수
    long totalLikes,     // 내 게시물들이 받은 총 좋아요 수
    long followerCount,  // 나를 팔로우하는 사람 수
    long followingCount  // 내가 팔로우하는 사람 수
) {
}