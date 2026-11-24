package ar.edu.dacs.apexpredict.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    public enum Type { RACE_REMINDER, RESULT_PUBLISHED, SYSTEM_NOTICE }
    public enum Channel { EMAIL, PUSH }
    public enum Status { PENDING, SENT, FAILED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private Session session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Channel channel;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "dismissed_at")
    private Instant dismissedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {}

    public Notification(User user, Session session, Type type, Channel channel, String title, String message) {
        this.user = Objects.requireNonNull(user, "El usuario es obligatorio.");
        this.session = session;
        this.type = Objects.requireNonNull(type, "El tipo es obligatorio.");
        this.channel = Objects.requireNonNull(channel, "El canal es obligatorio.");
        this.title = Objects.requireNonNull(title, "El título es obligatorio.");
        this.message = Objects.requireNonNull(message, "El mensaje es obligatorio.");
        this.status = Status.PENDING;
        this.createdAt = Instant.now();
    }

    public void markAsSent() {
        this.status = Status.SENT;
        this.sentAt = Instant.now();
    }

    public void markAsFailed() {
        this.status = Status.FAILED;
    }

    public void markAsRead() {
        if (this.readAt == null) {
            this.readAt = Instant.now();
        }
    }

    public void dismiss() {
        Instant now = Instant.now();
        if (this.readAt == null) {
            this.readAt = now;
        }
        if (this.dismissedAt == null) {
            this.dismissedAt = now;
        }
    }

    public boolean isRead() { return readAt != null; }
    public boolean isDismissed() { return dismissedAt != null; }

    public User getUser() { return user; }
    public Session getSession() { return session; }
    public Type getType() { return type; }
    public Channel getChannel() { return channel; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public Status getStatus() { return status; }
    public Instant getSentAt() { return sentAt; }
    public Instant getReadAt() { return readAt; }
    public Instant getDismissedAt() { return dismissedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
