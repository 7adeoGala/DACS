package ar.edu.dacs.apexpredict.application;

import java.time.*;
import java.util.List;

/** Puerto de consulta; los controladores no conocen el formato de Jolpica. */
public interface F1DataProvider {
    List<Race> calendar(int season);
    List<Finish> results(int season, int round);
    record Race(int season, int round, String name, String circuit, String country, LocalDate date, Instant startsAt) {}
    record Finish(int position, String driverId, String driverName, String constructorName, String status) {}
}
