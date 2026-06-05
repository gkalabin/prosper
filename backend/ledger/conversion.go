package ledger

import (
	"fmt"
	"log"
	"slices"
	"strconv"
	"strings"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

func bankToProto(b *model.Bank) *prosperv1.Bank {
	return &prosperv1.Bank{
		Id:           b.ID,
		Name:         b.Name,
		DisplayOrder: b.DisplayOrder,
	}
}

func bankAccountToProto(a *model.BankAccount) *prosperv1.BankAccount {
	return &prosperv1.BankAccount{
		Id:                  a.ID,
		Name:                a.Name,
		BankId:              a.BankID,
		CurrencyCode:        a.CurrencyCode,
		Stock:               stockKey(a.StockExchange, a.StockTicker),
		Joint:               a.Joint,
		Archived:            a.Archived,
		DisplayOrder:        a.DisplayOrder,
		InitialBalanceCents: a.InitialBalanceCents,
	}
}

func categoryToProto(c *model.Category) *prosperv1.Category {
	return &prosperv1.Category{
		Id:               c.ID,
		Name:             c.Name,
		DisplayOrder:     c.DisplayOrder,
		ParentCategoryId: c.ParentCategoryID,
	}
}

func tagToProto(t *model.Tag) *prosperv1.Tag {
	return &prosperv1.Tag{Id: t.ID, Name: t.Name}
}

func tripToProto(t *model.Trip) *prosperv1.Trip {
	out := &prosperv1.Trip{
		Id:          t.ID,
		Name:        t.Name,
		Country:     t.Country,
		City:        t.City,
		Destination: t.Destination,
	}
	if t.Start != nil {
		out.Start = timestamppb.New(*t.Start)
	}
	if t.End != nil {
		out.End = timestamppb.New(*t.End)
	}
	return out
}

func stockToProto(s *model.Stock) *prosperv1.Stock {
	return &prosperv1.Stock{
		Name:         s.Name,
		Exchange:     s.Exchange,
		Ticker:       s.Ticker,
		CurrencyCode: s.CurrencyCode,
	}
}

// stockKey wraps the (exchange, ticker) pair into a StockKey, returning
// nil when the row is not stock-denominated.
func stockKey(exchange, ticker *string) *prosperv1.StockKey {
	if exchange == nil || ticker == nil {
		return nil
	}
	return &prosperv1.StockKey{Exchange: *exchange, Ticker: *ticker}
}

func displaySettingsToProto(d *model.DisplaySettings) *prosperv1.DisplaySettings {
	return &prosperv1.DisplaySettings{
		DisplayCurrencyCode:       d.DisplayCurrencyCode,
		ExcludeCategoryIdsInStats: parseCategoryIDs(d.ExcludeCategoryIdsInStats),
	}
}

// parseCategoryIDs decodes the comma-separated list stored in
// DisplaySettings.excludeCategoryIdsInStats into its int32 components.
func parseCategoryIDs(s string) []int32 {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]int32, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		id, err := strconv.ParseInt(trimmed, 10, 32)
		if err != nil {
			log.Printf("ledger: skipping malformed excludeCategoryIdsInStats entry %q: %v", trimmed, err)
			continue
		}
		if id <= 0 {
			log.Printf("ledger: skipping non-positive excludeCategoryIdsInStats entry %q", trimmed)
			continue
		}
		out = append(out, int32(id))
	}
	return out
}

// formatCategoryIDs is the inverse of parseCategoryIDs.
func formatCategoryIDs(ids []int32) string {
	sorted := slices.Clone(ids)
	slices.Sort(sorted)
	sorted = slices.Compact(sorted)
	parts := make([]string, 0, len(sorted))
	for _, id := range sorted {
		parts = append(parts, strconv.FormatInt(int64(id), 10))
	}
	return strings.Join(parts, ",")
}

func entryLineToProto(l *model.EntryLine) *prosperv1.EntryLine {
	return &prosperv1.EntryLine{
		Id:              l.ID,
		TransactionId:   l.TransactionID,
		LedgerAccountId: l.LedgerAccountID,
		CurrencyCode:    l.CurrencyCode,
		Stock:           stockKey(l.StockExchange, l.StockTicker),
		AmountNanos:     l.AmountNanos,
	}
}

func splitContextToProto(s *model.SplitContext) *prosperv1.SplitContext {
	return &prosperv1.SplitContext{
		Id:                  s.ID,
		TransactionId:       s.TransactionID,
		CompanionName:       s.CompanionName,
		CompanionShareNanos: s.CompanionShareNanos,
		CompanionPaidNanos:  s.CompanionPaidNanos,
	}
}

func transactionPrototypeToProto(p *model.TransactionPrototype) *prosperv1.TransactionPrototype {
	return &prosperv1.TransactionPrototype{
		ExternalId:            p.ExternalID,
		ExternalDescription:   p.ExternalDescription,
		InternalTransactionId: p.InternalTransactionID,
	}
}

var transactionTypeToProto = map[model.TransactionType]prosperv1.TransactionType{
	model.TransactionExpense:           prosperv1.TransactionType_TRANSACTION_TYPE_EXPENSE,
	model.TransactionIncome:            prosperv1.TransactionType_TRANSACTION_TYPE_INCOME,
	model.TransactionTransfer:          prosperv1.TransactionType_TRANSACTION_TYPE_TRANSFER,
	model.TransactionThirdPartyExpense: prosperv1.TransactionType_TRANSACTION_TYPE_THIRD_PARTY_EXPENSE,
	model.TransactionOpeningBalance:    prosperv1.TransactionType_TRANSACTION_TYPE_OPENING_BALANCE,
}

var ledgerAccountTypeToProto = map[model.LedgerAccountType]prosperv1.LedgerAccountType{
	model.LedgerAccountAsset:            prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_ASSET,
	model.LedgerAccountExpense:          prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_EXPENSE,
	model.LedgerAccountIncome:           prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_INCOME,
	model.LedgerAccountEquity:           prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_EQUITY,
	model.LedgerAccountCurrencyExchange: prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_CURRENCY_EXCHANGE,
	model.LedgerAccountReceivable:       prosperv1.LedgerAccountType_LEDGER_ACCOUNT_TYPE_RECEIVABLE,
}

var transactionLinkTypeToProto = map[model.TransactionLinkType]prosperv1.TransactionLinkType{
	model.LinkRefund:       prosperv1.TransactionLinkType_TRANSACTION_LINK_TYPE_REFUND,
	model.LinkDebtSettling: prosperv1.TransactionLinkType_TRANSACTION_LINK_TYPE_DEBT_SETTLING,
}

func transactionToProto(t *model.Transaction) (*prosperv1.Transaction, error) {
	typ, ok := transactionTypeToProto[t.Type]
	if !ok {
		return nil, fmt.Errorf("unknown transaction type %q", t.Type)
	}
	return &prosperv1.Transaction{
		Id:           t.ID,
		Iid:          t.IID,
		Timestamp:    timestamppb.New(t.Timestamp),
		Note:         t.Note,
		Type:         typ,
		Vendor:       t.Vendor,
		Payer:        t.Payer,
		CategoryId:   t.CategoryID,
		TripId:       t.TripID,
		SupersedesId: t.SupersedesID,
		IsVoid:       t.IsVoid,
	}, nil
}

func ledgerAccountToProto(a *model.LedgerAccount) (*prosperv1.LedgerAccount, error) {
	typ, ok := ledgerAccountTypeToProto[a.Type]
	if !ok {
		return nil, fmt.Errorf("unknown ledger account type %q", a.Type)
	}
	return &prosperv1.LedgerAccount{
		Id:            a.ID,
		Name:          a.Name,
		Type:          typ,
		BankAccountId: a.BankAccountID,
	}, nil
}

func transactionLinkToProto(l *model.TransactionLink) (*prosperv1.TransactionLink, error) {
	typ, ok := transactionLinkTypeToProto[l.LinkType]
	if !ok {
		return nil, fmt.Errorf("unknown transaction link type %q", l.LinkType)
	}
	return &prosperv1.TransactionLink{
		Id:                  l.ID,
		SourceTransactionId: l.SourceTransactionID,
		LinkedTransactionId: l.LinkedTransactionID,
		LinkType:            typ,
	}, nil
}
