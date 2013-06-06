#include "server.h"
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>

int handle_server(int epfd, struct epoll_event * evt, Client ** available) {
    int s, flags;
    Client * client;
    struct epoll_event cevt;
    while ((s = accept(evt->data.fd, NULL, NULL)) > 0) {
        flags = fcntl(s, F_GETFL);
        if (fcntl(s, F_SETFL, flags | O_NONBLOCK) == 0 && (client = client_pop(available))) {
            client_init(client, s);
            cevt.events = EPOLLIN;
            cevt.data.ptr = client;
            epoll_ctl(epfd, EPOLL_CTL_ADD, s, &cevt);
        } else {
            close(s);
        }
    }
    return 1;
}

int create_server(unsigned short port) {
    int server;
    int flags;
    struct sockaddr_in addr;

    server = socket(AF_INET, SOCK_STREAM, 0);
    if (server < 0) {
        return -1;
    }

    flags = 1;
    if (setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &flags, sizeof(flags)) < 0) {
        close(server);
        return -1;
    }

    flags = fcntl(server, F_GETFL);
    if (fcntl(server, F_SETFL, flags | O_NONBLOCK) < 0) {
        close(server);
        return -1;
    }

    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(server, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(server);
        return -1;
    }

    if (listen(server, 10) < 0) {
        close(server);
        return -1;
    }

    return server;
}
