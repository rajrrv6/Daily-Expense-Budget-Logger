package com.expense.logger.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Service
@Slf4j
public class AsyncTaskQueueService {

    private final BlockingQueue<AsyncJob> queue = new LinkedBlockingQueue<>(1000);

    public void submitJob(AsyncJob job) {
        log.info("Submitting job {} of type {} to the worker queue.", job.getJobId(), job.getJobType());
        boolean added = queue.offer(job);
        if (!added) {
            log.warn("Worker queue is full! Backpressure triggered. Blocking until space is available for job {}", job.getJobId());
            try {
                queue.put(job);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Failed to enqueue job {} due to interruption", job.getJobId(), e);
            }
        }
    }

    public AsyncJob takeJob() throws InterruptedException {
        return queue.take();
    }

    public int getQueueSize() {
        return queue.size();
    }
}
