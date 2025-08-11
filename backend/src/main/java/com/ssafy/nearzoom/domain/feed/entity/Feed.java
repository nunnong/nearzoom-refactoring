package com.ssafy.nearzoom.domain.feed.entity;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feed extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedId;

    @Column(length = 15, nullable = false)
    @Comment("피드이름")
    private String feedName;

    @Column(nullable = false)
    private Long userId;

    private Feed(Long userId, Photo photo) {
        this.userId = userId;
    }

    public static Feed of(Long userId, Photo photo) {
        return new Feed(userId, photo);
    }

}
