package ar.edu.dacs.apexpredict.web.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmitPrediction(
    @Size(max = 3, message = "El podio no puede tener más de 3 pilotos")
    List<String> podium,

    String polePositionDriverId,
    String duelDriverPick,

    @JsonAlias({"safetyCars", "safety_cars", "safety_car_count"})
    Integer safetyCarCount,

    @JsonAlias({"dnfs", "dnf_count", "dnfsCount"})
    Integer dnfCount
) {}
