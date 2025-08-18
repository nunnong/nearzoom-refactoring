package com.ssafy.nearzoom.domain.myroom.repository;

import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MyPhotoMapper {

    List<MyPhotoResponse> findPhotosByCondition(
        @Param("userId") Long userId,
        @Param("cond") MyPhotoListCondition cond
    );

    void updateHeart(
        @Param("userId") Long userId,
        @Param("photoId") Long photoId,
        @Param("heart") Boolean heart
    );

    void softDeletePhoto(@Param("userId") Long userId, @Param("photoId") Long photoId);

    void markAsEdited(@Param("userId") Long userId, @Param("photoId") Long photoId);

    void saveToArchive(@Param("userId") Long userId,
        @Param("photoId") Long photoId,
        @Param("originalCreatedAt") LocalDateTime originalCreatedAt);

    boolean checkEditPermission(@Param("userId") Long userId, @Param("photoId") Long photoId);

    void savePromptToArchive(@Param("userId") Long userId, @Param("photoId") Long photoId);
}
