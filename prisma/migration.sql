UPDATE StarlingToken SET access = accessToken, accessValidUntil = '2100-01-01', refreshValidUntil = '2100-01-01';
UPDATE TrueLayerToken SET access = accessToken, refresh = refreshToken, accessValidUntil = tokenValidUntil, refreshValidUntil = connectionValidUntil;
UPDATE NordigenRequisition SET institutionId = 'ABNAMRO_ABNANL2A';