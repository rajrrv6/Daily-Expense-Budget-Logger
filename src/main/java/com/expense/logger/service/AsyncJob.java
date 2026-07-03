package com.expense.logger.service;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class AsyncJob {
    public enum JobType {
        EMAIL_SENDING,
        AUDIT_LOGGING,
        NOTIFICATION_GENERATION,
        BULK_UPLOAD_PROCESSING,
        ANALYTICS_RECALCULATION
    }

    private final String jobId;
    private final JobType jobType;
    private final Map<String, Object> payload;
}
