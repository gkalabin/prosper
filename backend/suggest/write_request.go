package suggest

import (
	"errors"
	"fmt"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
)

// WriteRequestFromDraft converts a resolved draft's winning candidates
// into a WriteTransactionForm request, ready for the same write path the
// web form uses.
func WriteRequestFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.WriteTransactionFormRequest, error) {
	formType, ok := topFormType(d.FormType)
	if !ok {
		return nil, errors.New("draft has no form type")
	}
	req := &prosperv1.WriteTransactionFormRequest{Origins: d.Origins}
	if names, ok := topTags(d.Tags); ok {
		req.TagNames = names
	}
	switch formType {
	case prosperv1.FormType_FORM_TYPE_EXPENSE:
		expense, err := expenseInputFromDraft(d)
		if err != nil {
			return nil, err
		}
		req.Form = &prosperv1.WriteTransactionFormRequest_Expense{Expense: expense}
	case prosperv1.FormType_FORM_TYPE_INCOME:
		income, err := incomeInputFromDraft(d)
		if err != nil {
			return nil, err
		}
		req.Form = &prosperv1.WriteTransactionFormRequest_Income{Income: income}
	case prosperv1.FormType_FORM_TYPE_TRANSFER:
		transfer, err := transferInputFromDraft(d)
		if err != nil {
			return nil, err
		}
		req.Form = &prosperv1.WriteTransactionFormRequest_Transfer{Transfer: transfer}
	default:
		return nil, fmt.Errorf("unsupported form type %v", formType)
	}
	return req, nil
}

func expenseInputFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.ExpenseFormInput, error) {
	timestamp, ok := topTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amount, ok := topMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	categoryID, ok := topID(d.CategoryId)
	if !ok {
		return nil, missingField("category")
	}
	accountID, ok := topID(d.AccountFromId)
	if !ok {
		return nil, missingField("account")
	}
	sharingType := prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED
	if st, ok := topSharingType(d.SharingType); ok {
		sharingType = st
	}
	ownShare := amount
	if os, ok := topMoney(d.OwnShareAmount); ok {
		ownShare = os
	}
	vendor, _ := topString(d.Vendor)
	description, _ := topString(d.Description)
	expense := &prosperv1.ExpenseFormInput{
		Timestamp:     timestamp,
		Description:   description,
		Vendor:        vendor,
		CategoryId:    categoryID,
		AccountId:     &accountID,
		AmountNanos:   amount,
		OwnShareNanos: ownShare,
		SharingType:   sharingType,
	}
	if tripName, ok := topString(d.TripName); ok {
		expense.TripName = &tripName
	}
	switch sharingType {
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED:
		return expense, nil
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED:
		companion, ok := topString(d.Companion)
		if !ok {
			return nil, missingField("companion")
		}
		expense.Companion = &companion
		return expense, nil
	default:
		return nil, fmt.Errorf("sharing type %v not supported for one-tap add", sharingType)
	}
}

func incomeInputFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.IncomeFormInput, error) {
	timestamp, ok := topTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amount, ok := topMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	categoryID, ok := topID(d.CategoryId)
	if !ok {
		return nil, missingField("category")
	}
	accountID, ok := topID(d.AccountToId)
	if !ok {
		return nil, missingField("account")
	}
	ownShare := amount
	if os, ok := topMoney(d.OwnShareAmount); ok {
		ownShare = os
	}
	payer, _ := topString(d.Payer)
	description, _ := topString(d.Description)
	isShared := false
	if st, ok := topSharingType(d.SharingType); ok {
		isShared = st == prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED
	}
	income := &prosperv1.IncomeFormInput{
		Timestamp:     timestamp,
		Description:   description,
		Payer:         payer,
		CategoryId:    categoryID,
		AccountId:     accountID,
		AmountNanos:   amount,
		IsShared:      isShared,
		OwnShareNanos: ownShare,
	}
	if isShared {
		companion, ok := topString(d.Companion)
		if !ok {
			return nil, missingField("companion")
		}
		income.Companion = &companion
	}
	if parentID, ok := topID(d.ParentTransactionId); ok {
		income.ParentTransactionId = &parentID
	}
	return income, nil
}

func transferInputFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.TransferFormInput, error) {
	timestamp, ok := topTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amountSent, ok := topMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	fromAccountID, ok := topID(d.AccountFromId)
	if !ok {
		return nil, missingField("from account")
	}
	toAccountID, ok := topID(d.AccountToId)
	if !ok {
		return nil, missingField("to account")
	}
	amountReceived := amountSent
	if ar, ok := topMoney(d.AmountReceived); ok {
		amountReceived = ar
	}
	description, _ := topString(d.Description)
	transfer := &prosperv1.TransferFormInput{
		Timestamp:           timestamp,
		Description:         description,
		FromAccountId:       fromAccountID,
		ToAccountId:         toAccountID,
		AmountSentNanos:     amountSent,
		AmountReceivedNanos: amountReceived,
	}
	if categoryID, ok := topID(d.CategoryId); ok {
		transfer.CategoryId = &categoryID
	}
	return transfer, nil
}

func missingField(name string) error {
	return fmt.Errorf("draft has no %s winner", name)
}

func topID(field []*prosperv1.IdCandidate) (int32, bool) {
	c, ok := top(field)
	if !ok {
		return 0, false
	}
	return c.Value, true
}

func topMoney(field []*prosperv1.MoneyCandidate) (int64, bool) {
	c, ok := top(field)
	if !ok {
		return 0, false
	}
	return c.ValueNanos, true
}

func topString(field []*prosperv1.StringCandidate) (string, bool) {
	c, ok := top(field)
	if !ok {
		return "", false
	}
	return c.Value, true
}

func topTimestamp(field []*prosperv1.TimestampCandidate) (*timestamppb.Timestamp, bool) {
	c, ok := top(field)
	if !ok {
		return nil, false
	}
	return c.Value, true
}

func topFormType(field []*prosperv1.FormTypeCandidate) (prosperv1.FormType, bool) {
	c, ok := top(field)
	if !ok {
		return prosperv1.FormType_FORM_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func topSharingType(field []*prosperv1.SharingTypeCandidate) (prosperv1.SharingType, bool) {
	c, ok := top(field)
	if !ok {
		return prosperv1.SharingType_SHARING_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func topTags(field []*prosperv1.TagsCandidate) ([]string, bool) {
	c, ok := top(field)
	if !ok || c.Value == nil {
		return nil, false
	}
	return c.Value.Names, true
}
