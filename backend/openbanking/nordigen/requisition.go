package nordigen

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
	"prosper/openbanking/httpx"
)

const (
	requisitionsURL  = apiBase + "/requisitions/"
	accountDetailURL = apiBase + "/accounts/%s/details/"
	// requisitionLife is the conservative end of Nordigen's 90-180
	// day requisition lifetime; we report this as the connection expiry.
	requisitionLife = 90 * 24 * time.Hour
)

type requisitionResponse struct {
	ID   string `json:"id"`
	Link string `json:"link"`
}

type requisitionAccounts struct {
	Accounts []string `json:"accounts"`
}

type accountDetails struct {
	Account struct {
		OwnerName string `json:"ownerName"`
		IBAN      string `json:"iban"`
		Currency  string `json:"currency"`
	} `json:"account"`
}

// CreateRequisition kicks off a Nordigen authorization flow for the
// chosen institution. Returns the local reference (stored alongside
// the requisition record) and the hosted authorization link the user
// should be redirected to.
func (n *Provider) CreateRequisition(ctx context.Context, userID, bankID int32, institutionID string) (reference, authLink string, err error) {
	access, wasReconnect, err := n.ensureToken(ctx, userID, bankID)
	if err != nil {
		return "", "", err
	}
	reference = newRequisitionReference()
	body, _ := json.Marshal(map[string]string{
		"redirect":       n.redirectURI(),
		"institution_id": institutionID,
		"reference":      reference,
	})
	var rr requisitionResponse
	if err := n.nordigenJSON(ctx, http.MethodPost, requisitionsURL, access, body, &rr); err != nil {
		return "", "", err
	}
	row := model.NordigenRequisition{
		ID:            reference,
		RequisitionID: rr.ID,
		InstitutionID: institutionID,
		UserID:        userID,
		BankID:        bankID,
		Completed:     false,
		WasReconnect:  wasReconnect,
	}
	if _, err := n.db.NamedExecForUser(ctx, userID,
		`INSERT INTO NordigenRequisition
		        ( id,  requisitionId,  institutionId,  userId,  bankId,  completed,  wasReconnect)
		 VALUES (:id, :requisitionId, :institutionId, :userId, :bankId, :completed, :wasReconnect)
		 ON DUPLICATE KEY UPDATE id            = VALUES(id),
		                         requisitionId = VALUES(requisitionId),
		                         institutionId = VALUES(institutionId),
		                         completed     = VALUES(completed),
		                         wasReconnect  = VALUES(wasReconnect)`,
		row); err != nil {
		return "", "", err
	}
	return reference, rr.Link, nil
}

// newRequisitionReference returns an opaque, app-unique reference.
func newRequisitionReference() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%x", b)
}

// CompleteRequisition marks the requisition with the supplied
// reference as completed. Returns the bank id it belongs to and
// whether the requisition was created as part of a reconnect.
func (n *Provider) CompleteRequisition(ctx context.Context, userID int32, reference string) (int32, bool, error) {
	var row model.NordigenRequisition
	if err := n.db.GetForUser(ctx, &row, userID,
		`SELECT *
		   FROM NordigenRequisition
		  WHERE id     = :id
		    AND userId = :userId`,
		map[string]any{"id": reference}); err != nil {
		return 0, false, err
	}
	if _, err := n.db.ExecForUser(ctx, userID,
		`UPDATE NordigenRequisition
		    SET completed = TRUE
		  WHERE id     = :id
		    AND userId = :userId`,
		map[string]any{"id": reference}); err != nil {
		return 0, false, err
	}
	return row.BankID, row.WasReconnect, nil
}

// ListExternalAccounts enumerates the external accounts attached to
// the requisition for this bank.
func (n *Provider) ListExternalAccounts(ctx context.Context, userID, bankID int32) ([]*prosperv1.ExternalAccount, error) {
	access, err := n.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	requisitionID, err := n.requisitionID(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	var r requisitionAccounts
	if err := n.getJSON(ctx, fmt.Sprintf("%s%s/", requisitionsURL, requisitionID), access, &r); err != nil {
		return nil, err
	}
	out := make([]*prosperv1.ExternalAccount, 0, len(r.Accounts))
	for _, accID := range r.Accounts {
		var d accountDetails
		if err := n.getJSON(ctx, fmt.Sprintf(accountDetailURL, accID), access, &d); err != nil {
			log.Printf("nordigen: account %s details: %v", accID, err)
			continue
		}
		name := fmt.Sprintf("%s (%s %s)", d.Account.OwnerName, d.Account.Currency, d.Account.IBAN)
		out = append(out, &prosperv1.ExternalAccount{ExternalId: accID, Name: name})
	}
	return out, nil
}

// requisitionID returns the Nordigen requisition id stored against
// (user, bank). Missing or unconnected pairs are reported as errors —
// callers should treat them as "not connected".
func (n *Provider) requisitionID(ctx context.Context, userID, bankID int32) (string, error) {
	var id string
	if err := n.db.GetForUser(ctx, &id, userID,
		`SELECT requisitionId
		   FROM NordigenRequisition
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("nordigen: bank %d not connected", bankID)
		}
		return "", err
	}
	return id, nil
}

// ConnectionExpiresAt returns when the Nordigen requisition for this
// bank is expected to expire.
func (n *Provider) ConnectionExpiresAt(ctx context.Context, userID, bankID int32) (time.Time, error) {
	var createdAt time.Time
	if err := n.db.GetForUser(ctx, &createdAt, userID,
		`SELECT createdAt
		   FROM NordigenRequisition
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, fmt.Errorf("nordigen: bank %d not connected", bankID)
		}
		return time.Time{}, err
	}
	return createdAt.Add(requisitionLife), nil
}

// LastInstitutionID returns the institution behind the most recent
// requisition for a bank, used by the reconnect flow.
func (n *Provider) LastInstitutionID(ctx context.Context, userID, bankID int32) (string, error) {
	var id string
	err := n.db.GetForUser(ctx, &id, userID,
		`SELECT institutionId
		   FROM NordigenRequisition
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID})
	if errors.Is(err, sql.ErrNoRows) {
		return "", fmt.Errorf("nordigen: bank %d not connected", bankID)
	}
	return id, err
}

// Disconnect best-effort revokes the requisition at Nordigen and
// deletes both the requisition row and the access tokens.
func (n *Provider) Disconnect(ctx context.Context, userID, bankID int32) error {
	var requisitionID string
	err := n.db.GetForUser(ctx, &requisitionID, userID,
		`SELECT requisitionId
		   FROM NordigenRequisition
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if requisitionID != "" {
		if access, accErr := n.accessToken(ctx, userID, bankID); accErr == nil {
			n.bestEffortRevoke(ctx, requisitionID, access)
		}
	}
	if _, err := n.db.ExecForUser(ctx, userID,
		`DELETE FROM NordigenRequisition
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return err
	}
	if _, err := n.db.ExecForUser(ctx, userID,
		`DELETE FROM NordigenToken
		  WHERE bankId = :bankId
		    AND userId = :userId`,
		map[string]any{"bankId": bankID}); err != nil {
		return err
	}
	return nil
}

// bestEffortRevoke calls Nordigen's DELETE /requisitions endpoint and
// drains the response. Failures are logged so a permanently broken
// upstream surfaces in the logs, but the caller proceeds either way.
func (n *Provider) bestEffortRevoke(ctx context.Context, requisitionID, access string) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodDelete,
		fmt.Sprintf("%s%s/", requisitionsURL, requisitionID), nil)
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := n.httpClient.Do(req)
	if err != nil {
		log.Printf("nordigen: revoke requisition %s: %v", requisitionID, err)
		return
	}
	defer resp.Body.Close()
	if !httpx.IsSuccess(resp.StatusCode) {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("nordigen: revoke requisition %s HTTP %d: %s", requisitionID, resp.StatusCode, string(body))
		return
	}
	io.Copy(io.Discard, resp.Body)
}
