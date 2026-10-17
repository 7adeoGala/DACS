package ar.edu.dacs.apexpredict.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EditLeague(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 255) String description,
    @Size(max = 100) String password
) {
    public EditLeague(String name, String description) {
        this(name, description, null);
    }
}
