package ar.edu.dacs.apexpredict.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLeague(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 255) String description,
    @Size(max = 100) String password
) {
    public CreateLeague(String name) {
        this(name, null, null);
    }
}
