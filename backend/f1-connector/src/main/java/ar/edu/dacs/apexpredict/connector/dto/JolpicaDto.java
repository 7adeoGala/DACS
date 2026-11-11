package ar.edu.dacs.apexpredict.connector.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * DTOs con filtrado estricto (@JsonIgnoreProperties(ignoreUnknown = true)) para aislar
 * únicamente los campos necesarios de las respuestas de Jolpica F1 API.
 */
public class JolpicaDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Envelope(@JsonProperty("MRData") Metadata data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Metadata(String total, @JsonProperty("RaceTable") RaceTable table) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RaceTable(@JsonProperty("Races") List<RaceDto> races) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RaceDto(
        String season,
        String round,
        @JsonProperty("raceName") String name,
        String date,
        String time,
        @JsonProperty("Circuit") Circuit circuit,
        @JsonProperty("Results") List<ResultDto> results
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Circuit(
        @JsonProperty("circuitId") String id,
        @JsonProperty("circuitName") String name,
        @JsonProperty("Location") Location location
    ) {
        public Circuit(String name, Location location) {
            this(null, name, location);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(
        String lat,
        @JsonProperty("long") String lon,
        String locality,
        String country
    ) {
        public Location(String country) {
            this(null, null, null, country);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResultDto(
        String position,
        @JsonProperty("Driver") Driver driver,
        @JsonProperty("Constructor") Constructor constructor,
        String status
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Driver(
        @JsonProperty("driverId") String id,
        String code,
        String givenName,
        String familyName,
        String nationality
    ) {
        public Driver(String id, String givenName, String familyName) {
            this(id, null, givenName, familyName, null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Constructor(
        @JsonProperty("constructorId") String id,
        String name,
        String nationality
    ) {
        public Constructor(String name) {
            this(null, name, null);
        }
    }

    // --- Qualifying estricto (solo position y Driver) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QualifyingEnvelope(@JsonProperty("MRData") QualifyingMetadata data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QualifyingMetadata(@JsonProperty("RaceTable") QualifyingRaceTable table) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QualifyingRaceTable(@JsonProperty("Races") List<QualifyingRaceDto> races) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QualifyingRaceDto(
        String season,
        String round,
        @JsonProperty("QualifyingResults") List<QualifyingResultDto> qualifyingResults
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QualifyingResultDto(
        String position,
        @JsonProperty("Driver") Driver driver
    ) {}

    // --- Next Race & Sessions estricto ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NextRaceEnvelope(@JsonProperty("MRData") NextRaceMetadata data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NextRaceMetadata(@JsonProperty("RaceTable") NextRaceTable table) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NextRaceTable(@JsonProperty("Races") List<NextRaceDto> races) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SessionTimeDto(String date, String time) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NextRaceDto(
        String season,
        String round,
        @JsonProperty("raceName") String raceName,
        String date,
        String time,
        @JsonProperty("Circuit") Circuit circuit,
        @JsonProperty("FirstPractice") SessionTimeDto firstPractice,
        @JsonProperty("SecondPractice") SessionTimeDto secondPractice,
        @JsonProperty("ThirdPractice") SessionTimeDto thirdPractice,
        @JsonProperty("Qualifying") SessionTimeDto qualifying,
        @JsonProperty("Sprint") SessionTimeDto sprint,
        @JsonProperty("SprintQualifying") SessionTimeDto sprintQualifying
    ) {}

    // --- Resultados detallados estricto (incluye grid/points/laps/fastestLap para stats y last race) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailedEnvelope(@JsonProperty("MRData") DetailedMetadata data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailedMetadata(String total, @JsonProperty("RaceTable") DetailedRaceTable table) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailedRaceTable(@JsonProperty("Races") List<DetailedRaceDto> races) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailedRaceDto(
        String season,
        String round,
        @JsonProperty("raceName") String raceName,
        String date,
        @JsonProperty("Circuit") Circuit circuit,
        @JsonProperty("Results") List<DetailedResultDto> results
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FastestLapDto(String rank) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailedResultDto(
        String position,
        String grid,
        String points,
        String laps,
        String status,
        @JsonProperty("Driver") Driver driver,
        @JsonProperty("Constructor") Constructor constructor,
        @JsonProperty("FastestLap") FastestLapDto fastestLap
    ) {}

    // --- Standings estricto ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StandingsEnvelope(@JsonProperty("MRData") StandingsMetadata data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StandingsMetadata(@JsonProperty("StandingsTable") StandingsTable table) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StandingsTable(@JsonProperty("StandingsLists") List<StandingsListDto> lists) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StandingsListDto(
        @JsonProperty("DriverStandings") List<DriverStandingItemDto> driverStandings,
        @JsonProperty("ConstructorStandings") List<ConstructorStandingItemDto> constructorStandings
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DriverStandingItemDto(
        String position,
        String points,
        String wins,
        @JsonProperty("Driver") Driver driver,
        @JsonProperty("Constructors") List<Constructor> constructors
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConstructorStandingItemDto(
        String position,
        String points,
        String wins,
        @JsonProperty("Constructor") Constructor constructor
    ) {}
}
