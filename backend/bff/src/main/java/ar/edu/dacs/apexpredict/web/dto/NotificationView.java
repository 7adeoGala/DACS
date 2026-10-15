package ar.edu.dacs.apexpredict.web.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationView(
    UUID id,
    String type,
    String channel,
    String title,
    String message,
    String status,
    Instant sentAt
) {}
