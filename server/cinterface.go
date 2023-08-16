package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"os"
	"time"
)

// Constants
const (
	PIPE_NAME_TO_C   = "/tmp/toC"
	PIPE_NAME_FROM_C = "/tmp/fromC"
	SET_ZOOM_LEVEL   = 1
	SET_COLOR_SCHEME = 2
	CHARGE_PACKET    = 3
	MaxPayloadSize   = 1024
)

type Packet struct {
	ID      uint32
	Payload [MaxPayloadSize]byte
}

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

func ReceivePacketFromC() (*Packet, error) {
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

				if len(decodedBuffer) < 4 {
					return nil, fmt.Errorf("Decoded packet size mismatch. Expected at least 4 bytes, got %d bytes", len(decodedBuffer))
				}

				var packet Packet
				packet.ID = binary.LittleEndian.Uint32(decodedBuffer[:4])
				copy(packet.Payload[:], decodedBuffer[4:])

				return &packet, nil

			} else {
				// No more delimiters found in the current readBuffer
				break
			}
		}
	}

	return nil, fmt.Errorf("Unreachable code")
}

func SendPacketToC(packetID uint32, value int32) error {
	var buf [4 + 4]byte // ID + value (which is 4 bytes)

	binary.LittleEndian.PutUint32(buf[:4], packetID)
	binary.LittleEndian.PutUint32(buf[4:], uint32(value))

	cobsBuffer := Encode(buf[:])

	if cobsBuffer == nil {
		return fmt.Errorf("Failed to encode COBS for buffer of size %d", 4+4)
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
