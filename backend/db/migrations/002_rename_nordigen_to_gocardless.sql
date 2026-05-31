-- GoCardless was previously branded Nordigen. Rename the provider tables
-- to match the new name. Data and foreign keys are preserved by RENAME TABLE.
RENAME TABLE NordigenToken TO GoCardlessToken,
             NordigenRequisition TO GoCardlessRequisition;
