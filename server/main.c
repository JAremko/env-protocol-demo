#include <pthread.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include "cobs.h"

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

        cobs_decode_result decodeRes = cobs_decode(decodedBuffer, sizeof(decodedBuffer), buffer, bytesRead - 1);  // Decoding incoming COBS

        if (decodeRes.status != COBS_DECODE_OK) {
            perror("[C] COBS decoding error");
            continue;  // Skip processing this packet and move to the next one
        }

        cobs_encode_result encodeRes = cobs_encode(encodedBuffer, MAX_BUFFER_SIZE, decodedBuffer, decodeRes.out_len);  // Re-encode it

        if (encodeRes.status != COBS_ENCODE_OK) {
            perror("[C] COBS encoding error");
            continue;  // Skip sending this packet and move to the next one
        }

        printf("[C] Echoing COBS buffer: ");
        for (size_t i = 0; i < encodeRes.out_len; i++) {
            printf("%02x", encodedBuffer[i]);
        }
        printf("\n");

        if (write(pipeFromC, encodedBuffer, encodeRes.out_len) < 0 ||
            write(pipeFromC, "\0", 1) < 0) {  // Include delimiter after COBS-encoded data
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
