package main

import (
	"log"
	"net/http"

	"github.com/bufbuild/protovalidate-go"
	dp "github.com/JAremko/env-protocol-demo/demo_protocol"
	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
)

// Initialize the validator as a global variable.
var v *protovalidate.Validator

func ValidatorInit() {
	var err error
	v, err = protovalidate.New()
	if err != nil {
		log.Fatal("[Go] failed to initialize validator:", err)
	}
}

// upgrader is used to upgrade HTTP connections to WebSocket connections.
// Here, we've specified that any origin is allowed (for demonstration purposes).
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// logPb logs protobuf messages after converting them to JSON format.
func logPb(message string, pb proto.Message) {
	// Convert protobuf message to JSON string.
	marshaler := jsonpb.Marshaler{EmitDefaults: true}
	jsonStr, err := marshaler.MarshalToString(pb)
	if err != nil {
		log.Printf("[Go] %s, but failed to convert protobuf to JSON: %v", message, err)
		return
	}
	log.Printf("[Go] %s: %s", message, jsonStr)
}

// handleReadConnection continuously reads messages from the WebSocket connection.
func handleReadConnection(conn *websocket.Conn) {
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("[Go] Read error:", err)
			return
		}
		// Handle binary messages specifically.
		if messageType == websocket.BinaryMessage {
			handleBinaryMessage(conn, p)
		}
	}
}

// handleBinaryMessage processes binary messages received over WebSocket.
func handleBinaryMessage(conn *websocket.Conn, p []byte) {

	clientPayload := &dp.ClientPayload{}

	var err error

	// Unmarshal the received binary payload into a ClientPayload protobuf message.
	if err = proto.Unmarshal(p, clientPayload); err != nil {
		log.Println("[Go] Error unmarshaling ProtoBuf to ClientPayload:", err)
		return
	}

	if err = v.Validate(clientPayload); err != nil {
		log.Println("[Go] validation failed:", err)
		sendClientValidationError(conn, err.Error())
		return
	} else {
		log.Println("[Go] validation succeeded")
	}

	logPb("Received ClientPayload", clientPayload)

	// Send the received payload to the C server.
	if err := SendPacketToC(&p); err != nil {
		log.Println("[Go] Error sending packet to C:", err)
		return
	}

	// Await a response from the C server.
	cResponse, err := ReceivePacketFromC()
	if err != nil {
		log.Println("[Go] Error receiving response from C:", err)
		return
	}

	// Unmarshal the response from the C server into a HostPayload protobuf message.
	cResponsePayload := &dp.HostPayload{}
	if err := proto.Unmarshal(cResponse, cResponsePayload); err != nil {
		log.Println("[Go] Error unmarshaling C pipe response to HostPayload:", err)
		return
	}

	// Validate the C server's response.
	if err = v.Validate(cResponsePayload); err != nil {
		log.Println("[Go] C server response validation failed:", err)
		sendHostValidationError(conn, err.Error())
		return
	}

	logPb("Received C pipe Payload", cResponsePayload)

	// Send the received response from the C server directly to the WebSocket client.
	if err := conn.WriteMessage(websocket.BinaryMessage, cResponse); err != nil {
		log.Println("[Go] Write error:", err)
	}
}

// sendClientValidationError sends a validation error response to the WebSocket client for client payload validation failure.
func sendClientValidationError(conn *websocket.Conn, errMsg string) {
	response := &dp.HostPayload{
		Response: &dp.CommandResponse{
			OneofCommandResponse: &dp.CommandResponse_StatusErr{
				StatusErr: &dp.StatusError{
					Code: dp.ErrorStatusCode_INVALID_DATA,
					Text: errMsg,
				},
			},
		},
	}

	data, err := proto.Marshal(response)
	if err != nil {
		log.Println("[Go] Error marshaling validation error response:", err)
		return
	}

	if err := conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
		log.Println("[Go] Write error:", err)
	}
}

// sendHostValidationError sends a validation error response to the C server for host payload validation failure.
func sendHostValidationError(conn *websocket.Conn, errMsg string) {
	response := &dp.ClientPayload{
		Response: &dp.CommandResponse{
			OneofCommandResponse: &dp.CommandResponse_StatusErr{
				StatusErr: &dp.StatusError{
					Code: dp.ErrorStatusCode_INVALID_DATA,
					Text: errMsg,
				},
			},
		},
	}

	data, err := proto.Marshal(response)
	if err != nil {
		log.Println("[Go] Error marshaling host validation error response:", err)
		return
	}

	err = SendPacketToC(&data)
	if err != nil {
		log.Println("[Go] Error sending packet to C:", err)
	}
}

// handler is the main HTTP handler that upgrades HTTP connections to WebSocket connections.
func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	// Make sure to close the WebSocket connection when done.
	defer conn.Close()

	handleReadConnection(conn)
}

func main() {
	log.Println("[Go] Starting")

	// Initialize protobuf validator
	ValidatorInit()

	// Initialize communication pipes.
	initPipes()

	log.Println("[Go] Setting up handlers")

	// Register the WebSocket handler.
	http.HandleFunc("/", handler)

	log.Println("[Go] Handling WebSocket...")

	// Start the HTTP server on port 8085.
	log.Fatal(http.ListenAndServe(":8085", nil))
}
