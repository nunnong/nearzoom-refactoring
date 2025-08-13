package com.ssafy.nearzoom.domain.feed.entity;

import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feed extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feed_id")
    private Long feedId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 100)
    @Comment("피드 제목")
    private String title;

    @Column(length = 500)
    @Comment("피드 설명")
    private String description;

    @OneToMany(mappedBy = "feed", fetch = FetchType.LAZY)
    private List<Post> posts = new ArrayList<>();

    private Feed(User user, String title, String description) {
        this.user = user;
        this.title = title;
        this.description = description;
    }

    public static Feed of(User user, String title, String description) {
        return new Feed(user, title, description);
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateDescription(String description) {
        this.description = description;
    }
}