package main

import (
	"bytes"
	"fmt"
	"os"
	"time"
	"errors"
	"log"
)

// Define constants related to the pipes and data transfer
const (
	PIPE_NAME_TO_C   = "/tmp/toC"          // Path to the named pipe for sending data to C
	PIPE_NAME_FROM_C = "/tmp/fromC"        // Path to the named pipe for receiving data from C
	MaxPayloadSize   = 100024              // Maximum size of the data payload
)

var pipeToC *os.File    // File handler for sending data to C
var pipeFromC *os.File  // File handler for receiving data from C

// initPipes initializes the named pipes for communication.
func initPipes() {
	var err error
	log.Println("[Go] Initializing pipes...")

	// Loop until successfully opening the receive pipe from C
	for {
		log.Printf("[Go] Attempting to open %s...", PIPE_NAME_FROM_C)
		pipeFromC, err = os.OpenFile(PIPE_NAME_FROM_C, os.O_RDONLY, os.ModeNamedPipe)
		if err == nil {
			log.Printf("[Go] Successfully opened %s", PIPE_NAME_FROM_C)
			break
		} else {
			log.Printf("[Go] Failed to open %s. Error: %v", PIPE_NAME_FROM_C, err)
		}
		time.Sleep(1 * time.Second)
	}

	// Loop until successfully opening the send pipe to C
	for {
		log.Printf("[Go] Attempting to open %s...", PIPE_NAME_TO_C)
		pipeToC, err = os.OpenFile(PIPE_NAME_TO_C, os.O_WRONLY, os.ModeNamedPipe)
		if err == nil {
			log.Printf("[Go] Successfully opened %s", PIPE_NAME_TO_C)
			break
		} else {
			log.Printf("[Go] Failed to open %s. Error: %v", PIPE_NAME_TO_C, err)
		}
		time.Sleep(1 * time.Second)
	}
}

var readBuffer = make([]byte, 0, MaxPayloadSize) // Buffer for accumulating received data

// ReceivePacketFromC reads a packet from C over the named pipe
func ReceivePacketFromC() ([]byte, error) {
	tmpBuf := make([]byte, 256) // Temporary buffer for reading

	// Keep reading from the named pipe
	for {
		n, err := pipeFromC.Read(tmpBuf)
		if err != nil {
			pipeFromC.Close()
			pipeFromC, _ = os.Open(PIPE_NAME_FROM_C)
			return nil, err
		}

		// Append the read data to the readBuffer
		readBuffer = append(readBuffer, tmpBuf[:n]...)

		// Process packets within the readBuffer
		for {
			// Check if we have a packet delimiter (0 byte)
			if idx := bytes.IndexByte(readBuffer, 0); idx != -1 {
				packetData := readBuffer[:idx]
				readBuffer = readBuffer[idx+1:]

				decodedBuffer, err := Decode(packetData)
				if err != nil {
					return nil, err
				}

				fmt.Printf("[Go] Decoded buffer: %x\n", decodedBuffer)
				return decodedBuffer, nil

			} else {
				break
			}
		}
	}

	return nil, fmt.Errorf("[Go] Unreachable code")
}

// SendPacketToC sends a packet to C over the named pipe
func SendPacketToC(data *[]byte) error {
	cobsBuffer := Encode(*data)

	if cobsBuffer == nil {
		return fmt.Errorf("[Go] Failed to encode COBS for buffer of size %d", len(*data))
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

	// Write a delimiter to signify the end of the packet
	_, err = pipeToC.Write([]byte{0})
	if err != nil {
		return err
	}

	return nil
}

// closePipes closes the opened pipes.
func closePipes() {
	pipeToC.Close()
	pipeFromC.Close()
}

// Encoder interface defines methods for encoding and decoding byte slices
type Encoder interface {
	Encode(src []byte) []byte
	Decode(src []byte) ([]byte, error)
}

// ErrCorrupt is an error indicating corrupted input during decoding
var ErrCorrupt = errors.New("[Go] Cobs: corrupt input")

type encoder int

// New creates and returns a new COBS encoder/decoder
func New() Encoder {
	return encoder(0)
}

// Encode method implements the COBS encoding
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

// Decode method decodes a COBS-encoded byte slice
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

// Encode is a convenience function for COBS encoding
func Encode(src []byte) []byte { return encoder(0).Encode(src) }

// Decode is a convenience function for decoding COBS-encoded byte slice
func Decode(src []byte) ([]byte, error) { return encoder(0).Decode(src) }
