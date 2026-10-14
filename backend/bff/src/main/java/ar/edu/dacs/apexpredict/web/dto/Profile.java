package ar.edu.dacs.apexpredict.web.dto;

import java.util.UUID;

public record Profile(UUID id, String displayName, String email) {}
