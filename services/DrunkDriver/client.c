#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <string.h>

int main(int argc, char const *argv[]) {
    int s, r, len = 0;
    socklen_t slen = sizeof(struct sockaddr_in);
    struct sockaddr_in addr, reply_addr;
    char buffer[256];
    const char * ptr;

    if (argc < 5) {
        printf("Usage: %s <host> <--plant|--check> <name> <flag>\n", argv[0]);
        return 0;
    }

    if (inet_aton(argv[1], (struct in_addr*)&addr.sin_addr) == 0) {
        fprintf(stderr, "Could not convert %s into IPv4 address.\n", argv[1]);
        return -1;
    }

    addr.sin_family = AF_INET;
    reply_addr.sin_family = AF_INET;
    reply_addr.sin_port = 0;
    reply_addr.sin_addr.s_addr = INADDR_ANY;

    r = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (r < 0) {
        fprintf(stderr, "Could not create socket.\n");
        return -1;
    }

    if (bind(r, (struct sockaddr*)&reply_addr, slen) < 0) {
        fprintf(stderr, "Could not bind socket.\n");
        close(r);
        return -1;
    }

    if (getsockname(r, (struct sockaddr*)&reply_addr, &slen) < 0) {
        fprintf(stderr, "Could not get socket name.\n");
        close(r);
        return -1;
    }

    s = socket(AF_INET, SOCK_RAW, 200);
    if (s < 0) {
        fprintf(stderr, "Could not create socket.\n");
        close(r);
        return -1;
    }

    if (strcmp(argv[2], "--plant") == 0) {
        buffer[len++] = 0;
    } else if (strcmp(argv[2], "--check") == 0) {
        buffer[len++] = 1;
    }

    ptr = argv[3];
    while (*ptr) {
        buffer[len++] = *(ptr++) ^ 0xff;
    } 
    buffer[len++] = '\0';

    ptr = argv[4];
    while (*ptr) {
        buffer[len++] = *(ptr++) ^ 0xff;
    } 
    buffer[len++] = '\0';
    buffer[len++] = reply_addr.sin_port & 0xff;
    buffer[len++] = (reply_addr.sin_port >> 8) & 0xff;

    if (sendto(s, buffer, len, 0, (struct sockaddr*)&addr, sizeof(struct sockaddr_in)) < 0) {
        fprintf(stderr, "Could not send data.\n");
        close(s);
        close(r);
        return -1;
    }

    close(s);
    memset(buffer, 0, sizeof(buffer));
    
    if ((len = recv(r, buffer, sizeof(buffer) - 1, 0)) <= 0) {
        fprintf(stderr, "Did not receive a reply.\n");
        close(r);
        return -1;
    }

    close(r);

    return strcmp(buffer, "Yay");
}
