package ar.edu.dacs.apexpredict.connector.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class JolpicaDto {
    public record Envelope(@JsonProperty("MRData") Metadata data) {}
    public record Metadata(String total, @JsonProperty("RaceTable") RaceTable table) {}
    public record RaceTable(@JsonProperty("Races") List<RaceDto> races) {}
    public record RaceDto(
        String season,
        String round,
        @JsonProperty("raceName") String name,
        String date,
        String time,
        @JsonProperty("Circuit") Circuit circuit,
        @JsonProperty("Results") List<ResultDto> results
    ) {}
    public record Circuit(@JsonProperty("circuitName") String name, @JsonProperty("Location") Location location) {}
    public record Location(String country) {}
    public record ResultDto(
        String position,
        @JsonProperty("Driver") Driver driver,
        @JsonProperty("Constructor") Constructor constructor,
        String status
    ) {}
    public record Driver(@JsonProperty("driverId") String id, String givenName, String familyName) {}
    public record Constructor(String name) {}
}
