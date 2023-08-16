package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	dp "github.com/JAremko/env-protocol-demo/demo_protocol"
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

			jsonPayload, err := json.Marshal(dummyHostPayload)
			if err != nil {
				log.Println("Error marshaling HostPayload to JSON:", err)
				return
			}

			if err := conn.WriteMessage(websocket.TextMessage, jsonPayload); err != nil {
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
		if messageType == websocket.TextMessage {
			clientPayload := &dp.ClientPayload{}
			if err := json.Unmarshal(p, clientPayload); err != nil {
				log.Println("Error unmarshaling JSON to ClientPayload:", err)
				continue
			}
			log.Println("Received ClientPayload:", clientPayload)
		}
	}
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8085", nil))
}
