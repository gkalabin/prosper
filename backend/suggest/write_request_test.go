package suggest

import (
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
)

// The helpers below build a draft field (a candidate slice) directly, so a
// test names a value without wrapping it in a slice literal at every field.

func idField(v int32) []*prosperv1.IdCandidate {
	return []*prosperv1.IdCandidate{{Confidence: confidenceObserved, Value: v}}
}

func learnedIDField(v int32) []*prosperv1.IdCandidate {
	return []*prosperv1.IdCandidate{{Confidence: confidenceLearned, Value: v}}
}

func moneyField(v int64, conf int32) []*prosperv1.MoneyCandidate {
	return []*prosperv1.MoneyCandidate{{Confidence: conf, ValueNanos: v}}
}

func strField(v string, conf int32) []*prosperv1.StringCandidate {
	return []*prosperv1.StringCandidate{{Confidence: conf, Value: v}}
}

// nameField builds the two name candidates a bank draft carries: the raw
// source text as a weak guess and the learned name that overrides it.
func nameField(raw, learned string) []*prosperv1.StringCandidate {
	return []*prosperv1.StringCandidate{
		{Confidence: confidenceWeak, Value: raw},
		{Confidence: confidenceLearned, Value: learned},
	}
}

func tsField(t time.Time) []*prosperv1.TimestampCandidate {
	return []*prosperv1.TimestampCandidate{{Confidence: confidenceObserved, Value: timestamppb.New(t)}}
}

func formField(ft prosperv1.FormType) []*prosperv1.FormTypeCandidate {
	return []*prosperv1.FormTypeCandidate{{Confidence: confidenceObserved, Value: ft}}
}

func sharingField(st prosperv1.SharingType) []*prosperv1.SharingTypeCandidate {
	return []*prosperv1.SharingTypeCandidate{{Confidence: confidenceLearned, Value: st}}
}

var fixedTime = time.Date(2026, 7, 7, 14, 32, 0, 0, time.UTC)

func TestWriteRequestExpenseNotShared(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-1"}},
		FormType:      formField(prosperv1.FormType_FORM_TYPE_EXPENSE),
		Timestamp:     tsField(fixedTime),
		Amount:        moneyField(24_990_000_000, confidenceObserved),
		AccountFromId: idField(7),
		CategoryId:    learnedIDField(3),
		Vendor:        nameField("AMAZON", "Amazon"),
	}
	req, err := WriteRequestFromDraft(d)
	if err != nil {
		t.Fatalf("WriteRequestFromDraft: %v", err)
	}
	e := req.GetExpense()
	if e == nil {
		t.Fatalf("expected expense form, got %T", req.Form)
	}
	if e.SharingType != prosperv1.SharingType_SHARING_TYPE_PAID_SELF_NOT_SHARED {
		t.Errorf("sharing type = %v, want NOT_SHARED", e.SharingType)
	}
	if e.AccountId == nil || *e.AccountId != 7 {
		t.Errorf("account id = %v, want 7", e.AccountId)
	}
	if e.CategoryId != 3 {
		t.Errorf("category id = %d, want 3 (learned winner)", e.CategoryId)
	}
	if e.Vendor != "Amazon" {
		t.Errorf("vendor = %q, want the learned winner Amazon", e.Vendor)
	}
	if e.AmountNanos != 24_990_000_000 {
		t.Errorf("amount = %d", e.AmountNanos)
	}
	// No own-share candidate: it defaults to the full amount, matching the form.
	if e.OwnShareNanos != e.AmountNanos {
		t.Errorf("own share = %d, want amount %d", e.OwnShareNanos, e.AmountNanos)
	}
	if !e.Timestamp.AsTime().Equal(fixedTime) {
		t.Errorf("timestamp = %v, want %v", e.Timestamp.AsTime(), fixedTime)
	}
	if len(req.Origins) != 1 || req.Origins[0].Key != "ob-1" {
		t.Errorf("origins = %v, want the draft's origin", req.Origins)
	}
}

func TestWriteRequestExpenseSharedFillsCompanionAndOwnShare(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:        []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-1"}},
		FormType:       formField(prosperv1.FormType_FORM_TYPE_EXPENSE),
		Timestamp:      tsField(fixedTime),
		Amount:         moneyField(24_990_000_000, confidenceObserved),
		AccountFromId:  idField(7),
		CategoryId:     learnedIDField(3),
		Vendor:         nameField("AMAZON", "Amazon"),
		SharingType:    sharingField(prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED),
		Companion:      strField("Jane", confidenceLearned),
		OwnShareAmount: moneyField(12_495_000_000, confidenceLearned),
	}
	req, err := WriteRequestFromDraft(d)
	if err != nil {
		t.Fatalf("WriteRequestFromDraft: %v", err)
	}
	e := req.GetExpense()
	if e.SharingType != prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED {
		t.Errorf("sharing type = %v, want SHARED", e.SharingType)
	}
	if e.Companion == nil || *e.Companion != "Jane" {
		t.Errorf("companion = %v, want Jane", e.Companion)
	}
	if e.OwnShareNanos != 12_495_000_000 {
		t.Errorf("own share = %d, want half", e.OwnShareNanos)
	}
}

func TestWriteRequestExpenseSharedMissingCompanionErrors(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-1"}},
		FormType:      formField(prosperv1.FormType_FORM_TYPE_EXPENSE),
		Timestamp:     tsField(fixedTime),
		Amount:        moneyField(24_990_000_000, confidenceObserved),
		AccountFromId: idField(7),
		CategoryId:    learnedIDField(3),
		Vendor:        nameField("AMAZON", "Amazon"),
		SharingType:   sharingField(prosperv1.SharingType_SHARING_TYPE_PAID_SELF_SHARED),
	}
	if _, err := WriteRequestFromDraft(d); err == nil {
		t.Fatal("expected error when a shared expense has no companion winner")
	}
}

func TestWriteRequestExpenseMissingCategoryErrors(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-1"}},
		FormType:      formField(prosperv1.FormType_FORM_TYPE_EXPENSE),
		Timestamp:     tsField(fixedTime),
		Amount:        moneyField(24_990_000_000, confidenceObserved),
		AccountFromId: idField(7),
		Vendor:        nameField("AMAZON", "Amazon"),
	}
	if _, err := WriteRequestFromDraft(d); err == nil {
		t.Fatal("expected error when an expense has no category winner")
	}
}

func TestWriteRequestExpenseTagsCarryOver(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-1"}},
		FormType:      formField(prosperv1.FormType_FORM_TYPE_EXPENSE),
		Timestamp:     tsField(fixedTime),
		Amount:        moneyField(24_990_000_000, confidenceObserved),
		AccountFromId: idField(7),
		CategoryId:    learnedIDField(3),
		Vendor:        nameField("AMAZON", "Amazon"),
		Tags: []*prosperv1.TagsCandidate{{
			Confidence: confidenceLearned,
			Value:      &prosperv1.TagNames{Names: []string{"groceries", "weekly"}},
		}},
	}
	req, err := WriteRequestFromDraft(d)
	if err != nil {
		t.Fatalf("WriteRequestFromDraft: %v", err)
	}
	if len(req.TagNames) != 2 || req.TagNames[0] != "groceries" || req.TagNames[1] != "weekly" {
		t.Errorf("tag names = %v, want [groceries weekly]", req.TagNames)
	}
}

func TestWriteRequestIncome(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:     []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-2"}},
		FormType:    formField(prosperv1.FormType_FORM_TYPE_INCOME),
		Timestamp:   tsField(fixedTime),
		Amount:      moneyField(1_000_000_000, confidenceObserved),
		AccountToId: idField(9),
		CategoryId:  learnedIDField(5),
		Payer:       strField("ACME", confidenceWeak),
	}
	req, err := WriteRequestFromDraft(d)
	if err != nil {
		t.Fatalf("WriteRequestFromDraft: %v", err)
	}
	in := req.GetIncome()
	if in == nil {
		t.Fatalf("expected income form, got %T", req.Form)
	}
	if in.AccountId != 9 {
		t.Errorf("account id = %d, want 9", in.AccountId)
	}
	if in.IsShared {
		t.Error("is_shared should be false without a shared sharing candidate")
	}
	if in.OwnShareNanos != in.AmountNanos {
		t.Errorf("own share = %d, want amount", in.OwnShareNanos)
	}
	if in.Payer != "ACME" {
		t.Errorf("payer = %q", in.Payer)
	}
}

func TestWriteRequestTransferRequiresReceivedAmount(t *testing.T) {
	d := &prosperv1.TransactionDraft{
		Origins:       []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "ob-3"}},
		FormType:      formField(prosperv1.FormType_FORM_TYPE_TRANSFER),
		Timestamp:     tsField(fixedTime),
		Amount:        moneyField(50_000_000_000, confidenceObserved),
		AccountFromId: idField(7),
		AccountToId:   idField(8),
	}
	if _, err := WriteRequestFromDraft(d); err == nil {
		t.Fatal("expected error when a transfer has no received amount winner")
	}

	d.AmountReceived = moneyField(50_000_000_000, confidenceObserved)
	req, err := WriteRequestFromDraft(d)
	if err != nil {
		t.Fatalf("WriteRequestFromDraft: %v", err)
	}
	tr := req.GetTransfer()
	if tr == nil {
		t.Fatalf("expected transfer form, got %T", req.Form)
	}
	if tr.AmountReceivedNanos != 50_000_000_000 {
		t.Errorf("received = %d, want the observed received amount", tr.AmountReceivedNanos)
	}
}

func TestWriteRequestMissingFormTypeErrors(t *testing.T) {
	if _, err := WriteRequestFromDraft(&prosperv1.TransactionDraft{}); err == nil {
		t.Fatal("expected error for a draft with no form type")
	}
}
