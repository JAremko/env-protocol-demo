#include <pthread.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include "cobs.h"

#define PIPE_NAME_TO_C "/tmp/toC"
#define PIPE_NAME_FROM_C "/tmp/fromC"
#define SET_ZOOM_LEVEL 1
#define SET_COLOR_SCHEME 2
#define CHARGE_PACKET 3
#define MAX_BUFFER_SIZE 1024
#define PayloadSize (MAX_BUFFER_SIZE - sizeof(uint32_t))

typedef struct {
    uint32_t id;
    char payload[PayloadSize];
} Packet;

pthread_mutex_t pipe_mutex = PTHREAD_MUTEX_INITIALIZER;

ssize_t handleZoomLevel(Packet *packet) {
    int32_t zoomLevel = *(int32_t *)packet->payload;
    printf("[C] SetZoomLevel command received with level: %d\n", zoomLevel);
    *(int32_t *)packet->payload = zoomLevel;
    return sizeof(zoomLevel);  // Return the size of the payload processed
}

ssize_t handleColorScheme(Packet *packet) {
    int32_t colorScheme = *(int32_t *)packet->payload;
    printf("[C] SetColorScheme command received with scheme: %d\n", colorScheme);
    *(int32_t *)packet->payload = colorScheme;
    return sizeof(colorScheme);  // Return the size of the payload processed
}

ssize_t processCommand(Packet *packet) {
    switch (packet->id) {
    case SET_ZOOM_LEVEL:
        return handleZoomLevel(packet);
    case SET_COLOR_SCHEME:
        return handleColorScheme(packet);
    default:
        return 0;  // Unknown command, return 0
    }
}

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

ssize_t drainPipe(int fd) {
    int bytesDrained = 0;
    uint8_t tmpByte;
    while (1) {
        ssize_t result = read(fd, &tmpByte, 1);
        if (result <= 0) {
            perror("[C] Error reading from pipe during draining");
            return -1;
        }
        if (tmpByte == 0) {
            break;
        }
        bytesDrained++;
    }
    return bytesDrained;
}

void *handleCommands(void *args) {
    static uint8_t buffer[MAX_BUFFER_SIZE];
    static uint8_t encodedBuffer[MAX_BUFFER_SIZE];  // To store the COBS-encoded packet
    int pipeToC = open(PIPE_NAME_TO_C, O_RDONLY);
    int pipeFromC = open(PIPE_NAME_FROM_C, O_WRONLY);

    if (pipeToC < 0 || pipeFromC < 0) {
        perror("[C] Error opening pipes");
        return NULL;
    }

    while (1) {
        ssize_t bytesRead = readUntilDelimiter(pipeToC, buffer, MAX_BUFFER_SIZE);

        if (bytesRead == MAX_BUFFER_SIZE) {
            fprintf(stderr, "[C] Error: Reached MAX_BUFFER_SIZE without finding delimiter. Draining excess bytes...\n");
            ssize_t bytesDrained = drainPipe(pipeToC);
            fprintf(stderr, "[C] Drained %ld excess bytes before finding delimiter.\n", bytesDrained);
            continue;  // Reset the loop, discard this packet and move to the next one
        }

        Packet packet;
        cobs_decode_result decodeRes = cobs_decode(&packet, sizeof(packet), buffer, bytesRead-1);  // -1 to exclude the delimiter

        printf("[C] Received COBS buffer: ");
        for (ssize_t i = 0; i < bytesRead - 1; i++) {
            printf("%02x", buffer[i]);
        }
        printf("\n");

        if (decodeRes.status != COBS_DECODE_OK) {
            perror("[C] COBS decoding error");
            continue;  // Skip processing this packet and move to the next one
        }

        ssize_t payloadSize = processCommand(&packet);  // Get the size of the payload processed

        cobs_encode_result encodeRes = cobs_encode(encodedBuffer, MAX_BUFFER_SIZE, &packet, sizeof(packet.id) + payloadSize);

        if (encodeRes.status != COBS_ENCODE_OK) {
            perror("[C] COBS encoding error");
            fprintf(stderr, "[C] COBS encoding error: Status code %d\n", encodeRes.status);
            continue;  // Skip sending this packet and move to the next one
        }

        printf("[C] Sending COBS buffer: ");
        for (size_t i = 0; i < encodeRes.out_len; i++) {
            printf("%02x", encodedBuffer[i]);
        }
        printf("\n");

        pthread_mutex_lock(&pipe_mutex);
        if (write(pipeFromC, encodedBuffer, encodeRes.out_len) < 0 ||
            write(pipeFromC, "\0", 1) < 0) {  // Include delimiter after COBS-encoded data
            perror("[C] Error writing to pipe");
            pthread_mutex_unlock(&pipe_mutex);
            break;
        }
        pthread_mutex_unlock(&pipe_mutex);
    }

    close(pipeToC);
    close(pipeFromC);
    return NULL;
}

void *updateCharge(void *args) {
    static uint8_t buffer[MAX_BUFFER_SIZE];
    int pipeFromC = open(PIPE_NAME_FROM_C, O_WRONLY);

    if (pipeFromC < 0) {
        perror("[C] Error opening pipe from C");
        return NULL;
    }

    srand(time(NULL));

    while (1) {
        Packet packet;
        packet.id = CHARGE_PACKET;
        int32_t charge = rand() % 101;
        memcpy(packet.payload, &charge, sizeof(charge));

        ssize_t payloadSize = sizeof(charge);  // Explicitly specify the payload size
        cobs_encode_result encodeRes = cobs_encode(buffer, MAX_BUFFER_SIZE, &packet, sizeof(packet.id) + payloadSize);

        printf("[C] Size of packet being sent: %ld\n", sizeof(packet.id) + payloadSize);

        if (encodeRes.status != COBS_ENCODE_OK) {
            perror("[C] COBS encoding error");
            continue;  // Skip sending this packet and move to the next one
        }

        printf("[C] Sending CHARGE COBS buffer: ");
        for (size_t i = 0; i < encodeRes.out_len; i++) {
            printf("%02x", buffer[i]);
        }
        printf("\n");

        pthread_mutex_lock(&pipe_mutex);
        if (write(pipeFromC, buffer, encodeRes.out_len) < 0 ||
            write(pipeFromC, "\0", 1) < 0) {  // Include delimiter after COBS-encoded data
            perror("[C] Error writing to pipe");
            pthread_mutex_unlock(&pipe_mutex);
            break;
        }
        pthread_mutex_unlock(&pipe_mutex);

        sleep(1);
    }

    close(pipeFromC);
    return NULL;
}

int main() {

    setbuf(stdout, NULL);
    setbuf(stderr, NULL);

    unlink(PIPE_NAME_TO_C);
    unlink(PIPE_NAME_FROM_C);

    if (mkfifo(PIPE_NAME_TO_C, 0666) < 0) {
        perror("[C] Error creating PIPE_NAME_TO_C");
        exit(1);
    }
    if (mkfifo(PIPE_NAME_FROM_C, 0666) < 0) {
        perror("[C] Error creating PIPE_NAME_FROM_C");
        exit(1);
    }

    pthread_t commandThread, chargeThread;
    pthread_create(&commandThread, NULL, handleCommands, NULL);
    pthread_create(&chargeThread, NULL, updateCharge, NULL);

    pthread_join(commandThread, NULL);
    pthread_join(chargeThread, NULL);

    return 0;
}
