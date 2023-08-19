#include <pthread.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include <sys/stat.h>

#include "cobs.h"
#include "demo_protocol.pb.h"
#include "pb_decode.h"
#include "pb_encode.h"

// Define named pipes and buffer sizes
#define PIPE_NAME_TO_C "/tmp/toC"
#define PIPE_NAME_FROM_C "/tmp/fromC"
#define MAX_BUFFER_SIZE 100024

// Forward declarations of helper functions
ssize_t readUntilDelimiter(int fd, uint8_t *buffer, size_t max_size);
void printBuffer(const char *message, uint8_t *buffer, size_t size);
bool handleDecodedCommand(const demo_protocol_ClientPayload *client_payload, demo_protocol_HostPayload *host_payload);
void handleIncomingBuffer(int pipeToC, int pipeFromC);

// Thread function to handle incoming and outgoing commands
void *handleCommands(void *args) {
    printf("[C] Opening pipes\n");

    // Open the named pipes for reading and writing
    int pipeFromC = open(PIPE_NAME_FROM_C, O_WRONLY);
    int pipeToC = open(PIPE_NAME_TO_C, O_RDONLY);
    printf("[C] Pipes opened\n");

    // Check if opening the pipes was successful
    if (pipeToC < 0 || pipeFromC < 0) {
        perror("[C] Error opening pipes");
        return NULL;
    }

    // Handle data read from the pipe
    handleIncomingBuffer(pipeToC, pipeFromC);

    // Close the pipes before exiting the thread
    close(pipeToC);
    close(pipeFromC);
    return NULL;
}

// Handle data coming in from the pipe
void handleIncomingBuffer(int pipeToC, int pipeFromC) {
    // Declare static buffers for storing incoming and outgoing data
    static uint8_t buffer[MAX_BUFFER_SIZE];
    static uint8_t decodedBuffer[MAX_BUFFER_SIZE];
    static uint8_t encodedBuffer[MAX_BUFFER_SIZE];

    printf("[C] Entering main loop\n");
    // Continuously process incoming data
    while (1) {
        // Read data from the pipe until a delimiter (0) is found
        ssize_t bytesRead = readUntilDelimiter(pipeToC, buffer, MAX_BUFFER_SIZE);
        printBuffer("Received COBS buffer", buffer, bytesRead - 1);

        // Decode the data using the COBS algorithm
        cobs_decode_result decodeRes = cobs_decode(decodedBuffer, sizeof(decodedBuffer), buffer, bytesRead - 1);
        if (decodeRes.status != COBS_DECODE_OK) {
            perror("[C] COBS decoding error");
            continue;
        }

        // Use Protocol Buffers to decode the payload
        demo_protocol_ClientPayload client_payload = demo_protocol_ClientPayload_init_zero;
        pb_istream_t stream = pb_istream_from_buffer(decodedBuffer, decodeRes.out_len);
        if (!pb_decode(&stream, demo_protocol_ClientPayload_fields, &client_payload)) {
            printf("[C] Failed to decode ClientPayload: %s\n", PB_GET_ERROR(&stream));
            continue;
        }

        // Handle the decoded command and prepare a response
        demo_protocol_HostPayload host_payload = demo_protocol_HostPayload_init_zero;
        if (handleDecodedCommand(&client_payload, &host_payload)) {
            // Encode the response using Protocol Buffers
            pb_ostream_t output_stream = pb_ostream_from_buffer(decodedBuffer, sizeof(decodedBuffer));
            if (!pb_encode(&output_stream, demo_protocol_HostPayload_fields, &host_payload)) {
                printf("[C] Failed to encode HostPayload: %s\n", PB_GET_ERROR(&output_stream));
                continue;
            }

            // Encode the data for sending using the COBS algorithm
            cobs_encode_result encodeRes = cobs_encode(encodedBuffer, MAX_BUFFER_SIZE, decodedBuffer, output_stream.bytes_written);
            if (encodeRes.status != COBS_ENCODE_OK) {
                perror("[C] COBS encoding error");
                continue;
            }

            printBuffer("Sending COBS buffer", encodedBuffer, encodeRes.out_len);

            // Write the encoded data back to the pipe
            if (write(pipeFromC, encodedBuffer, encodeRes.out_len) < 0 ||
                write(pipeFromC, "\0", 1) < 0) {
                perror("[C] Error writing to pipe");
                break;
            }
        }
    }
}

// Handle the decoded client command and prepare a host response
bool handleDecodedCommand(const demo_protocol_ClientPayload *client_payload, demo_protocol_HostPayload *host_payload) {
    // FIXME: When we send invalid data to go side it responds
    //        with ClientPayload->CommandResponse->StatusError
    //        we need to handle it properly. @tortorino
    bool is_known_command;
    // Check if the command is one of the known commands
    switch (client_payload->command.which_oneofCommand) {
        case demo_protocol_Command_setZoom_tag:
        case demo_protocol_Command_setPallette_tag:
        case demo_protocol_Command_setAirTC_tag:
        case demo_protocol_Command_setAgc_tag:
        case demo_protocol_Command_setDst_tag:
        case demo_protocol_Command_setHoldoff_tag:
        case demo_protocol_Command_setZeroing_tag:
        case demo_protocol_Command_setMagOffset_tag:
        case demo_protocol_Command_setAirHum_tag:
        case demo_protocol_Command_setAirPress_tag:
        case demo_protocol_Command_setPowderTemp_tag:
        case demo_protocol_Command_setWind_tag:
        case demo_protocol_Command_buttonPress_tag:
        case demo_protocol_Command_cmdTrigger_tag:
        case demo_protocol_Command_getHostDevStatus_tag:
        case demo_protocol_Command_getHostProfile_tag:
            is_known_command = true;
            break;
        default:
            is_known_command = false;
    }

    // Populate the response based on the received command
    host_payload->has_response = true;
    if (is_known_command) {
        host_payload->response.which_oneofCommandResponse = demo_protocol_CommandResponse_statusOk_tag;
        host_payload->response.oneofCommandResponse.statusOk.code = demo_protocol_OkStatusCode_SUCCESS;
    } else {
        host_payload->response.which_oneofCommandResponse = demo_protocol_CommandResponse_statusErr_tag;
        host_payload->response.oneofCommandResponse.statusErr.code = demo_protocol_ErrorStatusCode_FAILURE;
    }

    return true;
}

// Helper function to print buffer data
void printBuffer(const char *message, uint8_t *buffer, size_t size) {
    printf("[C] %s: ", message);
    for (size_t i = 0; i < size; i++) {
        printf("%02x", buffer[i]);
    }
    printf("\n");
}

// Read data from a file descriptor until a delimiter (0) is found
ssize_t readUntilDelimiter(int fd, uint8_t *buffer, size_t max_size) {
    ssize_t bytesRead = 0;
    while (bytesRead < max_size) {
        ssize_t result = read(fd, &buffer[bytesRead], 1);
        if (result <= 0) {
            perror("[C] Error reading from pipe");
            return -1;
        }
        if (buffer[bytesRead] == 0) {
            bytesRead++;
            break;
        }
        bytesRead++;
    }
    return bytesRead;
}

// The main function
int main() {
    printf("[C] Starting\n");
    // Make sure there's no buffering on stdout and stderr to see logs immediately
    setbuf(stdout, NULL);
    setbuf(stderr, NULL);

    struct stat buffer;  // To use with stat()

    // Create named pipe PIPE_NAME_TO_C if it doesn't exist
    if (stat(PIPE_NAME_TO_C, &buffer) != 0) {
        printf("[C] Creating %s pipe\n", PIPE_NAME_TO_C);
        if (mkfifo(PIPE_NAME_TO_C, 0666) < 0) {
            perror("[C] Error creating PIPE_NAME_TO_C");
            exit(1);
        }
    }

    // Create named pipe PIPE_NAME_FROM_C if it doesn't exist
    if (stat(PIPE_NAME_FROM_C, &buffer) != 0) {
        printf("[C] Creating %s pipe\n", PIPE_NAME_FROM_C);
        if (mkfifo(PIPE_NAME_FROM_C, 0666) < 0) {
            perror("[C] Error creating PIPE_NAME_FROM_C");
            exit(1);
        }
    }

    printf("[C] Starting handler thread\n");
    pthread_t commandThread;
    // Start a new thread to handle incoming and outgoing commands
    pthread_create(&commandThread, NULL, handleCommands, NULL);

    printf("[C] Handling pipes...\n");
    // Wait for the command thread to finish
    pthread_join(commandThread, NULL);

    return 0;
}
