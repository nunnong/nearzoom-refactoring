package com.ssafy.nearzoom.domain.myroom.repository;

import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MyPhotoMapper {

    //    반환 타입이 List<MyPhotoResponse> 형태인 findPhotosByCondition 메서드
    List<MyPhotoResponse> findPhotosByCondition(
        @Param("userId") Long userId,//사용자 식별자(현재 로그인한 사용자의 ID)
        @Param("cond") MyPhotoListCondition cond//각종 조건 DTO(날짜,좋아요 여부,같이 찍은 사람들)
    );
}
