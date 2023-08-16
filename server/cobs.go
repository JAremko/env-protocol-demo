// Package cobs implements Consistent Overhead Byte Stuffing encoding and decoding.
//
// References:
//
//	https://en.wikipedia.org/wiki/Consistent_Overhead_Byte_Stuffing and
//	http://conferences.sigcomm.org/sigcomm/1997/papers/p062.pdf
//	https://tools.ietf.org/html/draft-ietf-pppext-cobs-00 (slightly incompatible encoding)
package main

import "errors"

// TODO(dgryski): fix api to allow passing in decode buffer

// Encoder encodes and decodes byte slices
type Encoder interface {
	Encode(src []byte) []byte
	Decode(src []byte) ([]byte, error)
}

// ErrCorrupt indicates the input was corrupt
var ErrCorrupt = errors.New("cobs: corrupt input")

type encoder int

// New returns a codec for COBS encoding/decoding
func New() Encoder {
	return encoder(0)
}

func (encoder) Encode(src []byte) (dst []byte) {

	// guess at how much extra space we need
	var l int
	l = int(float64(len(src)) * 1.04)

	if len(src) == 0 {
		return []byte{}
	}

	dst = make([]byte, 1, l)

	codePtr := 0
	code := byte(0x01)

	for _, b := range src {
		if b == 0 {
			dst[codePtr] = code
			codePtr = len(dst)
			dst = append(dst, 0)
			code = byte(0x01)
			continue
		}

		dst = append(dst, b)
		code++
		if code == 0xFF {
			dst[codePtr] = code
			codePtr = len(dst)
			dst = append(dst, 0)
			code = byte(0x01)
		}
	}

	dst[codePtr] = code

	return dst
}

func (encoder) Decode(src []byte) (dst []byte, err error) {

	dst = make([]byte, 0, len(src))

	var ptr = 0

	for ptr < len(src) {
		code := src[ptr]

		if ptr+int(code) > len(src) {
			return nil, ErrCorrupt
		}

		ptr++

		for i := 1; i < int(code); i++ {
			dst = append(dst, src[ptr])
			ptr++
		}
		if code < 0xFF {
			dst = append(dst, 0)
		}
	}

	if len(dst) == 0 {
		return dst, nil
	}

	return dst[0 : len(dst)-1], nil // trim phantom zero
}

type zpe int

// NewZPE returns a codec for COBS/ZPE encoding/decoding
func NewZPE() Encoder {
	return zpe(0)
}

func (zpe) Encode(src []byte) (dst []byte) {

	// guess at how much extra space we need
	l := int(float64(len(src)) * 1.045)

	if len(src) == 0 {
		return []byte{}
	}

	dst = make([]byte, 1, l)

	codePtr := 0
	code := byte(0x01)

	wantPair := false
	for _, b := range src {

		if wantPair {
			wantPair = false // only valid for next byte
			if b == 0 {
				// assert code < 31
				code |= 0xE0
				dst[codePtr] = code
				codePtr = len(dst)
				dst = append(dst, 0)
				code = byte(0x01)
				continue
			}

			// was looking for a pair of zeros but didn't find it -- encode as normal
			dst[codePtr] = code
			codePtr = len(dst)
			dst = append(dst, 0)
			code = byte(0x01)

			dst = append(dst, b)
			code++

			continue
		}

		if b == 0 {
			if code < 31 {
				wantPair = true
				continue
			}

			// too long to encode with ZPE -- encode as normal
			dst[codePtr] = code
			codePtr = len(dst)
			dst = append(dst, 0)
			code = byte(0x01)
			continue
		}

		dst = append(dst, b)
		code++
		if code == 0xE0 {
			dst[codePtr] = code
			codePtr = len(dst)
			dst = append(dst, 0)
			code = byte(0x01)
		}
	}

	if wantPair {
		// assert(code < 31)
		code = 0xE0 | code
	}

	dst[codePtr] = code
	return dst
}

func (zpe) Decode(src []byte) (dst []byte, err error) {

	dst = make([]byte, 0, len(src))

	var ptr = 0

	for ptr < len(src) {
		code := src[ptr]

		l := int(code)

		if code > 0xE0 {
			l = int(code & 0x1F)
		}

		if ptr+l > len(src) {
			return nil, ErrCorrupt
		}

		ptr++
		for i := 1; i < l; i++ {
			dst = append(dst, src[ptr])
			ptr++
		}

		switch {
		case code > 0xE0:
			dst = append(dst, 0)
			dst = append(dst, 0)
		case code < 0xE0:
			dst = append(dst, 0)
		case code == 0xE0:
			// nothing
		}

	}

	if len(dst) == 0 {
		return dst, nil
	}

	return dst[0 : len(dst)-1], nil // trim phantom zero
}

// Encode encodes a byte slice with COBS
func Encode(src []byte) []byte { return encoder(0).Encode(src) }

// Decode decodes a COBS-encoded byte slice
func Decode(src []byte) ([]byte, error) { return encoder(0).Decode(src) }

// EncodeZPE encodes a byte slice with COBS/ZPE
func EncodeZPE(src []byte) []byte { return zpe(0).Encode(src) }

// DecodeZPE decodes a COBS/ZPE-encoded byte slice
func DecodeZPE(src []byte) ([]byte, error) { return zpe(0).Decode(src) }
