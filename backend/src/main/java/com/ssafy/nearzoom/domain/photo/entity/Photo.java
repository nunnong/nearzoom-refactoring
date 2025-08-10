package com.ssafy.nearzoom.domain.photo.entity;

import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "photo_id")
    private Long photoId;

    @Column(name = "img_url", columnDefinition = "TEXT", nullable = false)
    private String imgUrl;

    @Column(name = "user_list", columnDefinition = "TEXT")
    private String userList;

    @Column(name = "room_id", length = 100, nullable = false)
    private String roomId;

    // 생성자
    public Photo(String imgUrl, String roomId, String userList) {
        this.imgUrl = imgUrl;
        this.roomId = roomId;
        this.userList = userList;
    }
}
