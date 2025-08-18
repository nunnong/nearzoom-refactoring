package com.ssafy.nearzoom.domain.feed.dto;

public record MyFeedStatsResponse(
    long postCount,
    long totalLikes,
    long followerCount,
    long followingCount
) {

}