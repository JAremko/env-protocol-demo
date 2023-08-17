package main

import (
	"log"
	"net/http"
	"time"

	dp "github.com/JAremko/env-protocol-demo/demo_protocol"
	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func logPb(message string, pb proto.Message) {
	marshaler := jsonpb.Marshaler{EmitDefaults: true}
	jsonStr, err := marshaler.MarshalToString(pb)
	if err != nil {
		log.Printf("%s, but failed to convert protobuf to JSON: %v", message, err)
		return
	}
	log.Printf("%s: %s", message, jsonStr)
}

func handleWriteConnection(conn *websocket.Conn) {
	for {
		if err := sendDummyProfile(conn); err != nil {
			log.Println("Error sending dummy profile:", err)
			return
		}

		time.Sleep(1 * time.Second)
	}
}

func sendDummyProfile(conn *websocket.Conn) error {
	dummyHostPayload := &dp.HostPayload{
		Profile: &dp.HostProfile{
			ProfileName: "DummyProfile",
		},
	}

	protoPayload, err := proto.Marshal(dummyHostPayload)
	if err != nil {
		return err
	}

	return conn.WriteMessage(websocket.BinaryMessage, protoPayload)
}

func handleReadConnection(conn *websocket.Conn) {
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			return
		}
		if messageType == websocket.BinaryMessage {
			handleBinaryMessage(conn, p)
		}
	}
}

func handleBinaryMessage(conn *websocket.Conn, p []byte) {
	clientPayload := &dp.ClientPayload{}
	if err := proto.Unmarshal(p, clientPayload); err != nil {
		log.Println("Error unmarshaling ProtoBuf to ClientPayload:", err)
		return
	}

	logPb("Received ClientPayload", clientPayload)

	response := createResponse(clientPayload)

	responsePayload, err := proto.Marshal(response)
	if err != nil {
		log.Println("Error marshaling response to ProtoBuf:", err)
		return
	}

	if err := conn.WriteMessage(websocket.BinaryMessage, responsePayload); err != nil {
		log.Println("Write error:", err)
	}
}


func createResponse(clientPayload *dp.ClientPayload) *dp.HostPayload {
	response := &dp.HostPayload{}
	commandResponse := &dp.CommandResponse{}

	if clientPayload.GetCommand() != nil && isCommandNotEmpty(clientPayload.GetCommand()) {
		commandResponse.OneofCommandResponse =
			&dp.CommandResponse_StatusOk{
				StatusOk: &dp.StatusOk{Code: dp.OkStatusCode_SUCCESS},
			}
	} else {
		commandResponse.OneofCommandResponse =
			&dp.CommandResponse_StatusErr{
				StatusErr: &dp.StatusError{Code: dp.ErrorStatusCode_FAILURE},
			}
	}

	response.Response = commandResponse
	return response
}

func isCommandNotEmpty(command *dp.Command) bool {
	switch command.OneofCommand.(type) {
	case *dp.Command_SetZoom:
		return true
	case *dp.Command_SetPallette:
		return true
	case *dp.Command_SetAgc:
		return true
	case *dp.Command_SetDst:
		return true
	case *dp.Command_SetHoldoff:
		return true
	case *dp.Command_SetZeroing:
		return true
	case *dp.Command_SetMagOffset:
		return true
	case *dp.Command_SetAirTC:
		return true
	case *dp.Command_SetAirHum:
		return true
	case *dp.Command_SetAirPress:
		return true
	case *dp.Command_SetPowderTemp:
		return true
	case *dp.Command_SetWind:
		return true
	case *dp.Command_ButtonPress:
		return true
	case *dp.Command_CmdTrigger:
		return true
	default:
		return false
	}
}

func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	go handleWriteConnection(conn)
	handleReadConnection(conn)
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8085", nil))
}
