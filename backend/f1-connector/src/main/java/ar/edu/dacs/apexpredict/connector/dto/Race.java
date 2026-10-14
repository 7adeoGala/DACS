package ar.edu.dacs.apexpredict.connector.dto;

import java.time.Instant;
import java.time.LocalDate;

public record Race(
    int season,
    int round,
    String name,
    String circuit,
    String country,
    LocalDate date,
    Instant startsAt
) {}
