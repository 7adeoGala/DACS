package ar.edu.dacs.apexpredict.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmitPrediction(
    @NotNull(message = "El podio es obligatorio")
    @Size(min = 3, max = 3, message = "El podio debe tener exactamente 3 pilotos")
    List<String> podium,

    String polePositionDriverId,
    String duelDriverPick,
    Integer safetyCarCount,
    Integer dnfCount
) {}
