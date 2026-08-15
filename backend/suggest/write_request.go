package suggest

import (
	"errors"
	"fmt"

	prosperv1 "prosper/gen/prosper/v1"
)

// WriteRequestFromDraft converts a resolved draft's winning candidates
// into a WriteTransactionForm request, ready for the same write path the
// web form uses.
func WriteRequestFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.WriteTransactionFormRequest, error) {
	formType, ok := TopFormType(d.FormType)
	if !ok {
		return nil, errors.New("draft has no form type")
	}
	req := &prosperv1.WriteTransactionFormRequest{Origins: d.Origins}
	if names, ok := TopTags(d.Tags); ok {
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
	timestamp, ok := TopTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amount, ok := TopMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	categoryID, ok := TopID(d.CategoryId)
	if !ok {
		return nil, missingField("category")
	}
	accountID, ok := TopID(d.AccountFromId)
	if !ok {
		return nil, missingField("account")
	}
	sharingType := prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED
	if st, ok := TopSharingType(d.SharingType); ok {
		sharingType = st
	}
	ownShare := amount
	if os, ok := TopMoney(d.OwnShareAmount); ok {
		ownShare = os
	}
	vendor, _ := TopString(d.Vendor)
	description, _ := TopString(d.Description)
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
	if tripName, ok := TopString(d.TripName); ok {
		expense.TripName = &tripName
	}
	switch sharingType {
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED:
		return expense, nil
	case prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED:
		companion, ok := TopString(d.Companion)
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
	timestamp, ok := TopTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amount, ok := TopMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	categoryID, ok := TopID(d.CategoryId)
	if !ok {
		return nil, missingField("category")
	}
	accountID, ok := TopID(d.AccountToId)
	if !ok {
		return nil, missingField("account")
	}
	ownShare := amount
	if os, ok := TopMoney(d.OwnShareAmount); ok {
		ownShare = os
	}
	payer, _ := TopString(d.Payer)
	description, _ := TopString(d.Description)
	// A draft carries sharing intent as a SharingType regardless of form.
	// The only shared state the pipeline proposes is PAID_SELF_SHARED, and
	// income only distinguishes shared from not, so it maps to is_shared.
	isShared := false
	if st, ok := TopSharingType(d.SharingType); ok {
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
		companion, ok := TopString(d.Companion)
		if !ok {
			return nil, missingField("companion")
		}
		income.Companion = &companion
	}
	if parentID, ok := TopID(d.ParentTransactionId); ok {
		income.ParentTransactionId = &parentID
	}
	return income, nil
}

func transferInputFromDraft(d *prosperv1.TransactionDraft) (*prosperv1.TransferFormInput, error) {
	timestamp, ok := TopTimestamp(d.Timestamp)
	if !ok {
		return nil, missingField("timestamp")
	}
	amountSent, ok := TopMoney(d.Amount)
	if !ok {
		return nil, missingField("amount")
	}
	fromAccountID, ok := TopID(d.AccountFromId)
	if !ok {
		return nil, missingField("from account")
	}
	toAccountID, ok := TopID(d.AccountToId)
	if !ok {
		return nil, missingField("to account")
	}
	// Both legs of a transfer are observed from the bank, so the received
	// amount is always known — for a same-currency move it equals the sent
	// amount, for a conversion it is the deposit leg. A draft without it
	// cannot be recorded from one tap; the user completes it in the app.
	amountReceived, ok := TopMoney(d.AmountReceived)
	if !ok {
		return nil, missingField("received amount")
	}
	description, _ := TopString(d.Description)
	transfer := &prosperv1.TransferFormInput{
		Timestamp:           timestamp,
		Description:         description,
		FromAccountId:       fromAccountID,
		ToAccountId:         toAccountID,
		AmountSentNanos:     amountSent,
		AmountReceivedNanos: amountReceived,
	}
	if categoryID, ok := TopID(d.CategoryId); ok {
		transfer.CategoryId = &categoryID
	}
	return transfer, nil
}

func missingField(name string) error {
	return fmt.Errorf("draft has no %s winner", name)
}
