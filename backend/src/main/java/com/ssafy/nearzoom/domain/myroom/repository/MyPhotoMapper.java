package com.ssafy.nearzoom.domain.myroom.repository;

import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoInsertDto;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MyPhotoMapper {

    // 사진 목록 조회 조건 기반
    // 반환 타입이 List<MyPhotoResponse> 형태인 findPhotosByCondition 메서드
    List<MyPhotoResponse> findPhotosByCondition(
        @Param("userId") Long userId,//사용자 식별자(현재 로그인한 사용자의 ID)
        @Param("cond") MyPhotoListCondition cond//각종 조건 DTO(날짜,좋아요 여부,같이 찍은 사람들)
    );

    // 특정 사진의 좋아요 상태 업데이트
    void updateHeart(
        @Param("userId") Long userId,
        @Param("photoId") Long photoId,
        @Param("heart") Boolean heart
    );

    void softDeletePhoto(@Param("userId") Long userId, @Param("photoId") Long photoId);

    void markAsEdited(@Param("userId") Long userId, @Param("photoId") Long photoId);

    // Photo 테이블에 저장
    void savePhotoToMyPhoto(PhotoInsertDto photoDto);
    
    // Archive 테이블에 저장
    void saveToArchive(@Param("userId") Long userId, @Param("photoId") Long photoId);

    // 편집 권한 확인
    boolean checkEditPermission(@Param("userId") Long userId, @Param("photoId") Long photoId);

}
