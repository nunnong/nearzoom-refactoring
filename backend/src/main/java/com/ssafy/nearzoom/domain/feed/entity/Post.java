package com.ssafy.nearzoom.domain.feed.entity;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feed_id", nullable = false)
    private Feed feed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;

    @Column(length = 200)
    @Comment("게시물 캡션")
    private String caption;

    @Column(name = "display_order")
    @Comment("피드 내 표시 순서")
    private Integer displayOrder;

    private Post(Feed feed, Photo photo, String caption, Integer displayOrder) {
        this.feed = feed;
        this.photo = photo;
        this.caption = caption;
        this.displayOrder = displayOrder;
    }

    public static Post of(Feed feed, Photo photo, String caption, Integer displayOrder) {
        return new Post(feed, photo, caption, displayOrder);
    }

    public void updateCaption(String caption) {
        this.caption = caption;
    }

    public void updateDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}