package com.ssafy.nearzoom.domain.feed.dto;

public record FollowCountsResponse(
    long followerCount,
    long followingCount
) {

}
