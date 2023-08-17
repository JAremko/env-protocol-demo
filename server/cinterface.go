package main

import (
	"bytes"
	"fmt"
	"os"
	"time"
	"errors"
)

// Constants
const (
	PIPE_NAME_TO_C   = "/tmp/toC"
	PIPE_NAME_FROM_C = "/tmp/fromC"
	MaxPayloadSize   = 100024
)

var pipeToC *os.File
var pipeFromC *os.File

func initPipes() {
	var err error
	for {
		pipeFromC, err = os.Open(PIPE_NAME_FROM_C)
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}
	for {
		pipeToC, err = os.OpenFile(PIPE_NAME_TO_C, os.O_WRONLY, os.ModeNamedPipe)
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}
}

var readBuffer = make([]byte, 0, MaxPayloadSize)

func ReceivePacketFromC() ([]byte, error) {
	// Small buffer for reading.
	tmpBuf := make([]byte, 256)

	for {
		n, err := pipeFromC.Read(tmpBuf)
		if err != nil {
			pipeFromC.Close()
			pipeFromC, _ = os.Open(PIPE_NAME_FROM_C)
			return nil, err
		}

		// Append to our readBuffer
		readBuffer = append(readBuffer, tmpBuf[:n]...)

		for { // Inner loop to process multiple packets within the same readBuffer
			// Check for delimiter
			if idx := bytes.IndexByte(readBuffer, 0); idx != -1 {
				// Split the buffer at the delimiter
				packetData := readBuffer[:idx]
				readBuffer = readBuffer[idx+1:]

				decodedBuffer, err := Decode(packetData)
				if err != nil {
					return nil, err
				}

				fmt.Printf("[Go] Decoded buffer: %x\n", decodedBuffer)
				return decodedBuffer, nil

			} else {
				// No more delimiters found in the current readBuffer
				break
			}
		}
	}

	return nil, fmt.Errorf("Unreachable code")
}

func SendPacketToC(data *[]byte) error {
	cobsBuffer := Encode(*data)

	if cobsBuffer == nil {
		return fmt.Errorf("Failed to encode COBS for buffer of size %d", len(*data))
	}

	fmt.Printf("[Go] Sending COBS buffer: %x\n", cobsBuffer)

	_, err := pipeToC.Write(cobsBuffer)
	if err != nil {
		pipeToC.Close()
		pipeToC, err = os.OpenFile(PIPE_NAME_TO_C, os.O_WRONLY, os.ModeNamedPipe)
		if err != nil {
			return err
		}
	}

	// Write the delimiter
	_, err = pipeToC.Write([]byte{0})
	if err != nil {
		return err
	}

	return nil
}

func closePipes() {
	pipeToC.Close()
	pipeFromC.Close()
}

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

// Encode encodes a byte slice with COBS
func Encode(src []byte) []byte { return encoder(0).Encode(src) }

// Decode decodes a COBS-encoded byte slice
func Decode(src []byte) ([]byte, error) { return encoder(0).Decode(src) }
