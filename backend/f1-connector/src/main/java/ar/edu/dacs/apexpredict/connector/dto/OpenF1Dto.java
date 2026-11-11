package ar.edu.dacs.apexpredict.connector.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public class OpenF1Dto {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SessionDto(
        long session_key,
        String date_start
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RaceControlDto(
        String category,
        String message
    ) {}
}
