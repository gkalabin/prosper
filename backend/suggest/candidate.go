package suggest

import (
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
)

// Confidence measures how sure the contributor is that its value is what the user will record.
const (
	// confidenceObserved: a fact the event's source reported (the bank's amount, account, timestamp).
	confidenceObserved = 100
	// confidenceLearned: a value inferred from the user's past recordings;
	confidenceLearned = 80
	// confidenceWeak: a fallback guess, e.g. the source's raw description
	// offered as a name when nothing else recognizes it.
	confidenceWeak = 50
)

// candidate is the shape every proto field-candidate message shares: a
// value carried with the confidence that the user will record it.
type candidate interface {
	GetConfidence() int32
}

// top returns the candidate with the highest confidence, keeping the
// earliest on ties; ok is false when the field has no candidates.
func top[C candidate](field []C) (C, bool) {
	var winner C
	ok := false
	for _, c := range field {
		if !ok || c.GetConfidence() > winner.GetConfidence() {
			winner, ok = c, true
		}
	}
	return winner, ok
}

// TopID, TopMoney, TopString, TopTimestamp, TopFormType, TopSharingType
// and TopTags read the winning value of a draft field: the value the
// user is most likely to record. ok is false when the field is empty.
// They are the shared way to read a resolved draft, used by the write
// path and by the notification renderer.
func TopID(field []*prosperv1.IdCandidate) (int32, bool) {
	c, ok := top(field)
	if !ok {
		return 0, false
	}
	return c.Value, true
}

func TopMoney(field []*prosperv1.MoneyCandidate) (int64, bool) {
	c, ok := top(field)
	if !ok {
		return 0, false
	}
	return c.ValueNanos, true
}

func TopString(field []*prosperv1.StringCandidate) (string, bool) {
	c, ok := top(field)
	if !ok {
		return "", false
	}
	return c.Value, true
}

func TopTimestamp(field []*prosperv1.TimestampCandidate) (*timestamppb.Timestamp, bool) {
	c, ok := top(field)
	if !ok {
		return nil, false
	}
	return c.Value, true
}

func TopFormType(field []*prosperv1.FormTypeCandidate) (prosperv1.FormType, bool) {
	c, ok := top(field)
	if !ok {
		return prosperv1.FormType_FORM_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func TopSharingType(field []*prosperv1.SharingTypeCandidate) (prosperv1.SharingType, bool) {
	c, ok := top(field)
	if !ok {
		return prosperv1.SharingType_SHARING_TYPE_UNSPECIFIED, false
	}
	return c.Value, true
}

func TopTags(field []*prosperv1.TagsCandidate) ([]string, bool) {
	c, ok := top(field)
	if !ok || c.Value == nil {
		return nil, false
	}
	return c.Value.Names, true
}

func addString(field *[]*prosperv1.StringCandidate, value string, confidence int32) {
	*field = append(*field, &prosperv1.StringCandidate{Confidence: confidence, Value: value})
}

func addMoney(field *[]*prosperv1.MoneyCandidate, valueNanos int64, confidence int32) {
	*field = append(*field, &prosperv1.MoneyCandidate{Confidence: confidence, ValueNanos: valueNanos})
}

func addID(field *[]*prosperv1.IdCandidate, value int32, confidence int32) {
	*field = append(*field, &prosperv1.IdCandidate{Confidence: confidence, Value: value})
}

func addTimestamp(field *[]*prosperv1.TimestampCandidate, value time.Time, confidence int32) {
	*field = append(*field, &prosperv1.TimestampCandidate{Confidence: confidence, Value: timestamppb.New(value)})
}

func addFormType(field *[]*prosperv1.FormTypeCandidate, value prosperv1.FormType, confidence int32) {
	*field = append(*field, &prosperv1.FormTypeCandidate{Confidence: confidence, Value: value})
}

func addTags(field *[]*prosperv1.TagsCandidate, names []string, confidence int32) {
	*field = append(*field, &prosperv1.TagsCandidate{Confidence: confidence, Value: &prosperv1.TagNames{Names: names}})
}
