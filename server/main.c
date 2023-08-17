#include <pthread.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include "cobs.h"
#include "demo_protocol.pb.h"
#include "pb_decode.h"
#include "pb_encode.h"

#define PIPE_NAME_TO_C "/tmp/toC"
#define PIPE_NAME_FROM_C "/tmp/fromC"
#define MAX_BUFFER_SIZE 100024

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
            break;  // Stop reading when you encounter a 0 and include it in the buffer
        }
        bytesRead++;
    }
    return bytesRead;
}

void *handleCommands(void *args) {
    static uint8_t buffer[MAX_BUFFER_SIZE];
    static uint8_t decodedBuffer[MAX_BUFFER_SIZE];
    static uint8_t encodedBuffer[MAX_BUFFER_SIZE];

    printf("[C] Opening pipes\n");
    int pipeFromC = open(PIPE_NAME_FROM_C, O_WRONLY);
    int pipeToC = open(PIPE_NAME_TO_C, O_RDONLY);
    printf("[C] Pipes opened\n");

    if (pipeToC < 0 || pipeFromC < 0) {
        perror("[C] Error opening pipes");
        return NULL;
    }

    printf("[C] Entering main loop\n");
    while (1) {
        ssize_t bytesRead = readUntilDelimiter(pipeToC, buffer, MAX_BUFFER_SIZE);

        printf("[C] Received COBS buffer: ");
        for (ssize_t i = 0; i < bytesRead - 1; i++) {
            printf("%02x", buffer[i]);
        }
        printf("\n");

        cobs_decode_result decodeRes = cobs_decode(decodedBuffer, sizeof(decodedBuffer), buffer, bytesRead - 1);
        if (decodeRes.status != COBS_DECODE_OK) {
            perror("[C] COBS decoding error");
            continue;
        }

        demo_protocol_ClientPayload client_payload = demo_protocol_ClientPayload_init_zero;
        pb_istream_t stream = pb_istream_from_buffer(decodedBuffer, decodeRes.out_len);
        if (!pb_decode(&stream, demo_protocol_ClientPayload_fields, &client_payload)) {
            printf("[C] Failed to decode ClientPayload: %s\n", PB_GET_ERROR(&stream));
            continue;
        }

        bool is_known_command;
        switch (client_payload.command.which_oneofCommand)
        {
            case demo_protocol_Command_setZoom_tag:
            case demo_protocol_Command_setPallette_tag:
            case demo_protocol_Command_setAirTC_tag:
                is_known_command = true;
                break;
            default:
                is_known_command = false;
        }

        demo_protocol_HostPayload host_payload = demo_protocol_HostPayload_init_zero;
        host_payload.has_response = true;
        if (is_known_command) {
            host_payload.response.which_oneofCommandResponse = demo_protocol_CommandResponse_statusOk_tag;
            host_payload.response.oneofCommandResponse.statusOk.code = demo_protocol_OkStatusCode_SUCCESS;
        } else {
            host_payload.response.which_oneofCommandResponse = demo_protocol_CommandResponse_statusErr_tag;
            host_payload.response.oneofCommandResponse.statusErr.code = demo_protocol_ErrorStatusCode_FAILURE;
        }

        pb_ostream_t output_stream = pb_ostream_from_buffer(decodedBuffer, sizeof(decodedBuffer));
        if (!pb_encode(&output_stream, demo_protocol_HostPayload_fields, &host_payload)) {
            printf("[C] Failed to encode HostPayload: %s\n", PB_GET_ERROR(&output_stream));
            continue;
        }

        cobs_encode_result encodeRes = cobs_encode(encodedBuffer, MAX_BUFFER_SIZE, decodedBuffer, output_stream.bytes_written);
        if (encodeRes.status != COBS_ENCODE_OK) {
            perror("[C] COBS encoding error");
            continue;
        }

        printf("[C] Sending COBS buffer: ");
        for (size_t i = 0; i < encodeRes.out_len; i++) {
            printf("%02x", encodedBuffer[i]);
        }
        printf("\n");

        if (write(pipeFromC, encodedBuffer, encodeRes.out_len) < 0 ||
            write(pipeFromC, "\0", 1) < 0) {
            perror("[C] Error writing to pipe");
            break;
        }
    }

    close(pipeToC);
    close(pipeFromC);
    return NULL;
}

int main() {

    printf("[C] Starting\n");
    setbuf(stdout, NULL);
    setbuf(stderr, NULL);

    unlink(PIPE_NAME_TO_C);
    unlink(PIPE_NAME_FROM_C);

    printf("[C] Creating pipes\n");

    if (mkfifo(PIPE_NAME_TO_C, 0666) < 0) {
        perror("[C] Error creating PIPE_NAME_TO_C");
        exit(1);
    }
    if (mkfifo(PIPE_NAME_FROM_C, 0666) < 0) {
        perror("[C] Error creating PIPE_NAME_FROM_C");
        exit(1);
    }

    printf("[C] Starting handlear thread\n");

    pthread_t commandThread;
    pthread_create(&commandThread, NULL, handleCommands, NULL);

    printf("[C] Handling pipes...\n");

    pthread_join(commandThread, NULL);

    return 0;
}
