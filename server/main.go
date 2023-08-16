package main

import (
	"log"
	"net/http"
	"time"

	dp "github.com/JAremko/env-protocol-demo/demo_protocol"
	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	go func() {
		for {
			dummyHostPayload := &dp.HostPayload{
				Profile: &dp.HostProfile{
					ProfileName: "DummyProfile",
				},
			}

			protoPayload, err := proto.Marshal(dummyHostPayload)
			if err != nil {
				log.Println("Error marshaling HostPayload to ProtoBuf:", err)
				return
			}

			if err := conn.WriteMessage(websocket.BinaryMessage, protoPayload); err != nil {
				log.Println("Write error:", err)
				return
			}

			time.Sleep(1 * time.Second)
		}
	}()

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		if messageType == websocket.BinaryMessage {
			clientPayload := &dp.ClientPayload{}
			if err := proto.Unmarshal(p, clientPayload); err != nil {
				log.Println("Error unmarshaling ProtoBuf to ClientPayload:", err)
				continue
			}
			log.Println("Received ClientPayload:", clientPayload)

			// Handle response based on the command
			response := &dp.HostPayload{}
			commandResponse := &dp.CommandResponse{}

			if clientPayload.GetCommand() != nil {
				commandResponse.OneofCommandResponse = &dp.CommandResponse_StatusOk{StatusOk: &dp.StatusOk{Code: dp.OkStatusCode_SUCCESS}}

			} else {
				commandResponse.OneofCommandResponse = &dp.CommandResponse_StatusErr{StatusErr: &dp.StatusError{Code: dp.ErrorStatusCode_FAILURE}}

			}
			response.Response = commandResponse

			// Send the response
			responsePayload, err := proto.Marshal(response)
			if err != nil {
				log.Println("Error marshaling response to ProtoBuf:", err)
				continue
			}
			if err := conn.WriteMessage(websocket.BinaryMessage, responsePayload); err != nil {
				log.Println("Write error:", err)
				continue
			}
		}
	}
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8085", nil))
}
