# Inter-process Communication using C, Go, and JavaScript

This project integrates three distinct technologies: a C server that processes Protocol Buffers payloads, a Go proxy that facilitates communication, and a JavaScript frontend. The data flow moves from the JavaScript frontend, through WebSockets and named pipes, to the C server and back. Specifically, the sequence is as follows: JavaScript Frontend ⟷ WebSockets ⟷ Go Proxy ⟷ Named Pipes ⟷ C Server.

## Table of Contents

- [C Server](#c-server)
  - [Features](#features-c)
  - [Dependencies](#dependencies-c)
  - [Code Structure](#code-structure-c)
- [Go COBS and Pipe Communication Utility](#go-cobs-and-pipe-communication-utility)
  - [Overview](#overview-go)
  - [Functions](#functions-go)
- [JavaScript WebSocket and Protocol Buffers Client](#javascript-websocket-and-protocol-buffers-client)
  - [Features](#features-js)
  - [Code Overview](#code-overview-js)
- [Go WebSocket Server with Protocol Buffers and C Integration](#go-websocket-server-with-protocol-buffers-and-c-integration)
  - [Features](#features-go-websocket)
  - [Dependencies](#dependencies-go-websocket)
  - [How It Works](#how-it-works-go-websocket)
  - [Note](#note-go-websocket)

---

## C Server

### Features <a name="features-c"></a>

1. Utilizes named pipes (`/tmp/toC` and `/tmp/fromC`) for bidirectional communication.
2. Handles incoming commands, decodes them, and sends responses.
3. Uses the COBS algorithm for efficient byte-stuffing.
4. Uses Protocol Buffers for structured communication.

### Dependencies <a name="dependencies-c"></a>

- [COBS](https://en.wikipedia.org/wiki/Consistent_Overhead_Byte_Stuffing): For byte-stuffing.
- [Protocol Buffers](https://developers.google.com/protocol-buffers): Google's data interchange format.

### Code Structure <a name="code-structure-c"></a>

- `handleCommands`: A thread function that opens the named pipes and calls the function to handle incoming buffers.
- `handleIncomingBuffer`: Handles data coming in from the pipe, decodes using COBS and Protocol Buffers, and sends a response.
- `handleDecodedCommand`: Processes the decoded client command and prepares a host response.
- `printBuffer`: A helper function to print buffer data in hexadecimal form.
- `readUntilDelimiter`: Reads data from a file descriptor until a delimiter (0) is found.
- `main`: The entry point of the application which sets up named pipes and starts the command handler thread.

---

## Go COBS and Pipe Communication Utility

### Overview <a name="overview-go"></a>

- **Named Pipes**: `/tmp/toC` for sending data to C and `/tmp/fromC` for receiving data from C.
- **MaxPayloadSize**: 100024, indicating the maximum size of the data payload.
- **COBS**: A method for encoding binary data. The main goal of COBS is to avoid zero bytes in the data by encoding them in a special way.

### Functions <a name="functions-go"></a>

1. **initPipes**: Initialize named pipes for communication.
2. **ReceivePacketFromC**: Read a packet from the C program over the named pipe.
3. **SendPacketToC**: Send a packet to the C program over the named pipe.
4. **closePipes**: Close the opened named pipes.
5. **Encode/Decode**: Functions to handle COBS encoding and decoding.

---

## JavaScript WebSocket and Protocol Buffers Client

### Features <a name="features-js"></a>

1. Load Protocol Buffers definitions from a `.proto` file.
2. Establish WebSocket connection to a specified server.
3. Decode server messages received in Protocol Buffers format.
4. Encode and send client commands to the server in Protocol Buffers format.
5. Dynamic command input fields based on user's selection.
6. Display server and client logs.

### Code Overview <a name="code-overview-js"></a>

- **Variables**:
  - `protobufMessageTypes`: Dictionary to hold the different message types supported by the client.
  - `protobufEnums`: Dictionary for enumerations used in the `.proto` definition.
  - `ws`: WebSocket connection object.
  - `getCommandMappings`: Function that returns mappings for various commands.
- **Functions**:
  - `loadProto()`: Loads the `.proto` file and initializes message type objects.
  - `setupWebSocket()`: Initializes WebSocket connection and its event handlers.
  - `handleServerMessage(data)`: Handles incoming messages from the server.
  - `displayServerLog(data)`: Displays decoded server messages.
  - `fetchFragment(fragmentName)`: Fetches HTML fragments for different commands.
  - `displayCommandInputFields()`: Shows the appropriate command input fields based on user's selection.
  - `sendCommandToServer(commandData)`: Encodes and sends a command to the server.
  - `displayClientLog(data)`: Displays client-side log of sent messages.
- **Event Listeners**:
  - An event listener on the `commandType` element to display relevant command input fields when user changes the command type.
- **Initialization**:
  - The `init()` function is called immediately to load Protocol Buffers, establish WebSocket connection, and set up the UI.

---

## Go WebSocket Server with Protocol Buffers and C Integration

### Features <a name="features-go-websocket"></a>

- Uses Protocol Buffers for message serialization.
- Upgrades HTTP connections to WebSocket.
- Sends received WebSocket payloads to a C server and awaits a response.
- Forwards the C server response back to the WebSocket client.

### Dependencies <a name="dependencies-go-websocket"></a>

- **github.com/JAremko/env-protocol-demo/demo_protocol**: Protocol definitions for our application.
- **github.com/golang/protobuf/jsonpb & proto**: Go support for Protocol Buffers.
- **github.com/gorilla/websocket**: A WebSocket implementation for Go.

### How It Works <a name="how-it-works-go-websocket"></a>

1. **Starting the Server**: The application initializes communication pipes and starts the HTTP server on port `8085`.
2. **Upgrading to WebSocket**: Upon receiving an HTTP request, the connection is upgraded to a WebSocket connection.
3. **Reading WebSocket Messages**: Continuously reads messages from the WebSocket connection.
4. **Handling Binary Messages**: If the WebSocket message type is binary, the payload is unmarshaled using Protocol Buffers into a `ClientPayload`.
5. **Communication with C Server**: The `ClientPayload` is sent to a C server. The application then waits for a response from the C server, which is unmarshaled into a `HostPayload`.
6. **Relaying Back to Client**: The response from the C server is sent directly back to the WebSocket client.

### Note <a name="note-go-websocket"></a>

- The WebSocket upgrade is configured to accept requests from any origin. For production deployments, make sure to adjust the `CheckOrigin` function in the `upgrader` to provide stricter checks.

---

