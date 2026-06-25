package com.expense.logger.service;

import com.expense.logger.model.TodoItem;
import com.expense.logger.repository.TodoItemRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@Slf4j
public class TodoReminderScheduledTask {

    private final TodoItemRepository todoItemRepository;
    private final NotificationCenterService notificationCenterService;

    public TodoReminderScheduledTask(TodoItemRepository todoItemRepository,
                                     NotificationCenterService notificationCenterService) {
        this.todoItemRepository = todoItemRepository;
        this.notificationCenterService = notificationCenterService;
    }

    // Check every hour (cron defaults to 0 0 * * * *)
    @Scheduled(cron = "${app.todo.reminder.cron:0 0 * * * *}")
    @Transactional
    public void sendTodoReminders() {
        log.info("Starting scheduled task for todo target date reminders...");
        try {
            LocalDate today = LocalDate.now();
            List<TodoItem> items = todoItemRepository.findAllByCompletedFalseAndTargetDateLessThanEqualAndNotificationSentFalseAndDeletedAtIsNull(today);
            log.info("Found {} todo items to remind", items.size());
            for (TodoItem item : items) {
                notificationCenterService.triggerNotification(
                        item.getUser(),
                        "Shopping Checklist Reminder",
                        "Today is the target date to buy: " + item.getName(),
                        "INFO",
                        "SYSTEM"
                );
                item.setNotificationSent(true);
                todoItemRepository.save(item);
            }
            log.info("Todo reminders processing completed.");
        } catch (Exception e) {
            log.error("Failed to run todo reminder scheduled task", e);
        }
    }
}
