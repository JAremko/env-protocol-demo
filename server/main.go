package main

import (
	"log"
	"net/http"

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
		log.Printf("[Go] %s, but failed to convert protobuf to JSON: %v", message, err)
		return
	}
	log.Printf("[Go] %s: %s", message, jsonStr)
}

func handleReadConnection(conn *websocket.Conn) {
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("[Go] Read error:", err)
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

	// Send the payload to the C server
	if err := SendPacketToC(&p); err != nil {
		log.Println("Error sending packet to C:", err)
		return
	}

	// Wait for the response from C server
	cResponse, err := ReceivePacketFromC()
	if err != nil {
		log.Println("[Go] Error receiving response from C:", err)
		return
	}

	// Unmarshal the C response as ClientPayload and log it
	cResponsePayload := &dp.ClientPayload{}
	if err := proto.Unmarshal(cResponse, cResponsePayload); err != nil {
		log.Println("[Go] Error unmarshaling C pipe response to ClientPayload:", err)
		return
	}
	logPb("Received C pipe Payload", cResponsePayload)

	// Directly send the C response to the WebSocket client
	if err := conn.WriteMessage(websocket.BinaryMessage, cResponse); err != nil {
		log.Println("Write error:", err)
	}
}

func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	handleReadConnection(conn)
}

func main() {
	log.Println("[Go] Starting")
	initPipes();
	log.Println("[Go] Setting up handlers")
	http.HandleFunc("/", handler)
	log.Println("[Go] Handling WebSocket...")
	log.Fatal(http.ListenAndServe(":8085", nil))
}
