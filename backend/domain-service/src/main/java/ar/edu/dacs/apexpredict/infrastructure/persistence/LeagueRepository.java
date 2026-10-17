package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.League;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface LeagueRepository extends JpaRepository<League, UUID> {
    @Query("select m.league from LeagueMember m where m.user.issuer = :issuer and m.user.subject = :subject order by m.league.createdAt desc")
    List<League> findForUser(@Param("issuer") String issuer, @Param("subject") String subject);

    Optional<League> findByInviteCode(UUID inviteCode);

    @Query("select l from League l where :query is null or :query = '' or lower(l.name) like lower(concat('%', :query, '%')) order by l.createdAt desc")
    List<League> searchLeagues(@Param("query") String query);
}
