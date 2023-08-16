package main

import (
	"encoding/binary"
	"github.com/JAremko/ctl-api-example/thermalcamera"
	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
	"log"
)

/// Data from WebSockets

// HandleSetZoomLevel handles the SetZoomLevel command
func HandleSetZoomLevel(level int32) {
	log.Println("SetZoomLevel command received with level", level)
	SendPacketToC(SET_ZOOM_LEVEL, level)
}

// HandleSetColorScheme handles the SetColorScheme command
func HandleSetColorScheme(scheme thermalcamera.ColorScheme) {
	log.Println("SetColorScheme command received with scheme", thermalcamera.ColorScheme_name[int32(scheme)])
	SendPacketToC(SET_COLOR_SCHEME, int32(scheme))
}

/// Data from C pipes

// HandlePacketsFromC handles packets received from C and broadcasts them
func HandlePacketsFromC(cm *ConnectionManager, defaultState *DefaultState) error {
	for {
		// Handling various packets received from C
		packet, err := ReceivePacketFromC()
		if err != nil {
			log.Println("Error receiving packet:", err)
			return err
		}
		var payload thermalcamera.Payload
		switch packet.ID {
		case SET_ZOOM_LEVEL:
			zoomLevel := int32(binary.LittleEndian.Uint32(packet.Payload[:4]))
			payload.SetZoomLevel = &thermalcamera.SetZoomLevel{
				Level: zoomLevel,
			}
			defaultState.UpdateZoomLevel(zoomLevel) // Update zoom level
		case SET_COLOR_SCHEME:
			colorScheme := thermalcamera.ColorScheme(binary.LittleEndian.Uint32(packet.Payload[:4]))
			payload.SetColorScheme = &thermalcamera.SetColorScheme{
				Scheme: colorScheme,
			}
			defaultState.UpdateColorScheme(colorScheme) // Update color scheme
		case CHARGE_PACKET:
			charge := int32(binary.LittleEndian.Uint32(packet.Payload[:]))
			payload.AccChargeLevel = &thermalcamera.AccChargeLevel{
				Charge: charge,
			}
			defaultState.UpdateBatteryLevel(charge) // Update battery level
		default:
			log.Println("Unknown packet ID:", packet.ID)
		}
		message, err := proto.Marshal(&payload)
		if err != nil {
			log.Println("Error marshaling payload:", err)
			return err
		}
		cm.Broadcast(WriteRequest{websocket.BinaryMessage, message})
	}
}
