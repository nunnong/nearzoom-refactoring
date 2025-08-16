package com.ssafy.nearzoom.global.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDateTime;
import lombok.Getter;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public class BaseEntity {

    @Column(updatable = false)
    @CreatedDate
    @Comment("생성일")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    @Comment("수정일")
    private LocalDateTime updatedAt;

    @Column(insertable = false)
    @Comment("삭제일")
    private LocalDateTime deletedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now().plusHours(9);
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now().plusHours(9);
    }

    // soft delete
    public void markDeleted() {
        this.deletedAt = LocalDateTime.now().plusHours(9);
    }

    public void restore() {
        this.deletedAt = null;
    }
}
