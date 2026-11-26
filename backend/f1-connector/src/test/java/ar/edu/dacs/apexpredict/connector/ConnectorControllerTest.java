package ar.edu.dacs.apexpredict.connector;

import ar.edu.dacs.apexpredict.connector.dto.Race;
import ar.edu.dacs.apexpredict.connector.service.F1Service;
import ar.edu.dacs.apexpredict.connector.web.ConnectorController;
import ar.edu.dacs.apexpredict.connector.web.ConnectorExceptionHandler;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConnectorControllerTest {
    private F1Service f1Service;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        f1Service = mock(F1Service.class);
        var controller = new ConnectorController(f1Service);
        mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new ConnectorExceptionHandler())
            .build();
    }

    @Test
    void pingReturnsOk() throws Exception {
        mvc.perform(get("/ping"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("apexpredict-f1-connector"))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void calendarReturnsList() throws Exception {
        when(f1Service.calendar(2026)).thenReturn(List.of(
            new Race(2026, 1, "Australian Grand Prix", "Albert Park", "Australia", LocalDate.of(2026, 3, 8), Instant.parse("2026-03-08T04:00:00Z"))
        ));

        mvc.perform(get("/calendar/2026"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Australian Grand Prix"));
    }

    @Test
    void unavailableProviderReturns502DacsFormat() throws Exception {
        when(f1Service.calendar(2026)).thenThrow(new F1Service.F1UnavailableException("down", new RuntimeException()));

        mvc.perform(get("/calendar/2026"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.status").value(502))
            .andExpect(jsonPath("$.code").value("conector_502"))
            .andExpect(jsonPath("$.description").exists())
            .andExpect(jsonPath("$.message").value("Bad Gateway"));
    }

    @Test
    void invalidRoundReturns400DacsFormat() throws Exception {
        when(f1Service.results(2026, 50)).thenThrow(new IllegalArgumentException("Ronda fuera de rango."));

        mvc.perform(get("/results/2026/50"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.code").value("conector_400"))
            .andExpect(jsonPath("$.description").value("Ronda fuera de rango."));
    }
}
