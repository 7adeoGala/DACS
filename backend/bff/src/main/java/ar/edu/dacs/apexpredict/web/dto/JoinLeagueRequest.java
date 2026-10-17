package ar.edu.dacs.apexpredict.web.dto;

import jakarta.validation.constraints.Size;

public record JoinLeagueRequest(
    @Size(max = 100) String password
) {}
