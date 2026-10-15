package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.League;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface LeagueRepository extends JpaRepository<League, UUID> {
    @Query("select m.league from LeagueMember m where m.user.issuer = :issuer and m.user.subject = :subject order by m.league.createdAt desc")
    List<League> findForUser(String issuer, String subject);

    Optional<League> findByInviteCode(UUID inviteCode);
}
