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
