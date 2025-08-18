package com.ssafy.nearzoom.domain.photo.entity;

import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "PHOTO")
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
    private Long roomId;

    @Column(name = "original_photo_id")
    private Long originalPhotoId;

    public Photo(String imgUrl, Long roomId, String userList, Long originalPhotoId) {
        this.imgUrl = imgUrl;
        this.roomId = roomId;
        this.userList = userList;
        this.originalPhotoId = originalPhotoId;
    }

    public void setTimestamps(LocalDateTime createdAt, LocalDateTime updatedAt) {
        try {
            java.lang.reflect.Field createdAtField = BaseEntity.class.getDeclaredField("createdAt");
            java.lang.reflect.Field updatedAtField = BaseEntity.class.getDeclaredField("updatedAt");

            createdAtField.setAccessible(true);
            updatedAtField.setAccessible(true);

            createdAtField.set(this, createdAt);
            updatedAtField.set(this, updatedAt);
        } catch (Exception e) {
            throw new RuntimeException("시간 필드 설정 실패", e);
        }
    }
}
