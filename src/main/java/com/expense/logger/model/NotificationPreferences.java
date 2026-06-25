package com.expense.logger.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreferences implements Persistable<UUID> {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "budget_warnings_enabled", nullable = false)
    @Builder.Default
    private boolean budgetWarningsEnabled = true;

    @Column(name = "system_alerts_enabled", nullable = false)
    @Builder.Default
    private boolean systemAlertsEnabled = true;

    @Column(name = "quiet_hours_enabled", nullable = false)
    @Builder.Default
    private boolean quietHoursEnabled = false;

    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart;

    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd;

    @Override
    public UUID getId() {
        return this.userId;
    }

    @Override
    public boolean isNew() {
        return this.userId == null;
    }
}
